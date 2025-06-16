
const axios = require('axios');
const paypal = require('@paypal/checkout-server-sdk');
const { userCollection, PaymentCollection } = require('./idbconfig');
const { PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_WEBHOOK_ID } = require('./ENV.js');


const environment = new paypal.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_SECRET);
const client = new paypal.core.PayPalHttpClient(environment);

const FIXED_OFFERS = {
    "1000_coins_pack": { name: '1000 Coins', price: 1.00, coins: 1000 },
};

async function CreatePaymentLink(userId, offerId) {
  try {
    if (!offerId || !userId) {
      throw new Error('Angebots-ID und Benutzer-ID sind erforderlich.');
    }

    const offer = FIXED_OFFERS[offerId];

    if (!offer) {
      throw new Error('Angebot nicht gefunden.');
    }

    const user = await userCollection.findOne(
      { "account.username": userId },
      {
        projection: {
          "account.username": 1,
          "account.nickname": 1,
          "currency.coins": 1
        }
      }
    );

    if (!user) {
      throw new Error('Benutzer nicht gefunden.');
    }

    const orderDetails = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'EUR',
          value: offer.price
        },
        custom_id: JSON.stringify({ userId, offer }),
        description: `Kauf von ${offer.coins} Münzen (${offer.name}) für ${user.account.nickname}`
      }],
      application_context: {
        return_url: 'http://localhost:8080/payment-success.html',
        cancel_url: 'http://localhost:8080/payment-cancel.html',
        shipping_preference: 'NO_SHIPPING',
        brand_name: 'Liquem Games',  // optional, appears on PayPal UI
        user_action: 'PAY_NOW'       // shows "Pay Now" instead of "Continue"
      }
    };

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody(orderDetails);

    const response = await client.execute(request);
    const order = response.result;

    const approveLink = order.links.find(link => link.rel === 'approve');
    if (!approveLink) {
      throw new Error("Kein Genehmigungslink gefunden.");
    }

    return { success: true, approveUrl: approveLink.href };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ✅ Updated to use paypal-rest-sdk for webhook verification
async function verifyWebhook(req) {
  const transmissionId = req.headers['paypal-transmission-id'];
  const transmissionTime = req.headers['paypal-transmission-time'];
  const certUrl = req.headers['paypal-cert-url'];
  const authAlgo = req.headers['paypal-auth-algo'];
  const transmissionSig = req.headers['paypal-transmission-sig'];
  const webhookEventBody = req.rawBody.toString('utf8');


  try {
    // 1. Get access token (no caching, simple and clean)
    const basicAuth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
    const tokenRes = await axios.post(
      'https://api-m.paypal.com/v1/oauth2/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    const accessToken = tokenRes.data.access_token;

    // 2. Verify the webhook signature
    const verifyRes = await axios.post(
      'https://api-m.paypal.com/v1/notifications/verify-webhook-signature',
      {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(webhookEventBody)
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const status = verifyRes.data.verification_status;
    return status === 'SUCCESS';
  } catch (err) {
    return false;
  }
}

async function captureOrder(orderId) {
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  try {
    const captureResponse = await client.execute(request);

    // Confirm you're getting a capture, not just an order
    if (captureResponse?.result?.status !== 'COMPLETED') {

    }

    return captureResponse.result;
  } catch (error) {

    if (error.statusCode) {
      console.error("Status Code:", error.statusCode);
    }
    if (error.message) {
      console.error("Message:", error.message);
    }
    if (error.response) {
      console.dir(error.response, { depth: null });
    }
    throw error;
  }
}



async function handlePaypalWebhookEvent(event) {
  if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {


    const session = userCollection.client.startSession();

    try {
      const captureResult = await captureOrder(event.resource.id);
      // Extract custom_id from the capture response
       const capture = captureResult.purchase_units[0].payments.captures[0];
      const customIdStr = captureResult.purchase_units[0].payments.captures[0].custom_id;

      const customdata = JSON.parse(customIdStr);
      const UserToAward = customdata.userId;
      const offerdata = customdata.offer;

      if (!offerdata) {
        return;
      }

      // Update user coins in DB
       await session.withTransaction(async () => {
        // 1. Update user coins
        const userUpdate = await userCollection.updateOne(
          { "account.username": UserToAward },
          { $inc: { "currency.coins": offerdata.coins || 0 } },
          { session }
        );
        if (userUpdate.matchedCount === 0) throw new Error('User not found.');

        // 2. Insert payment record
        await PaymentCollection.insertOne({
          _id: event.resource.id,
          paypalCaptureId: capture.id,
          userId: UserToAward,
          offerdata: offerdata,
          status: capture.status,
          create_time: capture.create_time,
          update_time: capture.update_time,
          payerdata: captureResult.payer || null
        }, { session });
      });

    } catch (error) {
      console.error('Error capturing order or updating user coins:', error);
    }
  }
}
//}

module.exports = { CreatePaymentLink, verifyWebhook, handlePaypalWebhookEvent, FIXED_OFFERS };


// Test runner

