const { rarityConfig } = require("../../boxrarityconfig");
const { SaveUserGrantedItems } = require("../../utils/utils");
const { userCollection, client } = require("../..//idbconfig");
const { getUserIdPrefix } = require("../../utils/utils");

// === CONFIGURATION ===
const REWARDS_PER_CLAIM = 1;
const COIN_FALLBACK = { min: 5, max: 10 };
const REWARDS_POOL = [
  { type: "coins", min: 5, max: 10, chance: 100 },
  // { type: "boxes", min: 1, max: 2, chance: 8 },
  //{ type: "item", value: rarityConfig.rare1.customItems, chance: 20 },
];

// === HELPERS ===
const hoursSince = (timestamp) => (Date.now() - timestamp) / (1000 * 60 * 60);
const canCollectDaily = (lastCollected) => hoursSince(lastCollected) >= 24;
const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const randomFromArray = (arr) => arr[Math.floor(Math.random() * arr.length)];

const isStreakAlive = (lastCollected) => {
  if (!lastCollected) return false;

  const now = Date.now();
  const last = new Date(lastCollected).getTime();
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

  return now - last < TWO_DAYS_MS;
};

// === REWARD SELECTION ===
function selectRandomReward(pool, ownedItemsSet, alreadyGrantedThisClaim) {
  const totalChance = pool.reduce((sum, r) => sum + r.chance, 0);
  let roll = Math.random() * totalChance;

  for (const reward of pool) {
    roll -= reward.chance;
    if (roll > 0) continue;

    switch (reward.type) {
      case "coins":
      case "boxes":
        return [reward.type, randomInt(reward.min, reward.max)];

      case "item": {
        if (!Array.isArray(reward.value)) return null;

        // Filter out items the user already owns OR received in this claim
        const available = reward.value.filter(
          (item) =>
            !ownedItemsSet.has(item) && !alreadyGrantedThisClaim.has(item),
        );

        if (available.length === 0)
          return ["coins", randomInt(COIN_FALLBACK.min, COIN_FALLBACK.max)];

        const selected = randomFromArray(available);
        alreadyGrantedThisClaim.add(selected); // Mark as granted this session
        return ["item", selected];
      }

      default:
        return null;
    }
  }

  return null;
}

// === MAIN FUNCTION ===
async function getdailyreward(userId, owneditems) {
  // owneditems is assumed to be an array or iterable of owned item IDs/strings
  const ownedItemsSet = new Set(owneditems);
  const alreadyGrantedThisClaim = new Set(); // Track items given in this claim

  // Check user existence and cooldown
  const user = await userCollection.findOne(getUserIdPrefix(userId), {
    projection: { "inventory.daily_reward.last_collected_at": 1 },
  });

  const lastCollected = user.inventory.daily_reward.last_collected_at;

  if (!user) throw new Error("User not found.");
  if (!canCollectDaily(lastCollected)) {
    throw new Error("You can only collect rewards once every 24 hours.");
  }

  // Generate rewards
  const rewards = [];
  for (let i = 0; i < REWARDS_PER_CLAIM; i++) {
    const reward = selectRandomReward(
      REWARDS_POOL,
      ownedItemsSet,
      alreadyGrantedThisClaim,
    );
    if (reward) rewards.push(reward);
  }

  // Prepare DB updates
  const update = {
    $set: { "inventory.daily_reward.last_collected_at": Date.now() },
    $inc: { "currency.coins": 0, "currency.boxes": 0 }, // Initialize for increment
  };

  if (isStreakAlive(lastCollected)) {
    update.$inc["inventory.daily_reward.streak"] = 1;
  } else {
    update.$set["inventory.daily_reward.streak"] = 1; // reset streak
  }

  const itemsToGrant = [];

  for (const [type, value] of rewards) {
    if (type === "coins") {
      update.$inc["currency.coins"] += value;
    } else if (type === "boxes") {
      update.$inc["currency.boxes"] += value;
    } else if (type === "item") {
      itemsToGrant.push(value);
    }
  }

  // Remove zero increments to keep update clean (optional)
  if (update.$inc["currency.coins"] === 0) delete update.$inc["currency.coins"];
  if (update.$inc["currency.boxes"] === 0) delete update.$inc["currency.boxes"];

  // Execute transaction
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      if (itemsToGrant.length > 0) {
        await SaveUserGrantedItems(userId, itemsToGrant, owneditems, session);
      }

      await userCollection.updateOne(getUserIdPrefix(userId), update, {
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  return {
    time: Date.now(),
    rewards, // Array of [type, value]
  };
}

module.exports = { getdailyreward };




