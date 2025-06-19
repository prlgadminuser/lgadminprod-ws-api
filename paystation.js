// Updated full code with reconciliation job and separated user reward logic

const axios = require('axios');
const paypal = require('@paypal/checkout-server-sdk');
const { userCollection, PaymentCollection } = require('./idbconfig');
const { PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_WEBHOOK_ID } = require('./ENV.js');

const environment = new paypal.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_SECRET);
const client = new paypal.core.PayPalHttpClient(environment);

const FIXED_OFFERS = {
  "1000_coins_pack": { name: '1000 Coins', price: 1.99, description: "1000 Coins for Skilldown", rewardtype: "coins", value: 1000 },
};




async function CreatePaymentLink(userId, offerId) {
  try {
    if (!offerId || !userId) throw new Error('Angebots-ID und Benutzer-ID sind erforderlich.');

    const offer = FIXED_OFFERS[offerId];
    if (!offer) throw new Error('Angebot nicht gefunden.');

    if (offer.rewardtype === "item") {
      const ItemsOwned = await userCollection.findOne({
        "account.username": userId,
        "inventory.items": { $in: offer.value },
      });
      if (ItemsOwned) throw new Error('You already own this offer');
    }

    const user = await userCollection.findOne({ "account.username": userId });
    if (!user) throw new Error('Benutzer nicht gefunden.');

    const orderDetails = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: offer.price.toFixed(2) },
        custom_id: JSON.stringify({ userId, offerId }),
        description: offer.description
      }],
      application_context: {
      //  return_url: 'https://skilldown.netlify.app',
       // cancel_url: 'https://skilldown.netlify.app',
        shipping_preference: 'NO_SHIPPING',
        brand_name: 'Liquem Games',
        user_action: 'PAY_NOW'
      }
    };

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody(orderDetails);

    const response = await client.execute(request);
    const order = response.result;
    const approveLink = order.links.find(link => link.rel === 'approve');
    if (!approveLink) throw new Error("Kein Genehmigungslink gefunden.");

    return { success: true, approveUrl: approveLink.href };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function verifyWebhook(req) {
  try {
    const headers = req.headers;
    const webhookEventBody = req.rawBody.toString('utf8');

    const tokenRes = await axios.post(
      'https://api-m.paypal.com/v1/oauth2/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const verifyRes = await axios.post(
      'https://api-m.paypal.com/v1/notifications/verify-webhook-signature',
      {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(webhookEventBody)
      },
      {
        headers: {
          Authorization: `Bearer ${tokenRes.data.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return verifyRes.data.verification_status === 'SUCCESS';
  } catch (err) {
    return false;
  }
}

async function awardUser(userId, offerdata, capture, session) {
  // Handle item rewards
  if (offerdata.rewardtype === "item") {
    // Step 1: Check if user already owns any item in the offer
    const userHasItem = await userCollection.findOne(
      {
        "account.username": userId,
        "inventory.items": { $in: offerdata.value },
      },
      { session }
    );

    if (userHasItem) {
      throw new Error('User already owns one or more items in the offer.');
    }

    // Step 2: Grant the items
    await userCollection.updateOne(
      { "account.username": userId },
      { $addToSet: { "inventory.items": { $each: offerdata.value } } },
      { session }
    );

  } else {
    // Handle currency rewards
    await userCollection.updateOne(
      { "account.username": userId },
      { $inc: { [`currency.${offerdata.rewardtype}`]: offerdata.value } },
      { session }
    );
  }

  // Log the payment in PaymentCollection
  await PaymentCollection.insertOne(
    {
      _id: capture.id,
      paypalCaptureId: capture.id,
      userId,
      offerdata,
      status: capture.status,
      create_time: capture.create_time,
      update_time: capture.update_time,
      payerdata: capture.payer || null
    },
    { session }
  );
}

async function handlePaypalWebhookEvent(event) {
  if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
    const session = userCollection.client.startSession();
    try {
      const captureResult = await captureOrder(event.resource.id);
      const capture = captureResult.purchase_units[0].payments.captures[0];
      const { userId, offerId } = JSON.parse(capture.custom_id);
      const offerdata = FIXED_OFFERS[offerId];
      if (!offerdata) throw new Error('Invalid offer ID');

      await session.withTransaction(() => awardUser(userId, offerdata, capture, session));
    } catch (err) {
      try {
        const refundReq = new paypal.payments.CapturesRefundRequest(capture.id);
        refundReq.requestBody({});
        await client.execute(refundReq);
      } catch (refundErr) {
        console.error('Refund failed:', refundErr.message);
      }
    } finally {
      await session.endSession();
    }
  }
}

async function captureOrder(orderId) {
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  const response = await client.execute(request);
  if (response.result.status !== 'COMPLETED') throw new Error('Capture not completed');
  return response.result;
}

async function reconcileMissedPayments() {
  const token = await axios.post(
    'https://api-m.paypal.com/v1/oauth2/token',
    new URLSearchParams({ grant_type: 'client_credentials' }),
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  const startDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const txns = await axios.get(
    `https://api-m.paypal.com/v1/reporting/transactions?start_date=${startDate}&transaction_status=S&fields=all&page_size=100`,
    { headers: { Authorization: `Bearer ${token.data.access_token}` } }
  );

  for (const txn of txns.data.transaction_details || []) {
    const captureId = txn.transaction_info.transaction_id;
    if (await PaymentCollection.findOne({ paypalCaptureId: captureId })) continue;

    try {
      const captureDetails = await client.execute(new paypal.payments.CapturesGetRequest(captureId));
      const capture = captureDetails.result;
      const { userId, offerId } = JSON.parse(capture.custom_id || '{}');
      const offerdata = FIXED_OFFERS[offerId];
      if (!userId || !offerdata) continue;

      const session = userCollection.client.startSession();
      try {
        await session.withTransaction(() => awardUser(userId, offerdata, capture, session));
      } finally {
        await session.endSession();
      }
    } catch (err) {
      console.error(`Failed to reconcile capture ${captureId}:`, err.message);
    }
  }
}


setInterval(() => {
  reconcileMissedPayments().catch(console.error);
}, 3600000);


module.exports = {
  CreatePaymentLink,
  verifyWebhook,
  handlePaypalWebhookEvent,
  reconcileMissedPayments,
  FIXED_OFFERS
};
