const { rarityConfig } = require("../../boxrarityconfig");
const { SaveUserGrantedItems } = require("../../utils/utils");
const { userCollection, client } = require("../../idbconfig");
const { getUserIdPrefix } = require("../../utils/utils");

// ================= DROP COUNT SYSTEM =================
// Mimics Brawl Stars "box quality" variance: each box independently rolls a drop count + rarity distribution.
// Higher drop counts are rarer but heavily biased toward better rarities (just like Mega Boxes / Starr Drops having better odds).
// This creates excitement per box while staying fully server-sided and fair.
const RARITY_ORDER = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

const DROP_COUNT_TABLE = [
  { count: 5, chance: 85, rarities: { common: 65, rare: 25, epic: 8, legendary: 2 } },
  { count: 6, chance: 7, rarities: { common: 55, rare: 30, epic: 12, legendary: 3 } },
  { count: 7, chance: 4, rarities: { common: 40, rare: 35, epic: 18, legendary: 7 } },
  { count: 8, chance: 2, rarities: { rare: 45, epic: 35, legendary: 20 } },
  { count: 9, chance: 1.5, rarities: { epic: 60, legendary: 40 } },
  { count: 10, chance: 0.5, rarities: { legendary: 100 } },
];

// Pre-compute totals once (max performance)
const TOTAL_DROP_CHANCE = DROP_COUNT_TABLE.reduce((sum, entry) => sum + entry.chance, 0);

// Pre-build fast lookup for rarity groups
const RARITY_GROUPS = new Map(LOOTBOX_POOL.map((group) => [group.rarity, group]));

const LOOTBOX_POOL = [
  { rarity: "common", drops: [{ type: "currency", name: "coins", min: 5, max: 15, chance: 100 }] },
  {
    rarity: "rare",
    drops: [
      { type: "currency", name: "coins", min: 15, max: 30, chance: 60 },
      // { type: "currency", name: "diamonds", min: 2, max: 5, chance: 40 }, // uncomment if needed
      { type: "item", itemPool: rarityConfig.hats?.customItems || [], chance: 25 },
      { type: "item", itemPool: rarityConfig.tops?.customItems || [], chance: 15 },
    ],
  },
  {
    rarity: "epic",
    drops: [
      { type: "currency", name: "coins", min: 30, max: 60, chance: 50 },
      // { type: "currency", name: "diamonds", min: 4, max: 8, chance: 50 }, // uncomment if needed
      { type: "item", itemPool: rarityConfig.hats?.customItems || [], chance: 5 },
      { type: "item", itemPool: rarityConfig.tops?.customItems || [], chance: 5 },
      { type: "item", itemPool: rarityConfig.banners?.customItems || [], chance: 20 },
      { type: "item", itemPool: rarityConfig.poses?.customItems || [], chance: 20 },
    ],
  },
  {
    rarity: "legendary",
    drops: [{ type: "item", itemPool: rarityConfig.legendary?.customItems || [], chance: 100 }],
  },
];

// ================= OPTIMIZED HELPERS (production-max) =================
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFromArray = (arr) => arr[Math.floor(Math.random() * arr.length)];

// O(1) random pick + removal (Fisher-Yates style) - critical for large item pools
function pickAndRemoveRandom(arr) {
  if (arr.length === 0) return null;
  const idx = Math.floor(Math.random() * arr.length);
  const selected = arr[idx];
  arr[idx] = arr[arr.length - 1];
  arr.pop();
  return selected;
}

// Fast cross-pool removal (handles rare case of overlapping item IDs across pools like hats/tops)
function removeFromAllAvailableLists(selectedItem, poolToAvailable) {
  for (const availableArr of poolToAvailable.values()) {
    const idx = availableArr.indexOf(selectedItem);
    if (idx !== -1) {
      availableArr[idx] = availableArr[availableArr.length - 1];
      availableArr.pop();
    }
  }
}

// Weighted roll (kept simple - pools are tiny, no need for binary search)
function weightedRoll(pool) {
  const total = pool.reduce((s, r) => s + r.chance, 0);
  let roll = Math.random() * total;
  for (const entry of pool) {
    roll -= entry.chance;
    if (roll <= 0) return entry;
  }
  return pool[pool.length - 1];
}

// ================= DROP PROFILE (pre-compiled totals) =================
function rollDropProfile() {
  let roll = Math.random() * TOTAL_DROP_CHANCE;
  for (const entry of DROP_COUNT_TABLE) {
    roll -= entry.chance;
    if (roll <= 0) return entry;
  }
  return DROP_COUNT_TABLE[0];
}

