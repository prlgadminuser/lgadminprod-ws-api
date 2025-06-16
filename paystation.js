

const paypal = require('@paypal/checkout-server-sdk');
const { VerifyWebhookSignatureRequest } = require('@paypal/checkout-server-sdk').core;
const { userCollection, PaymentCollection } = require('./idbconfig');
const { PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_WEBHOOK_ID } = require('./ENV.js'); // Make sure ENV.js exports these

// PayPal client setup
const environment = new paypal.core.SandboxEnvironment(PAYPAL_CLIENT_ID, PAYPAL_SECRET);
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

        console.log("offer found")

        console.log(offer)


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
                custom_id: userId.toString(),
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

      /*  await userCollection.insertOne({
            userId: user._id,
            paypalOrderId: order.id,
            amountPaid: offer.price,
            currency: 'EUR',
            coinsAwarded: 0,
            offerId: offer.id,
            status: 'PENDING',
            rawPaypalData: order,
            createdAt: new Date()
        });

        */

        return { success: true, approveUrl: approveLink.href };

    } catch (error) {
        console.error('Fehler in CreatePaymentLink:', error.message);
        return { success: false, error: error.message };
    }
}


async function verifyWebhook(req) {
    const transmissionId = req.headers['paypal-transmission-id'];
    const transmissionTime = req.headers['paypal-transmission-time'];
    const certUrl = req.headers['paypal-cert-url'];
    const authAlgo = req.headers['paypal-auth-algo'];
    const transmissionSig = req.headers['paypal-transmission-sig'];
    const webhookId = PAYPAL_WEBHOOK_ID; // Get this from your ENV.js or process.env

    // req.rawBody is captured by body-parser's verify option
    const webhookEventBody = req.rawBody.toString('utf8'); // Ensure it's a string

    console.log(req.headers)

    try {
        const verifyRequest = new VerifyWebhookSignatureRequest(); // Instantiate the request object
        verifyRequest.headers = { // Set headers directly on the request object
            'paypal-transmission-id': transmissionId,
            'paypal-transmission-time': transmissionTime,
            'paypal-cert-url': certUrl,
            'paypal-auth-algo': authAlgo,
            'paypal-transmission-sig': transmissionSig
        };
        verifyRequest.requestBody({ // Set the webhook event body (raw string)
            webhook_id: webhookId,
            webhook_event: JSON.parse(webhookEventBody) // The SDK expects the parsed JSON for webhook_event
        });

        // Execute the verification request using the PayPal client
        const response = await client.execute(verifyRequest);

        // Check the verification status from the response
        return response.result.verification_status === 'SUCCESS';

    } catch (error) {
        console.error('Error during webhook signature verification:', error.message);
        return false; // Return false if any error occurs during verification
    }
}

async function handlePaypalWebhookEvent(event) {
  if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
    console.log('Order approved:', event.resource.id);
    // Optionally capture payment here if you want to auto capture on approval
  }

  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const capture = event.resource;
    console.log('Payment captured:', capture.id);

    const payment = await PaymentCollection.findOne({ paypalOrderId: capture.supplementary_data.related_ids.order_id });

    if (payment) {
    /*  await PaymentCollection.updateOne(
        { _id: payment._id },
        {
          $set: {
            paypalCaptureId: capture.id,
            status: 'COMPLETED',
            coinsAwarded: FIXED_OFFERS[payment.offerId]?.coins || 0,
            updatedAt: new Date()
          }
        }
      );

      */

      await userCollection.updateOne(
        { "account.username": payment.userId },
        { $inc: { "currency.coins": FIXED_OFFERS[payment.offerId].coins || 0 } }
      );

      console.log('User coins updated.');
    } else {
      console.warn('Payment record not found for capture:', capture.id);
    }
  }
}

module.exports = { CreatePaymentLink, verifyWebhook, handlePaypalWebhookEvent };


(async () => {
  const test = await CreatePaymentLink("pro_pack", "Liquem");
  console.log(test);
})();


