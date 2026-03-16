const { rarityConfig } = require("../../boxrarityconfig");
const { SaveUserGrantedItems } = require("../../utils/utils");
const { userCollection, client } = require("../..//idbconfig");
const { getUserIdPrefix } = require("../../utils/utils");

// ================= CONFIG =================

const RARITY_ORDER = { common: 1, rare: 2, epic: 3, legendary: 4 };

const DROP_COUNT_TABLE = [
  { count: 5, chance: 85, rarities: { common: 65, rare: 25, epic: 8, legendary: 2 } },
  { count: 6, chance: 7, rarities: { common: 55, rare: 30, epic: 12, legendary: 3 } },
  { count: 7, chance: 4, rarities: { common: 40, rare: 35, epic: 18, legendary: 7 } },
  { count: 8, chance: 2, rarities: { rare: 45, epic: 35, legendary: 20 } },
  { count: 9, chance: 1.5, rarities: { epic: 60, legendary: 40 } },
  { count: 10, chance: 0.5, rarities: { legendary: 100 } },
];

const LOOTBOX_POOL = [
  { rarity: "common", drops: [{ type: "currency", name: "coins", min: 5, max: 15, chance: 100 }] },
  { rarity: "rare", drops: [
      { type: "currency", name: "coins", min: 15, max: 30, chance: 60 },
      { type: "currency", name: "diamonds", min: 2, max: 5, chance: 40 },
      { type: "item", itemPool: rarityConfig.rare1?.customItems || [], chance: 50 },
  ]},
  { rarity: "epic", drops: [
      { type: "currency", name: "coins", min: 30, max: 60, chance: 50 },
      { type: "currency", name: "diamonds", min: 4, max: 8, chance: 50 },
      { type: "item", itemPool: rarityConfig.rare2?.customItems || [], chance: 50 },
  ]},
  { rarity: "legendary", drops: [
      { type: "currency", name: "coins", min: 60, max: 120, chance: 50 },
      { type: "item", itemPool: rarityConfig.rare2?.customItems || [], chance: 50 },
  ]},
];

// ================= FAST LOOKUPS =================

const RARITY_MAP = Object.fromEntries(LOOTBOX_POOL.map(r => [r.rarity, r]));

// ================= HELPERS =================

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Precompute cumulative weights for O(1) weighted roll
function weightedRoll(pool) {
  const cumulative = [];
  let sum = 0;
  for (const entry of pool) {
    sum += entry.chance;
    cumulative.push(sum);
  }
  const roll = Math.random() * sum;
  for (let i = 0; i < cumulative.length; i++) {
    if (roll < cumulative[i]) return pool[i];
  }
  return pool[pool.length - 1];
}

function rollDropProfile() {
  return weightedRoll(DROP_COUNT_TABLE);
}

function rollRarity(rarityWeights) {
  const entries = Object.entries(rarityWeights).map(([r, w]) => ({ rarity: r, chance: w }));
  return weightedRoll(entries).rarity;
}

function sortRewardsByRarity(rewards) {
  return rewards.sort((a, b) => {
    const diff = (RARITY_ORDER[a[a.length - 1]] || 0) - (RARITY_ORDER[b[b.length - 1]] || 0);
    if (diff) return diff;
    if (a[0] === "currency" && b[0] === "currency") return a[2] - b[2];
    return 0;
  });
}

// ================= BUILD AVAILABLE ITEM POOLS =================

// Precompute available pools once
function buildAvailablePools(ownedItemsSet) {
  const pools = {};
  for (const rarityGroup of LOOTBOX_POOL) {
    for (const drop of rarityGroup.drops) {
      if (drop.type !== "item") continue;
      const rarity = rarityGroup.rarity;
      const filtered = (drop.itemPool || []).filter(item => !ownedItemsSet.has(item));
      if (!pools[rarity]) pools[rarity] = [];
      pools[rarity].push(...filtered);
    }
  }
  return pools;
}

// ================= SINGLE BOX =================

function generateSingleBox(availablePools, grantedThisRun) {
  const rewards = [];
  const profile = rollDropProfile();
  const dropCount = profile.count;

  for (let i = 0; i < dropCount; i++) {
    const rarityName = rollRarity(profile.rarities);
    const rarityGroup = RARITY_MAP[rarityName];

    if (!rarityGroup || !rarityGroup.drops.length) {
      rewards.push(["currency", "coins", randomInt(5, 15), "common"]);
      continue;
    }

    const dropDef = weightedRoll(rarityGroup.drops);

    if (dropDef.type === "currency") {
      const amount = randomInt(dropDef.min, dropDef.max);
      rewards.push(["currency", dropDef.name, amount, rarityGroup.rarity]);
      continue;
    }

    // ===== ITEM =====
    const pool = availablePools[rarityGroup.rarity];
    if (!pool || pool.length === 0) {
      // Fallback to currency for duplicates
      rewards.push(["currency", "coins", randomInt(5, 15), "common"]);
      continue;
    }

    // Random pop from pool O(1)
    const idx = randomInt(0, pool.length - 1);
    const selected = pool[idx];
    pool.splice(idx, 1); // remove to prevent duplicates
    grantedThisRun.add(selected);
    rewards.push(["item", selected, rarityGroup.rarity]);
  }

  return { dropCount, rewards };
}

// ================= MAIN API =================

async function generateLootBoxes(amount, userId, owneditems) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("Invalid lootbox amount.");

  const ownedItemsSet = owneditems;
  const grantedThisRun = new Set();
  const availablePools = buildAvailablePools(ownedItemsSet);

  const boxes = {};
  const itemsToGrant = [];
  const currencyToGrant = {};

  for (let i = 1; i <= amount; i++) {
    const { rewards } = generateSingleBox(availablePools, grantedThisRun);
    boxes[i] = { rewards: sortRewardsByRarity(rewards) };

    for (const reward of rewards) {
      if (reward[0] === "item") itemsToGrant.push(reward[1]);
      if (reward[0] === "currency") {
        currencyToGrant[reward[1]] = (currencyToGrant[reward[1]] || 0) + reward[2];
      }
    }
  }

  const update = { $inc: {} };
  for (const [currency, amount] of Object.entries(currencyToGrant)) update.$inc[`currency.${currency}`] = amount;

  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      if (itemsToGrant.length) await SaveUserGrantedItems(userId, itemsToGrant, owneditems, session);
      if (Object.keys(update.$inc).length) await userCollection.updateOne(getUserIdPrefix(userId), update, { session });
    });
  } finally {
    await session.endSession();
  }

  return { time: Date.now(), boxes };
}

module.exports = { generateLootBoxes };