function rollRarity(rarityWeights) {
  const entries = Object.entries(rarityWeights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return entries[0][0];
}

function sortRewardsByRarity(rewards) {
  return rewards.sort((a, b) => {
    const rarityA = a[a.length - 1];
    const rarityB = b[b.length - 1];
    const rarityDiff = (RARITY_ORDER[rarityA] || 0) - (RARITY_ORDER[rarityB] || 0);
    if (rarityDiff !== 0) return rarityDiff;

    // Same rarity: smaller currency amounts first (classic Brawl Stars presentation order)
    if (a[0] === "currency" && b[0] === "currency") {
      return a[2] - b[2];
    }
    return 0;
  });
}

// ================= SINGLE BOX (now ultra-light) =================
function generateSingleBox(poolToAvailable) {
  const rewards = [];
  const profile = rollDropProfile();
  const dropCount = profile.count;

  for (let i = 0; i < dropCount; i++) {
    const rarityName = rollRarity(profile.rarities);
    const rarityGroup = RARITY_GROUPS.get(rarityName);

    if (!rarityGroup?.drops?.length) {
      rewards.push(["currency", "coins", randomInt(5, 15), "common"]);
      continue;
    }

    const dropDef = weightedRoll(rarityGroup.drops);

    // Currency drop (fast path)
    if (dropDef.type === "currency") {
      const amount = randomInt(dropDef.min, dropDef.max);
      rewards.push(["currency", dropDef.name, amount, rarityGroup.rarity]);
      continue;
    }

    // Item drop - fully optimized path (no per-drop filtering!)
    if (dropDef.type === "item") {
      const pool = dropDef.itemPool || [];
      if (!pool.length) {
        rewards.push(["currency", "coins", randomInt(5, 15), "common"]);
        continue;
      }

      const available = poolToAvailable.get(pool);
      if (!available || available.length === 0) {
        rewards.push(["currency", "coins", randomInt(5, 15), "common"]);
        continue;
      }

      const selected = pickAndRemoveRandom(available);
      if (selected === null) {
        rewards.push(["currency", "coins", randomInt(5, 15), "common"]);
        continue;
      }

      // Prevent duplicates across ALL pools in this claim (Brawl Stars style - no dupes in one opening session)
      removeFromAllAvailableLists(selected, poolToAvailable);

      rewards.push(["item", selected, rarityGroup.rarity]);
    }
  }

  return { dropCount, rewards };
}

// ================= MAIN API (production-optimized) =================
async function generateLootBoxes(amount, userId, owneditems, additionalUpdate = {}) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Invalid lootbox amount.");
  }

  // owneditems is expected to be a Set (as before) for O(1) lookups
  const ownedItemsSet = owneditems;

  const boxes = {};
  const itemsToGrant = [];
  const currencyToGrant = {};

  // ================= MAX OPTIMIZATION: PRE-FILTER ALL ITEM POOLS ONCE =================
  // This eliminates the massive O(n) filter cost on every single drop.
  // Only runs once per claim instead of (amount × dropCount × itemDrops).
  const poolToAvailable = new Map();
  const usedPools = new Set();

  for (const rarityGroup of LOOTBOX_POOL) {
    for (const dropDef of rarityGroup.drops || []) {
      if (dropDef.type === "item" && Array.isArray(dropDef.itemPool) && dropDef.itemPool.length) {
        usedPools.add(dropDef.itemPool); // keyed by array reference
      }
    }
  }

  for (const pool of usedPools) {
    const available = pool.filter((item) => !ownedItemsSet.has(item));
    poolToAvailable.set(pool, available);
  }

  // ================= GENERATE ALL BOXES =================
  for (let i = 1; i <= amount; i++) {
    const { rewards } = generateSingleBox(poolToAvailable);

    boxes[`${i}`] = {
      rewards: sortRewardsByRarity(rewards),
    };

    for (const reward of rewards) {
      if (reward[0] === "item") {
        itemsToGrant.push(reward[1]);
      } else if (reward[0] === "currency") {
        const currencyName = reward[1];
        const amt = reward[2];
        currencyToGrant[currencyName] = (currencyToGrant[currencyName] || 0) + amt;
      }
    }
  }

  // ================= DB UPDATE (fixed merge + max efficiency) =================
  const update = {
    ...(additionalUpdate || {}),
    $inc: additionalUpdate?.$inc ? { ...additionalUpdate.$inc } : {},
  };

  for (const [currency, amount] of Object.entries(currencyToGrant)) {
    const key = `currency.${currency}`;
    update.$inc[key] = (update.$inc[key] || 0) + amount;
  }

  // ================= ATOMIC TRANSACTION =================
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      if (itemsToGrant.length > 0) {
        await SaveUserGrantedItems(userId, itemsToGrant, owneditems, session);
      }
      if (Object.keys(update.$inc).length > 0) {
        await userCollection.updateOne(getUserIdPrefix(userId), update, { session });
      }
    });
  } catch (err) {
    throw new Error("Boxes rewards failed inserting transaction in database");
  } finally {
    await session.endSession();
  }

  return {
    time: Date.now(),
    boxes,
  };
}

// ================= UI HELPER (unchanged) =================
function generateDropTableDescription(dropTable) {
  const lines = [];
  for (const entry of dropTable) {
    const { count, chance, rarities } = entry;
    const rarityParts = Object.entries(rarities)
      .sort((a, b) => b[1] - a[1])
      .map(([rarity, weight]) => `${capitalize(rarity)} ${weight}%`);
    const rarityText = rarityParts.join(", ");
    lines.push(`📦 ${count}-Drop Box (${chance}% chance)\n Rarities: ${rarityText}\n`);
  }
  return lines.join("\n");
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = { generateLootBoxes };
