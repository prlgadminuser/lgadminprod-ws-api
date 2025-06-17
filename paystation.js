
const axios = require('axios');
const paypal = require('@paypal/checkout-server-sdk');
const { userCollection, PaymentCollection } = require('./idbconfig');
const { PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_WEBHOOK_ID } = require('./ENV.js');


const environment = new paypal.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_SECRET);
const client = new paypal.core.PayPalHttpClient(environment);

const FIXED_OFFERS = {
  "1000_coins_pack": { name: '1000 Coins', price: 1.99, description: "1000 Coins for Skilldown", rewardtype: "coins", value: 1000 },
   // "net_jumper_pack": { name: 'Net Jumper Bundle', price: 1.99, description: "Net Jumper Bundle for Skilldown (2 items)", rewardtype: "item", value: ["A032", "B023"]},
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


     if (offer.rewardtype === "item") {
       const ItemsOwned = await userCollection.findOne(
      {
        "account.username": username,
        "inventory.items": { $in: offer.value },
      },
      {
        hint: "account.username_1_inventory.items_1",  // optional
      }
    );
      if (ItemsOwned) throw new Error('You already own this offer');
  }

    


    const user = await userCollection.findOne(
      { "account.username": userId },
      {
        projection: {
          "account.username": 1,
          "account.nickname": 1,
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
          currency_code: 'USD',
          value: offer.price.toFixed(2)
        },
        custom_id: JSON.stringify({ userId, offerId }),
        description: offer.description
      }],
      application_context: {
        return_url: 'https://skilldown.netlify.app',
        cancel_url: 'https://skilldown.netlify.app',
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

    const captureResult = await captureOrder(event.resource.id);
    const capture = captureResult.purchase_units[0].payments.captures[0];
    const customIdStr = capture.custom_id;
    const customdata = JSON.parse(customIdStr);
    const UserToAward = customdata.userId;
    const offerId = customdata.offerId;
    const offerdata = FIXED_OFFERS[offerId];

    if (!offerdata) {
         throw new Error('offerdata not valid');
    }

    try {
      await session.withTransaction(async () => {
        let userUpdate;

        if (offerdata.rewardtype !== "item") {
          userUpdate = await userCollection.updateOne(
            { "account.username": UserToAward },
            { $inc: { [`currency.${offerdata.rewardtype}`]: offerdata.value } },
            { session }
          );
        } else {
          userUpdate = await userCollection.updateOne(
            {
              "account.username": UserToAward,
              "inventory.items": { $in: offerdata.value }
            },
            {
              $addToSet: { "inventory.items": { $each: offerdata.value } }
            },
            { session }
          );

          if (userUpdate.modifiedCount === 0) {
            throw new Error('User already owns one or more items in the offer.');
          }
        }

        await PaymentCollection.insertOne({
          _id: event.resource.id,
          paypalCaptureId: capture.id,
          userId: UserToAward,
          offerdata,
          status: capture.status,
          create_time: capture.create_time,
          update_time: capture.update_time,
          payerdata: captureResult.payer || null
        }, { session });

      });

    } catch (error) {
      // ⚠️ Attempt refund if transaction failed but capture happened
      try {
        const refundRequest = new paypal.payments.CapturesRefundRequest(capture.id);
        refundRequest.requestBody({});

        const refundResponse = await client.execute(refundRequest);
        console.log(`Refund successful for capture ID ${capture.id}:`, refundResponse.result);
      } catch (refundError) {
        console.error('Refund failed:', refundError.message);
        // Optional: save refundError info in DB or alert admins
      }
    } finally {
      await session.endSession();
    }
  }
}

//}

module.exports = { CreatePaymentLink, verifyWebhook, handlePaypalWebhookEvent, FIXED_OFFERS };


// Test runner

