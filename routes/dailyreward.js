const { userCollection, shopcollection } = require('./../idbconfig');

function canCollectCoins(lastCollected) {

    const hoursPassed = (Date.now() / 1000 - lastCollected) / (60 * 60);
    return hoursPassed >= 24;
}


function generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getdailyreward(username) {
    try {
        // Check if the user exists in the database
        const user = await userCollection.findOne(
            { "account.username": username },
            { projection: { _id: 0, "account.username": 1, "inventory.last_collected": 1 } }
        );

        if (!user) {
            throw new Error("User not found.");
        }

        // Check if enough time has passed since the last coin collection
        const lastCollected = user.inventory.last_collected;

        if (!canCollectCoins(lastCollected)) {
            throw new Error("You can only collect coins once every 24 hours.");
        }

        // Fetch daily reward configuration
        const coinsdata = await shopcollection.findOne(
            { _id: "dailyrewardconfig" },
            { projection: { coinsmin: 1, coinsmax: 1 } }
        );

        if (!coinsdata) {
            throw new Error("Daily reward configuration not found.");
        }

        // Generate a random number of coins to add
        const coinsToAdd = generateRandomNumber(coinsdata.coinsmin, coinsdata.coinsmax);

        // Update user data in the database
        await userCollection.updateOne(
            { "account.username": username },
            {
                $inc: { "currency.coins": parseInt(coinsToAdd) },
                $set: { "inventory.last_collected": Date.now() },
            }
        );

        // Send the response
        return {
            coins: coinsToAdd,
            time: Date.now(),
        };

    } catch (error) {
        throw new Error(error.message || "An error occurred while processing your request.");
    }
}

module.exports = {
    getdailyreward,
};