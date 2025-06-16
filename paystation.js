
const axios = require('axios');
const paypal = require('@paypal/checkout-server-sdk');
const { userCollection, PaymentCollection } = require('./idbconfig');
const { PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_WEBHOOK_ID } = require('./ENV.js');


const environment = new paypal.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_SECRET);
const client = new paypal.core.PayPalHttpClient(environment);

const FIXED_OFFERS = {
    "1000_coins_pack": { name: '1000 Coins', price: 1.00, coins: 1000 },
 // medium_pack: { name: 'Mittleres Paket', price: 10.00, coins: 1200 },
 // pro_pack: { name: 'Pro-Paket', price: 20.00, coins: 2500 }
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
          value: offer.price.toFixed(2)
        },
        custom_id: JSON.stringify({ userId, offerId }),
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
      console.warn('⚠️ Capture response status not COMPLETED:', captureResponse.result.status);
      console.dir(captureResponse.result, { depth: null });
    }

    console.log(captureResponse)

    return captureResponse.result;
  } catch (error) {
    console.error("❌ Capture failed:");
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
    console.log('Order approved:', event.resource.id);

    try {
      const captureResult = await captureOrder(event.resource.id);
      console.log('✅ Order captured successfully:', captureResult.id);

      // Extract custom_id from the capture response
      const customIdStr = captureResult.purchase_units?.[0]?.custom_id;
      if (!customIdStr) {
        console.error('Missing custom_id in capture response');
        return;
      }

      const customdata = JSON.parse(customIdStr);
      const UserToAward = customdata.userId;
      const offerId = customdata.offerId;
      const offerdata = FIXED_OFFERS[offerId];

      if (!offerdata) {
        console.error('Offer data not found for offerId:', offerId);
        return;
      }

      // Update user coins in DB
      await userCollection.updateOne(
        { "account.username": UserToAward },
        { $inc: { "currency.coins": offerdata.coins || 0 } }
      );

      console.log(`User ${UserToAward} coins updated by ${offerdata.coins}.`);

    } catch (error) {
      console.error('Error capturing order or updating user coins:', error);
    }
  }
}
//}

module.exports = { CreatePaymentLink, verifyWebhook, handlePaypalWebhookEvent };


// Test runner

