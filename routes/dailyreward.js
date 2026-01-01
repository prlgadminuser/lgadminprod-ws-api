const { rarityConfig } = require("../boxrarityconfig");
const { SaveUserGrantedItems } = require("../utils/utils");
const { userCollection } = require("./../idbconfig");

// === CONFIGURATION ===
const rewardConfig = {
  rewardsPerClaim: 50,
  rewardsPool: [
    { type: "coins", min: 5, max: 10, chance: 100 },
    // { type: "boxes", min: 1, max: 2, chance: 8 },
    { type: "item", value: rarityConfig.rare1.customItems, chance: 90 },
  ],
};

// === GENERIC HELPERS ===
const hoursBetween = (a, b) => (a - b) / (1000 * 60 * 60);

const canCollectDaily = (lastCollected) =>
  hoursBetween(Date.now(), lastCollected) >= 24;

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFromArray = (arr) => arr[Math.floor(Math.random() * arr.length)];

const filterUnowned = (items, ownedItems) =>
  items.filter((item) => !ownedItems.has(item));

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
        return formatReward(reward.type, randomInt(reward.min, reward.max));

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
async function getdailyreward(username, owneditems) {
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
    const reward = getRandomReward(rewardConfig.rewardsPool, owneditems);
    if (reward) rewards.push(reward);
  }

  const update = {
    $set: { "inventory.last_collected": Date.now() },
  };

  const itemsToPush = [];

  for (const reward of rewards) {
    applyRewardToUpdate(update, reward, itemsToPush);
  }

  try {
    await session.withTransaction(async () => {
      if (itemsToPush.length) {
        await SaveUserGrantedItems(username, itemsToPush, owneditems, session);
      }

      await userCollection.updateOne({ "account.username": username }, update, {
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  return {
    time: Date.now(),
    rewards,
  };
}

module.exports = {
  getdailyreward,
};
