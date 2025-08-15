// verifyToken.js
const { tokenkey, userCollection } = require('./..//idbconfig');
const { jwt } = require('./..//index');

async function verifyToken(token) {
     // Directly assign tokenparam to token if token is passed directly


    if (!token) return "false"

    try {
        // Verify the JWT token
        const decodedToken = jwt.verify(token, process.env.TOKEN_KEY || tokenkey);
        const username = decodedToken.username;
        if (!decodedToken) return "false"
        if (!username) return "false"
        // Check if the user exists in the database
        const userInformation = await userCollection.findOne(
            { "account.username": username },
            { projection: { "account.token": 1 } }
        );

        if (!userInformation) return "false"

        // Verify if the token matches the token stored in the database
        if (token !== userInformation.account.token) {
            return "false"
        }

        return "valid"// Token is valid and matches the database
    } catch (error) {
          return "server error"
    }
}

module.exports = {
    verifyToken
};
