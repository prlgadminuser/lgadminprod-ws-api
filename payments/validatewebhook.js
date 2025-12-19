

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
      console.log('req.rawBody is invalid type:', typeof req.rawBody);
      return false;
    }
  } catch (err) {
    console.error('Error converting rawBody to string:', err);
    return false;
  }

  console.log('Raw body length:', rawBodyStr.length);
  console.log('Raw body preview:', rawBodyStr.substring(0, 200)); // first 200 chars

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

  // Safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(calculated),
    Buffer.from(receivedSignature)
  );
}

module.exports = validateXsollaSignature
