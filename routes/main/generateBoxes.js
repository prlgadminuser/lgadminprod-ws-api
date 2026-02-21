const { rarityConfig } = require("../../boxrarityconfig");
const { SaveUserGrantedItems } = require("../../utils/utils");
const { userCollection, client } = require("../..//idbconfig");
const { getUserIdPrefix } = require("../../utils/utils");

// ================= DROP COUNT SYSTEM =================
// Drop count now also defines allowed rarities
const DROP_COUNT_TABLE = [
  {
    count: 5,   // normal box
    chance: 85,
    rarities: {
      common: 65,
      rare: 25,
      epic: 8,
      legendary: 2,
    },
  },

  {
    count: 6,
    chance: 7,
    rarities: {
      common: 55,
      rare: 30,
      epic: 12,
      legendary: 3,
    },
  },

  {
    count: 7,
    chance: 4,
    rarities: {
      common: 40,
      rare: 35,
      epic: 18,
      legendary: 7,
    },
  },

  {
    count: 8,
    chance: 2,
    rarities: {
      rare: 45,        // ❌ common removed
      epic: 35,
      legendary: 20,
    },
  },

  {
    count: 9,
    chance: 1.5,
    rarities: {
      epic: 60,        // ❌ common + rare removed
      legendary: 40,
    },
  },

  {
    count: 10,  // ultra rare box
    chance: 0.5,
    rarities: {
      legendary: 100,  // ❌ everything else removed
    },
  },
];
// ================= LOOT POOL =================

const LOOTBOX_POOL = [
  {
    rarity: "common",
    drops: [
      { type: "currency", name: "coins", min: 5, max: 15, chance: 100 },
    ],
  },

  {
    rarity: "rare",
    drops: [
      { type: "currency", name: "coins",    min: 15, max: 30, chance: 60 },
      { type: "currency", name: "diamonds", min: 2,  max: 5,  chance: 40 },
      { type: "item", itemPool: rarityConfig.rare1?.customItems || [], chance: 50 },
    ],
  },

  {
    rarity: "epic",
    drops: [
      { type: "currency", name: "coins",    min: 30, max: 60, chance: 50 },
      { type: "currency", name: "diamonds", min: 4,  max: 8,  chance: 50 },
      { type: "item", itemPool: rarityConfig.rare2?.customItems || [], chance: 50 },
    ],
  },

  {
    rarity: "legendary",
    drops: [
      { type: "currency", name: "coins",    min: 60,  max: 120, chance: 40 },
     // { type: "currency", name: "diamonds", min: 8,   max: 15,  chance: 60 },
      { type: "item", itemPool: rarityConfig.rare2?.customItems || [], chance: 50 },
    ],
  },
];

// ================= HELPERS =================

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomFromArray = (arr) =>
  arr[Math.floor(Math.random() * arr.length)];

function weightedRoll(pool) {
  const total = pool.reduce((s, r) => s + r.chance, 0);
  let roll = Math.random() * total;

  for (const entry of pool) {
    roll -= entry.chance;
    if (roll <= 0) return entry;
  }

  return pool[pool.length - 1];
}

// ================= DROP PROFILE =================

function rollDropProfile() {
  const total = DROP_COUNT_TABLE.reduce((s, r) => s + r.chance, 0);
  let roll = Math.random() * total;

  for (const entry of DROP_COUNT_TABLE) {
    roll -= entry.chance;
    if (roll <= 0) return entry;
  }

  return DROP_COUNT_TABLE[0];
}

function rollRarity(rarityWeights) {
  const entries = Object.entries(rarityWeights);
  const total = entries.reduce((s,[,w]) => s + w, 0);
  let roll = Math.random() * total;

  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }

  return entries[0][0];
}

// ================= SINGLE BOX =================

