const { userCollection, userInventoryCollection, userWeaponsCollection, client } = require("./../idbconfig");

const WeaponsToBuy = new Map([
  ["4", 500],
]);

const StarterWeapons = [1,2,3];

const currency = "coins";


function weapon_defaultstats(username, weaponId) {

  return {
    uid: username,
    wid: weaponId,
    level: 1,
    equipped_ability: 0,
    unlocked: [],
  };
}


async function InsertStarterWeaponsData(username, session) {
  try {
 
   const WeaponIdsToInsert = [];
    const WeaponsDataToInsert = [];
   
    for (const weaponId of StarterWeapons) {
      WeaponIdsToInsert.push({
        uid: username,
        id: weaponId,
        ts: Date.now(),
      })

      WeaponsDataToInsert.push(weapon_defaultstats(username, weaponId));
    }

    // Insert inventory + weapons
    if (WeaponIdsToInsert .length > 0) {
      await userInventoryCollection.insertMany(WeaponIdsToInsert, { session });
    }
    if (WeaponsDataToInsert.length > 0) {
      await userWeaponsCollection.insertMany(WeaponsDataToInsert, { session });
    }

    return { message: "Account created successfully with all starter weapons.", username };
  } catch (err) {
    throw new Error(err.message || "Failed to create user account.");
  }
}





async function buyWeapon(username, weaponId, ownedItems) {
  try {
    // Validate weapon ID
    if (!WeaponsToBuy.has(weaponId)) {
      throw new Error("Invalid weapon ID.");
    }

    const price = WeaponsToBuy.get(weaponId);

    // Check if the user already owns the weapon
    const itemIsOwned = ownedItems.has(weaponId);
    if (itemIsOwned) {
      throw new Error("You already own this weapon.");
    }

    // Fetch user's balance
    const userRow = await userCollection.findOne(
      { "account.username": username },
      { projection: { [`currency.${currency}`]: 1 } }
    );

    if (!userRow) {
      throw new Error("User not found.");
    }

    if ((userRow.currency?.[currency] || 0) < price) {
      throw new Error(`Not enough ${currency} to buy the weapon.`);
    }

    // Prepare weapon data
    const weaponUserInventory = {
      uid: username,
      id: weaponId,
      ts: Date.now(), // Unique timestamp
    };

    const weapondata = weapon_defaultstats(username, weaponId)

    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        // Insert weapon into user's inventory
        await userInventoryCollection.insertOne(weaponUserInventory, { session });
        await userWeaponsCollection.insertOne(weapondata, { session });
        // Deduct the user's balance
        await userCollection.updateOne(
          { "account.username": username },
          { $inc: { [`currency.${currency}`]: -price } },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    ownedItems.add(weaponId);

    return {
      message: "Weapon purchased successfully.",
    };
  } catch (error) {
    throw new Error(
      error.message || "An error occurred while processing your request."
    );
  }
}

module.exports = {
  buyWeapon,
  WeaponsToBuy,
  InsertStarterWeaponsData
};
