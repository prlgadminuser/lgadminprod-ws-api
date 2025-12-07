// pow_functions.js
const crypto = require('crypto');

// --- Configuration ---
// This secret key MUST be kept serverside and never exposed to the client.
const SERVER_SECRET = 'fawkuliquemkey4536';
// The challenge is valid for 5 minutes (300,000 milliseconds)
const CHALLENGE_EXPIRY_MS = 500000; 

/**
 * Creates a Proof-of-Work challenge string.
 * The challenge includes a timestamp, a random salt, and a signature (HMAC) for integrity.
 * The server must only accept solutions for challenges it generated.
 * * @param {number} difficulty - The required number of leading zero characters in the resulting hash (e.g., 4 for '0000').
 * @returns {object} An object containing the challenge details to send to the client.
 */
function createChallenge(difficulty) {
    if (difficulty < 1 || difficulty > 6) {
        // Difficulty 4-6 is usually sufficient for simple bot mitigation.
        throw new Error("Difficulty must be between 1 and 6.");
    }
    
    // Generate a random salt to ensure unique challenges
    const salt = crypto.randomBytes(16).toString('hex');
    const expiry = Date.now() + CHALLENGE_EXPIRY_MS;
    
    // Data elements packaged into the challenge
    const challengeData = {
        difficulty: difficulty,
        salt: salt,
      //  expiry: expiry 
    };

    // Serialize data for signing
    const dataString = JSON.stringify(challengeData);
    
    // Create an HMAC signature to ensure challenge integrity
    const hmac = crypto.createHmac('sha256', SERVER_SECRET);
    hmac.update(dataString);
    const signature = hmac.digest('hex');

    // The final challenge string sent to the client is the base data + its signature
    const challengeToken = `${dataString}.${signature}`;

    return {
        challengeToken: challengeToken,
        difficulty: difficulty,
        // The client only needs the token and difficulty, but we include 
        // the expiry time for clear documentation.
        //expiresAt: new Date(expiry).toISOString()
    };
}


/**
 * Verifies the client's Proof-of-Work solution.
 * * @param {string} challengeToken - The full challenge token received from the client (data + signature).
 * @param {number} nonce - The nonce (counter) found by the client.
 * @returns {boolean} True if the PoW is valid, false otherwise.
 */
function verifySolution(challengeToken, nonce) {
    // 1. Separate the challenge data and the signature
    const parts = challengeToken.split('.');
    if (parts.length !== 2) {
        console.error('VERIFICATION FAILED: Invalid challenge token format.');
        return false;
    }
    const [dataString, receivedSignature] = parts;

    // 2. Re-calculate the expected HMAC signature to verify integrity
    const hmac = crypto.createHmac('sha256', SERVER_SECRET);
    hmac.update(dataString);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== receivedSignature) {
        console.error('VERIFICATION FAILED: Signature mismatch (Challenge tampered).');
        return false;
    }

    // 3. Parse and check the challenge data
    let challengeData;
    try {
        challengeData = JSON.parse(dataString);
    } catch (e) {
        console.error('VERIFICATION FAILED: Cannot parse challenge data.', e);
        return false;
    }

    // 4. Check for challenge expiry
    if (challengeData.expiry < Date.now()) {
        console.error('VERIFICATION FAILED: Challenge has expired.');
        return false;
    }

    // 5. Verify the actual proof-of-work
    const { difficulty, salt } = challengeData;
    
    // The string the client should have hashed: salt + nonce
    const dataToHash = salt + nonce;
    
    // Calculate the resulting hash
    const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

    // Check against the difficulty target
    const targetPrefix = '0'.repeat(difficulty);

    if (hash.startsWith(targetPrefix)) {
        console.log(`VERIFICATION SUCCESS: Hash starts with ${targetPrefix}. Nonce: ${nonce}. Hash: ${hash.substring(0, difficulty + 5)}...`);
        // IMPORTANT: In a real application, you would also mark this challengeToken 
        // as USED in a database to prevent replay attacks.
        return true;
    } else {
        console.error(`VERIFICATION FAILED: Hash does not meet difficulty ${difficulty}.`);
        console.error(`Attempted hash: ${hash}`);
        return false;
    }
}





async function CheckUserIp(ip) {
  const proxyCheckUrl = `https://proxycheck.io/v2/${ip}?key=361c8a-127f25-394247-47kers&vpn=1&asn=1&risk=1`;

  try {
    const res = await fetch(proxyCheckUrl);

    const data = await res.json();

    if (data[ip]?.proxy === "yes") {
      return {
        ip,
        isVPN: true,
        type: data[ip].type || "VPN/Proxy",
        provider: data[ip].provider || "Unknown"
      };
    } else {
      return {
        ip,
        isVPN: false,
        type: "Residential"
      };
    }
  } catch (error) {
    return { ip, isVPN: true, error: "Check failed" };
  }
}



module.exports = {
    createChallenge,
    verifySolution,
    CheckUserIp
};