// verifyToken.js
const { tokenkey, userCollection } = require('./..//idbconfig');
const { jwt } = require('./..//index');

async function verifyToken(token, source) {
     // Directly assign tokenparam to token if token is passed directly


    if (!token) return "false"

    try {
        // Verify the JWT token
        const decodedToken = jwt.verify(token, process.env.TOKEN_KEY || tokenkey);
        const username = decodedToken.username;
           
        if (!decodedToken || !username) return "invalid";

        // Check if the user exists in the database
        const userInformation = await userCollection.findOne(
            { "account.username": username },
            { projection: { "account.token": 1, "account.ban_data": 1 } }
        );

        if (!userInformation) return "invalid"

      const bantype = userInformation.account.ban_data.type || "noreason"
      const banreason = userInformation.account.ban_data.reason || "noreason"
      const bannedUntil = userInformation.account.ban_data.until

      const time = Date.now()

      if (source === 2) if (time < bannedUntil) return { bantype: bantype, reason: banreason, ban_until: bannedUntil, time: time };
      if (source === 1) if (time < bannedUntil) return "disabled";


        if (token !== userInformation.account.token) {
            return "invalid"
        }

        return "valid"// Token is valid and matches the database
     } catch (error) {
    // Handle JWT-specific errors
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return "invalid";
    }
    // Unexpected server-side error
    return "server error";
  }
}



module.exports = {
    verifyToken
};
