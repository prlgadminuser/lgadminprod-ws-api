const axios = require('axios');
const OFFERS = require('./offers');

// --- Xsolla Configuration (USE ENVIRONMENT VARIABLES IN PRODUCTION!) ---
const XSOLLA_MERCHANT_ID = '512328';
const XSOLLA_PROJECT_ID = '257403';
const XSOLLA_API_KEY = process.env.XSOLLA_TOKEN

const TOKEN_API_BASE_URL = 'https://api.xsolla.com/merchant/v2';
const TOKEN_ENDPOINT = `${TOKEN_API_BASE_URL}/merchants/${XSOLLA_MERCHANT_ID}/token`;

 const settings = {
    // currency: 'EUR',
    // return_url: 'https://your-site.com/success'
  };

  const isSandbox = false

// --- Main function: Generate checkout URL for a specific offer ID ---
async function generateCheckoutUrlForOffer(offerId, userData) {
  const offer = OFFERS[offerId];
  if (!offer) {
    throw new Error(`Offer with ID "${offerId}" not found. Available: ${Object.keys(OFFERS).join(', ')}`);
  }

  const itemsData = offer.items;

  // Calculate total amount from items (Xsolla requires this in checkout)
  const totalAmount = itemsData.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const tokenPayload = {

   

    user: {
      id: { value: userData.id },
      email: { value: userData.email },
      country: { value: userData.country },
    },
    settings: {
      project_id: parseInt(XSOLLA_PROJECT_ID),
     // return_url: settings.return_url || "https://skilldown.io/payment/success",
      ui: {
        size: "medium"
      },
      mode: isSandbox ? "sandbox" : undefined,
      // mode: isSandbox ? 'sandbox' : undefined  // Not needed here; use sandbox URL below
    },
    custom_parameters: {
      internal_order_id: `order_${Date.now()}`,  // Make it unique per request
      offer_id: offerId,                         // Useful for your webhook handling
      source_platform: "web_store",
      // coupon_code: "SUMMER20"                 // Optional
    },
    purchase: {
      description: {
        lineitems: itemsData.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description || offer.description,
          image_url: item.image_url || offer.image_url,
          price: { amount: item.price.toString() },
          is_bonus: item.is_bonus || false,
          quantity: item.quantity || 1,
        }))
      },
      checkout: {
        amount: totalAmount,
        currency: settings.currency || "USD",
      }
    }
    // No need for mode: "sandbox" here
  };

  try {
    const authHeader = `Basic ${Buffer.from(`${XSOLLA_MERCHANT_ID}:${XSOLLA_API_KEY}`).toString('base64')}`;

    const response = await axios.post(TOKEN_ENDPOINT, tokenPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    });

    const token = response.data.token;
    if (!token) throw new Error('No token received from Xsolla');

    const paystationBaseUrl = isSandbox ? 'https://sandbox-secure.xsolla.com/paystation4' : 'https://secure.xsolla.com/paystation4' ;

    return `${paystationBaseUrl}/?token=${token}`;

  } catch (error) {
    console.error('Xsolla Token Generation Failed:', error.message);
    if (error.response?.data) {
      console.error('Error Details:', JSON.stringify(error.response.data));
    }
    throw new Error('Failed to generate Xsolla payment token');
  }
}


module.exports = generateCheckoutUrlForOffer