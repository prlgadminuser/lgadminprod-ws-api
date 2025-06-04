const { userCollection } = require('./../idbconfig');

// === CONFIGURATION ===
const rewardConfig = {
    rewardsPerClaim: 1057, // number of rewards to give per daily claim
    rewardsPool: [
        { type: "coins", min: 20, max: 30, chance: 90 },
        { type: "boxes", min: 1, max: 2, chance: 8 },
        { type: "item", value: ["A001", "A002"], chance: 2 },
        // { type: "item", value: "Lucky Token", weight: 5 }
    ]
};



// === HELPERS ===
function canCollectCoins(lastCollected) {
    const hoursPassed = (Date.now() - lastCollected) / (1000 * 60 * 60);
    return hoursPassed >= 24;
}

function pickRandomFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Weighted random reward selector
function getRandomReward(pool, ownedItems) {
    const totalChance = pool.reduce((sum, reward) => sum + reward.chance, 0);
    const rand = Math.random() * totalChance;

    let cumulativeChance = 0;

    for (const reward of pool) {
        cumulativeChance += reward.chance;
        if (rand < cumulativeChance) {
            if (reward.type === "item") {

                if (Array.isArray(reward.value)) {

                    const available = reward.value.filter(item => !ownedItems.includes(item));

                    if (available.length === 0) {
                        return false;
                    }

                    return {
                        type: reward.type,
                        value: pickRandomFromArray(available)
                    }
                    

                } else if (reward.type === "coins" || reward.type === "boxes") {

                    return {
                        type: reward.type,
                        value: generateRandomNumber(reward.min, reward.max),
                    }
                }
            }
        }
    }
}


// === MAIN FUNCTION ===
async function getdailyreward(username, ownedItems) {
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
            const reward = getRandomReward(rewardConfig.rewardsPool, ownedItems)
            if (reward) rewards.push(reward);
        }

        // Build update object
        const update = {
            $set: { "inventory.last_collected": Date.now() }
        };

        const itemsToPush = [];

        for (const reward of rewards) {
            if (reward.type === "coins") {
                update.$inc = update.$inc || {};
                update.$inc["currency.coins"] = (update.$inc["currency.coins"] || 0) + reward.value;
            } else if (reward.type === "boxes") {
                update.$inc = update.$inc || {};
                update.$inc["currency.boxes"] = (update.$inc["currency.boxes"] || 0) + reward.value;
            } else if (reward.type === "item") {
                itemsToPush.push(reward.value);
            }
        }

        if (itemsToPush.length > 0) {
            update.$push = {
                "inventory.items": { $each: itemsToPush }
            };
        }

        await userCollection.updateOne({ "account.username": username }, update);

        return {
            time: Date.now(),
            rewards: rewards,
        };

    } catch (error) {
        throw new Error(error.message || "An error occurred while processing your request.");
    }
}

module.exports = {
    getdailyreward,
};
