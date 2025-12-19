

const XSOLLA_WEBHOOK_SECRET = process.env.XSOLLA_WEBHOOK_SECRET

function validateXsollaSignature(req) {
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Signature ')) {
    console.log('Missing or invalid Authorization header');
    return false;
  }

  console.log("1")

  const receivedSignature = authHeader.substring('Signature '.length);

  if (!req.rawBody) {
    console.log('No rawBody available');
    return false;
  }

   console.log("2")

  const rawBodyStr = req.rawBody.toString('utf8');

  const calculated = crypto.createHash('sha1')
    .update(rawBodyStr + XSOLLA_WEBHOOK_SECRET)
    .digest('hex');

  console.log('Calculated:', calculated);
  console.log('Received:  ', receivedSignature);

  return crypto.timingSafeEqual(
    Buffer.from(calculated),
    Buffer.from(receivedSignature)
  );
}

module.exports = validateXsollaSignature
