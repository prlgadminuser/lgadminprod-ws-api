const { userCollection } = require('./../idbconfig');
const { rarityConfig } = require('./../boxrarityconfig');

async function buyRarityBox(username) {
    try {
        // Fetch user details
        const user = await getUserDetails(username);

        // Determine rarity and rewards
        const rarityType = rollForRarity();
        const rarity = determineRarity(rarityType);
        const rewards = generateRewards(rarity, user.inventory.items);

        // Decrement box count by 1 (user buys a rarity box)
        const updatedBoxes = user.currency.boxes - 1;

        // Update user fields in a single database operation
        await updateUserFields(username, {
            "currency.boxes": updatedBoxes, // Decrement boxes by 1
            "inventory.items": rewards.items, // Add new items to the set
            "currency.coins": rewards.coins // Increment coins safely
        });

        // Return rewards
        return rewards;
    } catch (error) {
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
        coins: [],
        items: [],
        rarity,
        message: config.message,
    };

    // If rarity is normal, only coins are rewarded
    if (rarity === "normal") {
        for (let i = 0; i < 2; i++) {
            rewards.coins.push(getRandomInRange(config.coinsRange));
        }
        return rewards; // No need to calculate items for normal rarity
    }

    // If rarity is not normal, handle item logic
    const unownedCustomItems = config.customItems.filter(item => !ownedItems.includes(item.id));

    if (rarity !== "normal") {
        // Check if the user owns at least 2 items from the custom items pool
        if (unownedCustomItems.length >= 2) {
            // Reward the user with the missing custom items
            rewards.items = getRandomItems(unownedCustomItems, config.itemCount).map(item => item.id);
        } else {
            // If the user owns 2 or more custom items, fallback to coins
            for (let i = 0; i < 2; i++) {
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

    // Decrement boxes, add new items, and increment coins
    if (updateFields["currency.boxes"] !== undefined) {
        updateData.$set = updateData.$set || {}; // Ensure $set exists
        updateData.$set["currency.boxes"] = updateFields["currency.boxes"]; // Set boxes to the new value
    }

    if (Array.isArray(updateFields["inventory.items"]) && updateFields["inventory.items"].length > 0) {
        updateData.$addToSet = updateData.$addToSet || {}; // Ensure $addToSet exists
        updateData.$addToSet["inventory.items"] = { $each: updateFields["inventory.items"] }; // Add new items to the existing set
    }

    if (Array.isArray(updateFields["currency.coins"]) && updateFields["currency.coins"].length > 0) {
        const coinSum = updateFields["currency.coins"].reduce((sum, coin) => sum + coin, 0);
        updateData.$inc = updateData.$inc || {}; // Ensure $inc exists
        updateData.$inc["currency.coins"] = coinSum; // Increment the coin count by the total sum of coins
    }

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
        { projection: { "account.username": 1, "currency.boxes": 1, "inventory.items": 1, "currency.coins": 1 } }
    );
}

module.exports = {
    buyRarityBox
};