function generateSingleBox(ownedItemsSet, alreadyGrantedThisClaim) {
  const rewards = [];

  const profile = rollDropProfile(); // { count, rarities }
  const dropCount = profile.count;

  for (let i = 0; i < dropCount; i++) {

    // filter by allowed rarities from drop profile
      const rarityName = rollRarity(profile.rarities);

  const rarityGroup = LOOTBOX_POOL.find(r => r.rarity === rarityName);

    if (!rarityGroup || !rarityGroup.drops || rarityGroup.drops.length === 0) {
      rewards.push(["currency", "coins", randomInt(5, 15), "common"]);
      continue;
    }

    const dropDef = weightedRoll(rarityGroup.drops);

    // ===== CURRENCY =====
    if (dropDef.type === "currency") {
      const amount = randomInt(dropDef.min, dropDef.max);
      rewards.push([
        "currency",
        dropDef.name,
        amount,
        rarityGroup.rarity
      ]);
      continue;
    }

    // ===== ITEM =====
    if (dropDef.type === "item") {
      const pool = dropDef.itemPool || [];

      if (pool.length === 0) {
        rewards.push(["currency", "coins", randomInt(5, 15), "common"]);
        continue;
      }

      const available = pool.filter(
        item =>
          !ownedItemsSet.has(item) &&
          !alreadyGrantedThisClaim.has(item)
      );

      if (available.length === 0) {
        rewards.push(["currency", "coins", randomInt(5, 15), "common"]);
        continue;
      }

      const selected = randomFromArray(available);
      alreadyGrantedThisClaim.add(selected);

      rewards.push(["item", selected, rarityGroup.rarity]);
    }
  }

  return {
    dropCount,
    rewards,
  };
}

// ================= MAIN API =================

async function generateLootBoxes(amount, userId, owneditems) {
  if (!Number.isInteger(amount) || amount <= 0)
    throw new Error("Invalid lootbox amount.");

  const ownedItemsSet = owneditems;
  const alreadyGrantedThisClaim = new Set();

  const boxes = {};
  const itemsToGrant = [];
  const currencyToGrant = {};

  for (let i = 1; i <= amount; i++) {
    const { dropCount, rewards } = generateSingleBox(
      ownedItemsSet,
      alreadyGrantedThisClaim
    );

    boxes[`box${i}`] = {
      drops: dropCount,
      rewards,
    };

    for (const reward of rewards) {
      if (reward[0] === "item") {
        itemsToGrant.push(reward[1]);
      }

      if (reward[0] === "currency") {
        const currencyName = reward[1];
        const amount = reward[2];

        if (!currencyToGrant[currencyName]) {
          currencyToGrant[currencyName] = 0;
        }

        currencyToGrant[currencyName] += amount;
      }
    }
  }

  // ================= DB UPDATE =================

  const update = { $inc: {} };

  for (const [currency, amount] of Object.entries(currencyToGrant)) {
    update.$inc[`currency.${currency}`] = amount;
  }

  // ================= TRANSACTION =================

  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      if (itemsToGrant.length > 0) {
        await SaveUserGrantedItems(userId, itemsToGrant, owneditems, session);
      }

      if (Object.keys(update.$inc).length > 0) {
        await userCollection.updateOne(
          getUserIdPrefix(userId),
          update,
          { session }
        );
      }
    });
  } catch (err) {

   // console.log(JSON.stringify(err))

   throw new Error("Boxes rewards failed inserting transaction in database")

  } finally {
    await session.endSession();
  }

 const response =   {
  time: Date.now(),
    boxes,
  //  summary: {
   //   items: itemsToGrant.length,
   //   currency: currencyToGrant,
   // },
  };

  return response
}




function generateDropTableDescription(dropTable) {
  const lines = [];

  for (const entry of dropTable) {
    const { count, chance, rarities } = entry;

    const rarityParts = Object.entries(rarities)
      .sort((a, b) => b[1] - a[1]) // highest chance first
      .map(([rarity, weight]) => {
        return `${capitalize(rarity)} ${weight}%`;
      });

    const rarityText = rarityParts.join(", ");

    lines.push(
      `📦 ${count}-Drop Box (${chance}% chance)\n` +
      `   Rarities: ${rarityText}\n`
    );
  }

  return lines.join("\n");
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

//console.log(generateDropTableDescription(DROP_COUNT_TABLE))


module.exports = { generateLootBoxes };