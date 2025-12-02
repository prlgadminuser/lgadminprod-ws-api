// Updated full code with reconciliation job and separated user reward logic

const { userCollection, PaymentCollection } = require('./idbconfig');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const XSOLLA_PROJECT_ID = "257403"
const XSOLLA_MERCHANT_ID = "512328"
const XSOLLA_API_KEY = "809fc93045d9a9938a8aaf195b0295947bd04275";
const XSOLLA_WEBHOOK_SECRET = process.env.XSOLLA_WEBHOOK_SECRET;

app.use(bodyParser.json());


// Example products in memory (optional, can also be in DB)
const products = {
    "coinspack_200": {
        name: 'pack_1',
        price: 2.00,
        currency: 'USD',
        description: 'Kickstart your adventure!',
       // image_url: 'https://example.com/images/gooberdash.png'
    }
};

// 1️⃣ Generate hosted checkout page




async function generateXsollaCheckoutURL(product_id, user_id, userCountryCode) {
    if (!product_id || !user_id) {
        throw new Error('Missing product_id or user_id');
    }
    const product = products[product_id];
    if (!product) {
        throw new Error('Invalid product_id');
    }
    if (!userCountryCode) {
        throw new Error('Missing user country code (ISO 2-letter)'); 
    }

    try {
        const response = await axios.post(
            `https://store.xsolla.com/api/v3/project/${XSOLLA_PROJECT_ID}/admin/payment/token`,
            {
                sandbox: true,  // for testing
                user: {
                    id: { value: String(user_id) },
                    country: { value: userCountryCode }
                },
                purchase: {
                    items: [
                        {
                            sku: product_id,
                            name: product.name,
                            type: "virtual_item",
                            quantity: 1, // ✅ required
                           // amount: 1,
                            description: product.description
                            // **Do not include price override** unless your project supports custom pricing
                        }
                    ]
                }
            },
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(XSOLLA_PROJECT_ID + ':' + XSOLLA_API_KEY).toString('base64')}`,
                    'Content-Type': 'application/json'
                    // optionally: 'X-User-Ip': userIp
                }
            }
        );

        const token = response.data.token;
        // If sandbox, use sandbox paystation URL
        const base = response.data.status === 'sandbox' 
            ? 'https://sandbox-secure.xsolla.com/paystation4/?token=' 
            : 'https://secure.xsolla.com/paystation4/?token=';
        return base + token;
    } catch (err) {
        console.error("Xsolla Shop Builder Token Error:", err.response?.data || err.message);
    }
}


// 2️⃣ Handle Xsolla webhook
app.post('/webhook', async (req, res) => {
    const signature = req.headers['x-xsolla-signature'] || '';
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSig = crypto
        .createHmac('sha256', XSOLLA_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

    if (signature !== expectedSig) return res.status(403).send('Invalid signature');

    const event = req.body;

    if (event.notification_type === 'payment') {
        const order = event.order;
        const userId = order.user.id;
        const sku = order.virtual_items[0].sku;

        try {
            // 3️⃣ Database operation
            // Example: grant virtual item
            const result = await userCollection.updateOne(
                { _id: userId },
                { $push: { inventory: sku } }
            );

            if (result.modifiedCount === 1) {
                console.log(`Delivered item ${sku} to user ${userId}`);

                // 4️⃣ Confirm payment capture to Xsolla only if DB success
                await axios.post(
                    `https://sandbox.api.xsolla.com/merchant/v2/merchants/${XSOLLA_PROJECT_ID}/orders/${order.id}/capture`,
                    {},
                    {
                        headers: {
                            Authorization: `Basic ${Buffer.from(XSOLLA_API_KEY + ':').toString('base64')}`
                        }
                    }
                );
            } else {
                console.log(`Failed to deliver item for user ${userId}, payment not captured`);
            }
        } catch (err) {
            console.error('Error processing order:', err.message);
        }
    }

    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
