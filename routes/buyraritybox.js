const { userCollection, userInventoryCollection } = require('./../idbconfig');
const { rarityConfig } = require('./../boxrarityconfig');
const { webhook } = require('./..//discordwebhook');

async function buyRarityBox(username, owned_items) {
    try {
        // Fetch user details
        const user = await getUserDetails(username);

        if (1 > user.currency.boxes ) throw new Error("no boxes left")

        // Determine rarity and rewards
        const rarityType = rollForRarity();
        const rarity = determineRarity(rarityType);

        if (rarity === "legendary") {
        
            const joinedMessage = `${username} got the chrono rarity`;
            webhook.send(joinedMessage);

        }

        const rewards = generateRewards(rarity, owned_items);

        rewards.items.forEach(item => owned_items.add(item));

        // Update user fields in a single database operation
        await updateUserFields(username, {
            "currency.boxes": -1,
            "currency.coins": rewards.coins // Increment coins safely
        });

        if (rewards.items.length > 0) {

            const baseTimestamp = Date.now();

            const docs = rewards.items.map((id, index) => ({
                uid: username,
                id: id,
                ts: baseTimestamp + index
            }));
            
            await userInventoryCollection.insertMany(docs);
        }

        return rewards;
    } catch (error) {

     //   console.log(error)
        throw new Error("An error occurred during the transaction");
    }
}

// Function to determine the rarity based on a random number
function determineRarity(rarityType) {
    for (const [rarity, config] of Object.entries(rarityConfig)) {
        if (rarityType < config.threshold) {
            return rarity;
        }
    }
    return "normal"; // Fallback to normal rarity
}

// Function to generate rewards based on rarity
function generateRewards(rarity, ownedItems) {
    const config = rarityConfig[rarity];
    const rewards = {
        message: "success",
        coins: [],
        items: [],
        rarity,
    };

    // If rarity is normal, only coins are rewarded
    if (rarity === "normal") {
        for (let i = 0; i < 2; i++) {
            rewards.coins.push(getRandomInRange(config.coinsRange));
        }
        return rewards; // No need to calculate items for normal rarity
    }

    // If rarity is not normal, handle item logic
    const unownedCustomItems = config.customItems.filter(item => !ownedItems.has(item));

    if (rarity !== "normal") {
        // Check if the user owns at least 2 items from the custom items pool
        if (unownedCustomItems.length >= config.itemCount) {
            // Reward the user with the missing custom items
            rewards.items = getRandomItems(unownedCustomItems, config.itemCount)
        } else {
            // If the user owns 2 or more custom items, fallback to coins
            for (let i = 0; i < config.itemCount; i++) {
                rewards.coins.push(getRandomInRange(config.coinsRange));
            }
        }
    }

    return rewards;
}

// Function to get a random selection of items
function getRandomItems(items, count) {
    const randomItems = [];
    while (randomItems.length < count && items.length > 0) {
        const randomIndex = Math.floor(Math.random() * items.length);
        randomItems.push(items[randomIndex]);
        items.splice(randomIndex, 1); // Remove selected item
    }
    return randomItems;
}

// Function to get a random number within a range (min, max)
function getRandomInRange([min, max]) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to roll for rarity (random value between 0 and 1)
function rollForRarity() {
    return Math.random();
}

// Function to update all user fields in a single database operation
async function updateUserFields(username, updateFields) {
    const updateData = {};


    if (Array.isArray(updateFields["currency.coins"]) && updateFields["currency.coins"].length > 0) {
        const coinSum = updateFields["currency.coins"].reduce((sum, coin) => sum + coin, 0);
        updateData.$inc = updateData.$inc || {}; // Ensure $inc exists
        updateData.$inc["currency.coins"] = coinSum; // Increment the coin count by the total sum of coins
    }
    
    updateData.$inc = updateData.$inc || {};
    updateData.$inc["currency.boxes"] = -1;


    // Update the database if there are changes
    if (Object.keys(updateData).length > 0) {
        await userCollection.updateOne(
            { "account.username": username },  // Search by account.username
            updateData
        );
    }
}

// Function to get user details from the database
async function getUserDetails(username) {
    return await userCollection.findOne(
        { "account.username": username }, // Search by account.username
        { projection: { "currency.boxes": 1, "currency.coins": 1 } }
    );
}

module.exports = {
    buyRarityBox
};
