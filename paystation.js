
const axios = require('axios');
const paypal = require('@paypal/checkout-server-sdk');
const { userCollection, PaymentCollection } = require('./idbconfig');
const { PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_WEBHOOK_ID } = require('./ENV.js');

// -- PayPal Checkout SDK (used for payment link + capture)
//const environment = new paypal.core.SandboxEnvironment(PAYPAL_CLIENT_ID, PAYPAL_SECRET);
const environment = new paypal.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_SECRET);
const client = new paypal.core.PayPalHttpClient(environment);

const FIXED_OFFERS = {
  starter_pack: { name: 'Anfängerpaket', price: 5.00, coins: 500 },
  medium_pack: { name: 'Mittleres Paket', price: 10.00, coins: 1200 },
  pro_pack: { name: 'Pro-Paket', price: 20.00, coins: 2500 }
};

async function CreatePaymentLink(offerId, userId) {
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
        shipping_preference: 'NO_SHIPPING'
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
  request.requestBody({}); // empty body for capture
  try {
    const captureResponse = await client.execute(request);
    return captureResponse.result;
  } catch (error) {
    throw error;
  }
}


async function handlePaypalWebhookEvent(event) {
  if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
    console.log('Order approved:', event.resource.id);
    await captureOrder(event.resource.id);
    // Optionally capture payment here if you want to auto capture on approval
  }

  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {

    const data = event.resource
    const customdata = JSON.parse((data.custom_id));
  
    const UserToAward = customdata.userId
    const offerId = customdata.offerId

    const offerdata = FIXED_OFFERS[offerId];

   // const payment = await PaymentCollection.findOne({ paypalOrderId: capture.supplementary_data?.related_ids?.order_id });

    //if (payment) {
      await userCollection.updateOne(
        { "account.username": UserToAward },
        { $inc: { "currency.coins": offerdata.coins || 0 } }
      );

      console.log('User coins updated.');
    } else {
    
    }
  }
//}

module.exports = { CreatePaymentLink, verifyWebhook, handlePaypalWebhookEvent };


// Test runner
(async () => {
  const test = await CreatePaymentLink("pro_pack", "Liquem");
  console.log(test);
})();
