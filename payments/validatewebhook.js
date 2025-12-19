

const XSOLLA_WEBHOOK_SECRET = process.env.XSOLLA_WEBHOOK_SECRET


function validateXsollaSignature(rawBody, signature) {
  if (!signature) return false;

  const hmac = crypto
    .createHmac('sha1', XSOLLA_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(signature)
  );
}

module.exports = validateXsollaSignature