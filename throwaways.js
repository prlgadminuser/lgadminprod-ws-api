async function InsertStarterWeapons(username, session) {
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
      await userItemsCollection.insertMany(WeaponIdsToInsert, { session });
    }
    if (WeaponsDataToInsert.length > 0) {
      await userWeaponsCollection.insertMany(WeaponsDataToInsert, { session });
    }

    return { message: "Account created successfully with all starter weapons.", username };
  } catch (err) {
    throw new Error(err.message || "Failed to create user account.");
  }
}
