const { userCollection } = require('./../idbconfig');

// === CONFIGURATION ===
const rewardConfig = {
    rewardsPerClaim: 2, // number of rewards to give per daily claim
    rewardsPool: [
        { type: "coins", min: 20, max: 30, weight: 80 },
        { type: "boxes", min: 1, max: 2, weight: 20 },
       // { type: "item", value: "Mystery Box", weight: 10 },
    // { type: "item", value: "Lucky Token", weight: 5 }
    ]
};



// === HELPERS ===
function canCollectCoins(lastCollected) {
    const hoursPassed = (Date.now() - lastCollected) / (1000 * 60 * 60);
    return hoursPassed >= 24;
}

function generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Weighted random reward selector
function getRandomReward(pool) {
    const totalWeight = pool.reduce((sum, reward) => sum + reward.weight, 0);
    const rand = Math.random() * totalWeight;
    let accumulated = 0;

    for (const reward of pool) {
        accumulated += reward.weight;
        if (rand <= accumulated) {
            if (reward.type === "item") {
                return { type: reward.type, value: reward.value };
            } else {
                const value = generateRandomNumber(reward.min, reward.max);
                return { type: reward.type, value };
            }
        }
    }
}

// === MAIN FUNCTION ===
async function getdailyreward(username) {
    try {
        const user = await userCollection.findOne(
            { "account.username": username },
            { projection: { _id: 0, "account.username": 1, "inventory.last_collected": 1 } }
        );

        if (!user) {
            throw new Error("User not found.");
        }

        const lastCollected = user.inventory.last_collected;

        if (!canCollectCoins(lastCollected)) {
            throw new Error("You can only collect rewards once every 24 hours.");
        }

        const rewards = [];

        for (let i = 0; i < rewardConfig.rewardsPerClaim; i++) {
            rewards.push(getRandomReward(rewardConfig.rewardsPool));
        }

        // Build update object
        const update = {
            $set: { "inventory.last_collected": Date.now() }
        };

        for (const reward of rewards) {
            if (reward.type === "coins") {
                update.$inc = update.$inc || {};
                update.$inc["currency.coins"] = (update.$inc["currency.coins"] || 0) + reward.value;
            } else if (reward.type === "gems") {
                update.$inc = update.$inc || {};
                update.$inc["currency.gems"] = (update.$inc["currency.gems"] || 0) + reward.value;
            } else if (reward.type === "item") {
                update.$push = update.$push || {};
                update.$push["inventory.items"] = reward.value;
            }
        }

        await userCollection.updateOne({ "account.username": username }, update);

        return rewards;

    } catch (error) {
        console.log(error);
        throw new Error(error.message || "An error occurred while processing your request.");
    }
}

module.exports = {
    getdailyreward,
};
