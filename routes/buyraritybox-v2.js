const { userCollection } = require('./../idbconfig');
const { rarityConfig } = require('./../boxrarityconfig');
const { webhook } = require('./..//discordwebhook');

const ReplaceAlreadyOwnedItemsWithCoins = true

async function buyRarityBox(username, owned_items) {
    try {
        const user = await getUserDetails(username);
        if (user.currency.boxes < 1) throw new Error("no boxes left");

        const rarityRoll = Math.random();
        const rarity = determineRarity(rarityRoll);
        const config = rarityConfig[rarity];

        if (rarity === "legendary") {
            const joinedMessage = `${username} got the chrono rarity!`;
            webhook.send(joinedMessage);
        }

        const rewards = generateRewards(config, owned_items);

        // Track item IDs to update inventory
        const newItems = rewards
            .filter(r => r.type === "item")
            .map(r => r.value);

        newItems.forEach(item => owned_items.add(item));

        await updateUserFields(username, {
            "currency.boxes": -1,
            "inventory.items": newItems,
            "currency.coins": rewards
                .filter(r => r.type === "coins")
                .map(r => r.value)
        });

        return {
            message: "success",
            rarity: rarity,
            rewards: rewards
        };

    } catch (error) {
        throw new Error("An error occurred during the transaction");
    }
}

// --- Determine rarity based on roll
function determineRarity(roll) {
    for (const [rarity, config] of Object.entries(rarityConfig)) {
        if (roll < config.threshold) return rarity;
    }
    return "normal"; // fallback
}

// --- Generate coin and item rewards into a single rewards array
function generateRewards(config, ownedItems) {
    const rewards = [];

    // Always drop 2 coin rewards, even for normal
    for (let i = 0; i < 2; i++) {
        rewards.push({
            type: "coins",
            value: getRandomInRange(config.coinsRange)
        });
    }

    if (config.itemCount > 0 && config.customItems) {
        const unownedItems = config.customItems.filter(item => !ownedItems.has(item));

        if (unownedItems.length >= config.itemCount) {
            const itemsToGive = getRandomItems(unownedItems, config.itemCount);
            itemsToGive.forEach(item => {
                rewards.push({
                    type: "item",
                    value: item
                });
            });
        } else if (ReplaceAlreadyOwnedItemsWithCoins) {
            // Not enough new items, fallback to coins
            for (let i = 0; i < config.itemCount; i++) {
                rewards.push({
                    type: "coins",
                    value: getRandomInRange(config.coinsRange)
                });
            }
        }
    }

    return rewards;
}

// --- Return multiple distinct random items
function getRandomItems(items, count) {
    const randomItems = [];
    while (randomItems.length < count && items.length > 0) {
        const index = Math.floor(Math.random() * items.length);
        randomItems.push(items[index]);
        items.splice(index, 1);
    }
    return randomItems;
}

// --- Random int in range
function getRandomInRange([min, max]) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- MongoDB update operation for coins/items
async function updateUserFields(username, updateFields) {
    const updateData = {};

    if (Array.isArray(updateFields["inventory.items"]) && updateFields["inventory.items"].length > 0) {
        updateData.$addToSet = updateData.$addToSet || {};
        updateData.$addToSet["inventory.items"] = { $each: updateFields["inventory.items"] };
    }

    if (Array.isArray(updateFields["currency.coins"]) && updateFields["currency.coins"].length > 0) {
        const totalCoins = updateFields["currency.coins"].reduce((sum, val) => sum + val, 0);
        updateData.$inc = updateData.$inc || {};
        updateData.$inc["currency.coins"] = totalCoins;
    }

    updateData.$inc = updateData.$inc || {};
    updateData.$inc["currency.boxes"] = -1;

    if (Object.keys(updateData).length > 0) {
        await userCollection.updateOne(
            { "account.username": username },
            updateData
        );
    }
}

// --- Fetch user data
async function getUserDetails(username) {
    return await userCollection.findOne(
        { "account.username": username },
        { projection: { "currency.boxes": 1, "currency.coins": 1 } }
    );
}

module.exports = {
    buyRarityBox
};
