const crypto = require('crypto');
const { userCollection } = require('../idbconfig');

const XSOLLA_WEBHOOK_SECRET = process.env.XSOLLA_WEBHOOK_SECRET

function validateXsollaSignature(req) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Signature ')) {
    console.log('Missing or invalid Authorization header');
    return false;
  }

  console.log("1");

  const receivedSignature = authHeader.substring('Signature '.length);

  if (!req.rawBody) {
    console.log('No rawBody available');
    return false;
  }

  console.log("2");

  // ── Critical fix: safely convert to string ──
  let rawBodyStr;
  try {
    if (Buffer.isBuffer(req.rawBody)) {
      rawBodyStr = req.rawBody.toString('utf8');
    } else if (typeof req.rawBody === 'string') {
      rawBodyStr = req.rawBody;  // already string
    } else {
     // console.log('req.rawBody is invalid type:', typeof req.rawBody);
      return false;
    }
  } catch (err) {
   // console.error('Error converting rawBody to string:', err);
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

  const isWebhookValid =  crypto.timingSafeEqual(
    Buffer.from(calculated),
    Buffer.from(receivedSignature)
  );

  if (!isWebhookValid) return

  HandleWebookRequest(rawBodyStr)



  // Safe comparison
//  return isWebhookValid
}



async function HandleWebookRequest(payload) {

// Example handling
try {
 switch (payload.notification_type) {
      case 'user_validation': {
        const userId = body.user?.id;

        if (!userId) {
          console.log('user_validation: No user ID provided');
          return res.status(400).json({ error: { code: 'INVALID_USER' } });
        }

        // Check if user exists in your DB
        const user = await userCollection.findOne({
          "account.username": userId  // or whatever field you use for Xsolla user ID
          // Example alternatives:
          // "xsolla_user_id": userId
          // "account.userId": userId
        });

        if (user) {
          //console.log('User validated successfully:', userId);
          return res.status(204).send(); // Success: user exists
        } else {
         // console.log('User not found:', userId);
          return res.status(400).json({ error: { code: 'INVALID_USER' } });
        }
      }


    case 'payment':
      // payment completed
      console.log('Payment successful:', payload);
      break;

    case 'refund':
      console.log('Refund issued:', payload);
      break;

    case 'chargeback':
      console.log('Chargeback:', payload);
      break;

    default:
      console.log('Unhandled event:', payload.notification_type);
  }
} catch (err) {
    console.error('Error handling webhook:', err);
    return res.status(500).send();
  }
}

module.exports = validateXsollaSignature