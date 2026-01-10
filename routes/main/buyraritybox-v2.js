const { userCollection } = require('./../idbconfig');
const { rarityConfig } = require('./../boxrarityconfig');
const { webhook } = require('./..//discordwebhook');
const { getUserIdPrefix } = require('../../utils/utils');

const ReplaceAlreadyOwnedItemsWithCoins = true

async function buyRarityBox(userId, owned_items) {
    try {
      const user = await getUserDetails(userId);
      if (user.currency.boxes < 1) throw new Error("no boxes left");

      const rarityRoll = Math.random();
      const rarity = determineRarity(rarityRoll);
      const config = rarityConfig[rarity];

      if (rarity === "legendary") {
        const joinedMessage = `${userId} got the chrono rarity!`;

          webhook.send(joinedMessage).catch(() => {});


      }

      const rewards = generateRewards(config, owned_items);

      const rewardStack = {
        items: [],
      };

      for (const reward of rewards) {
        if (reward.type === "item") {
          rewardStack.items.push(reward.value);
          owned_items.add(reward.value);
        } else {
          rewardStack[reward.type] =
            (rewardStack[reward.type] || 0) + reward.value;
        }
      }

      if (rewardStack.items.length === 0) {
        delete rewardStack.items;
      }

      await updateUserFields(username, rewardStack);

      return {
        message: "success",
        rarity: rarity,
        rewards: rewards,
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
async function updateUserFields(username, rewardStack) {
    const updateData = {
        $inc: { "currency.boxes": -1 }
    };

    if (rewardStack.items && rewardStack.items.length > 0) {
        updateData.$addToSet = {
            "inventory.items": { $each: rewardStack.items }
        };
    }

    for (const [key, value] of Object.entries(rewardStack)) {
        if (key === "items" || value === 0) continue;
        updateData.$inc[`currency.${key}`] = value;
    }

    await userCollection.updateOne(
         getUserIdPrefix(userId),
        updateData
    );
}

// --- Fetch user data
async function getUserDetails(userId) {
    return await userCollection.findOne(
         getUserIdPrefix(userId),
        { projection: { "currency.boxes": 1, "currency.coins": 1 } }
    );
}

module.exports = {
    buyRarityBox
};
