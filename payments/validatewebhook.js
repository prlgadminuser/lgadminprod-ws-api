const crypto = require('crypto');
const { userCollection } = require('../idbconfig');

const XSOLLA_WEBHOOK_SECRET = process.env.XSOLLA_WEBHOOK_SECRET

function validateXsollaSignature(req, rawBodyStr) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Signature ')) {
    console.log('Missing or invalid Authorization header');
    return false;
  }

  const receivedSignature = authHeader.substring('Signature '.length);

  if (!req.rawBody) {
    console.log('No rawBody available');
    return false;
  }


 

  console.log('Raw body length:', rawBodyStr.length);
  console.log('Raw body preview:', rawBodyStr); // first 200 chars

  let calculated;
  try {
    calculated = crypto.createHash('sha1')
      .update(rawBodyStr + XSOLLA_WEBHOOK_SECRET)
      .digest('hex');
  } catch (err) {
    console.error('Error calculating hash:', err);
    return false;
  }

  console.log('Calculated:', calculated);
  console.log('Received:  ', receivedSignature);

 return crypto.timingSafeEqual(
    Buffer.from(calculated),
    Buffer.from(receivedSignature)
  );


  // Safe comparison
//  return isWebhookValid
}



async function HandleWebookRequest(rawBodyStr) {

  const payload  = JSON.parse(rawBodyStr)

try {
 switch (payload.notification_type) {
      case 'user_validation': {
        const userId = body.user?.id;

        if (!userId) {
          console.log('user_validation: No user ID provided');
          return false
        }

        // Check if user exists in your DB
        const user = await userCollection.findOne({
          "account.username": userId 
        });

        if (user) {
          //console.log('User validated successfully:', userId);
        return true // Success: user exists
        } else {
         // console.log('User not found:', userId);
        return false
        }
      }


    case 'payment':
      // payment completed
      console.log('Payment successful:', payload);

    case 'refund':
      console.log('Refund issued:', payload);

    case 'chargeback':
      console.log('Chargeback:', payload);

    default:
      console.log('Unhandled event:', payload.notification_type);
  }
} catch (err) {
    console.error('Error handling webhook:', err);
    return res.status(500).send();
  }
}

module.exports = {
  validateXsollaSignature,
  HandleWebookRequest
}
