// verifyToken.js
const { tokenkey, userCollection } = require('../../idbconfig');
const { jwt } = require('../../index');
const { getUserIdPrefix } = require('../../utils/utils');

async function verifyToken(token, source) {
     // Directly assign tokenparam to token if token is passed directly
     token = String(token); 

    if (!token) return "false"

    try {
        // Verify the JWT token
        const decodedToken = jwt.verify(token, process.env.TOKEN_KEY || tokenkey);
        const userId = decodedToken

           
        if (!decodedToken || !userId) return "invalid";


        // Check if the user exists in the database
        const userInformation = await userCollection.findOne(
             getUserIdPrefix(userId),
            { projection: { "account.token": 1, "account.ban_data": 1 } }
        );

    

        if (!userInformation) return JSON.stringify({ status: "invalid" });


      const bantype = userInformation.account.ban_data.type || "noreason"
      const banreason = userInformation.account.ban_data.reason || "noreason"
      const bannedUntil = userInformation.account.ban_data.until

      const time = Date.now()

      const daysBanned = Math.floor((bannedUntil - time) / 86400000) + 1

      switch (source) {

      case 1:
        if (time < bannedUntil) {
          return "disabled";
        }
       case 2:
         if (time < bannedUntil) {
           return JSON.stringify({ status: "banned", bantype: bantype, reason: banreason, days: daysBanned });
         }

      }

        if (token !== userInformation.account.token) {
            return JSON.stringify({ status: "invalid" });
        }


        return JSON.stringify({ status: "success" });// Token is valid and matches the database
     } catch (error) {
//console.log(error)
    // Handle JWT-specific errors
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return JSON.stringify({ status: "invalid" });
    }
    // Unexpected server-side error
   // console.log(error)
    return "server error";
  }
}



module.exports = {
    verifyToken
};
