

const XSOLLA_WEBHOOK_SECRET = process.env.XSOLLA_WEBHOOK_SECRET


function validateXsollaSignature(req) {
  const signature = req.headers['authorization'];
  if (!signature || !signature.startsWith('Signature ')) return false;
const calculated = crypto.createHmac('sha256', XSOLLA_WEBHOOK_SECRET)
  .update(req.rawBody)
                          .digest('hex');
  return signature === `Signature ${calculated}`;
}
module.exports = validateXsollaSignature
