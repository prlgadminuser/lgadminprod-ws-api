

const XSOLLA_WEBHOOK_SECRET = process.env.XSOLLA_WEBHOOK_SECRET



function validateXsollaSignature(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Signature ')) {
    console.log('Missing or invalid Authorization header');
    return false;
  }

  const receivedSignature = authHeader.substring('Signature '.length); // Extract the hex part

  // Calculate expected signature: SHA1(rawBody + secret)
  const calculated = crypto.createHash('sha1')
                          .update(req.rawBody + XSOLLA_WEBHOOK_SECRET)
                          .digest('hex');

  // Compare (use timing-safe if possible, but this is fine for most cases)
  return calculated === receivedSignature;
}
module.exports = validateXsollaSignature
