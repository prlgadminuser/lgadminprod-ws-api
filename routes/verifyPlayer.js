
const { tokenkey, userCollection } = require('./..//idbconfig');
const { jwt } = require('./..//index');
const { getUserInventory } = require('./getinventory');

async function verifyPlayer(token) {
    if (!token) throw new Error("Unauthorized");
    try {

        const decodedToken = jwt.verify(token, process.env.TOKEN_KEY || tokenkey);

        const username = decodedToken.username;
        if (!username) throw new Error("Invalid token");

        const userInformation = await userCollection.findOne({ username }, { projection: { coins: 1, token: 1, username: 1, } });
        if (!userInformation) throw new Error("User not found");

        if (!token === userInformation.token) {
            throw new Error("Invalid token");
          }

          
          const inventory = await getUserInventory(username, true)


        return { playerId: userInformation.username, inventory: inventory };


    } catch (error) {
        console.log(error)
        throw new Error("Token verification failed");
    }
}

module.exports = {
    verifyPlayer
};
