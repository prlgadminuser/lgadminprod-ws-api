const { tokenkey, userCollection } = require('./..//idbconfig');
const { jwt } = require('./..//index');
const { getUserInventory } = require('./getinventory');

async function verifyPlayer(token) {
    if (!token) throw new Error("Unauthorized");

    try {
        const decodedToken = jwt.verify(token, process.env.TOKEN_KEY || tokenkey);
        const username = decodedToken.username;
        if (!username) throw new Error("Invalid token");

        const userInformation = await userCollection.findOne(
            { "account.username": username },
            {
                projection: {
                    "account.username": 1,
                    "account.nickname": 1,
                    "account.token": 1,
                    "account.coins": 1
                }
            }
        );

        if (!userInformation) throw new Error("User not found");

        if (token !== userInformation.account.token) {
            throw new Error("Invalid token");
        }

        const inventory = await getUserInventory(username);

        return {
            playerId: userInformation.account.username,
            nickname: userInformation.account.nickname,
            inventory: inventory,
            items: new Set(inventory.items),
        };

    } catch (error) {
        throw new Error("Token verification failed");
    }
}

module.exports = {
    verifyPlayer
};
