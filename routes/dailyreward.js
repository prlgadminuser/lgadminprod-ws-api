const { rarityConfig } = require('../boxrarityconfig');
const { userCollection } = require('./../idbconfig');
// === CONFIGURATION ===
const rewardConfig = {
    rewardsPerClaim: 2,
    rewardsPool: [
        { type: "coins", min: 5, max: 10, chance: 90 },
        { type: "boxes", min: 1, max: 2, chance: 8 },
        // { type: "item", value: ["A001", "A002"], chance: 2 },
    ]
};

const bonusItems = rarityConfig.rare1.customItems

// === GENERIC HELPERS ===
const hoursBetween = (a, b) => (a - b) / (1000 * 60 * 60);

const canCollectDaily = (lastCollected) =>
    hoursBetween(Date.now(), lastCollected) >= 24;

const randomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

const randomFromArray = (arr) =>
    arr[Math.floor(Math.random() * arr.length)];

const filterUnowned = (items, ownedItems) =>
    items.filter(item => !ownedItems.has(item));

// Formats rewards as [type, value]
const formatReward = (type, value) => [type, value];

// === REWARD GENERATION ===
function getRandomReward(pool, ownedItems) {
    const totalChance = pool.reduce((sum, r) => sum + r.chance, 0);
    let roll = Math.random() * totalChance;

    for (const reward of pool) {
        roll -= reward.chance;
        if (roll > 0) continue;

        switch (reward.type) {
            case "coins":
            case "boxes":
                return formatReward(
                    reward.type,
                    randomInt(reward.min, reward.max)
                );

            case "item": {
                if (!Array.isArray(reward.value)) return false;
                const available = filterUnowned(reward.value, ownedItems);
                if (!available.length) return false;
                return formatReward("item", randomFromArray(available));
            }

            default:
                return false;
        }
    }

    return false;
}

function maybeGetBonusItem(ownedItems, chancePercent) {
    if (Math.random() >= chancePercent / 100) return null;

    const available = filterUnowned(bonusItems, ownedItems);
    if (!available.length) return null;

    return formatReward("item", randomFromArray(available));
}

// === DB UPDATE HELPERS ===
function applyRewardToUpdate(update, [type, value], itemsToPush) {
    if (type === "coins" || type === "boxes") {
        update.$inc ??= {};
        update.$inc[`currency.${type}`] =
            (update.$inc[`currency.${type}`] || 0) + value;
    }

    if (type === "item") {
        itemsToPush.push(value);
    }
}

// === MAIN FUNCTION ===
async function getdailyreward(username, ownedItems) {
    const user = await userCollection.findOne(
        { "account.username": username },
        { projection: { _id: 0, "inventory.last_collected": 1 } }
    );

    if (!user) throw new Error("User not found.");
    if (!canCollectDaily(user.inventory.last_collected)) {
        throw new Error("You can only collect rewards once every 24 hours.");
    }

    const rewards = [];

    for (let i = 0; i < rewardConfig.rewardsPerClaim; i++) {
        const reward = getRandomReward(rewardConfig.rewardsPool, ownedItems);
        if (reward) rewards.push(reward);
    }

    const bonusReward = maybeGetBonusItem(ownedItems, 100);
    if (bonusReward) rewards.push(bonusReward);

    const update = {
        $set: { "inventory.last_collected": Date.now() }
    };

    const itemsToPush = [];

    for (const reward of rewards) {
        applyRewardToUpdate(update, reward, itemsToPush);
    }

     if (itemsToPush.length) {
        update.$push = {
            "inventory.items": { $each: itemsToPush }
         };
     }

    await userCollection.updateOne(
        { "account.username": username },
        update
    );

    return {
        time: Date.now(),
        rewards // now always [[type, value], ...]
    };
}

module.exports = {
    getdailyreward,
};
