const { userCollection } = require('./..//idbconfig');

async function equipWeapon(username, slot, weaponid) {
  try {
    // Validate the slot and weaponid
    if (!slot || !(slot >= 1 && slot <= 3)) {
      throw new Error("Invalid position in loadout. Slot must be between 1 and 3.");
    }

    if (!weaponid || weaponid.length > 5) {
      throw new Error("Invalid weapon ID. Weapon ID should not exceed 5 characters.");
    }

    // Check if the user owns the weapon
    const ItemIsOwned = await userCollection.findOne({ username, weapons: { $in: [weaponid] } });

    if (!ItemIsOwned) {
      throw new Error("Item is not valid. User does not own the specified weapon.");
    }

    // Update the user's loadout with the new weapon in the specified slot
    await userCollection.updateOne(
      { username }, // Filter by username
      { $set: { [`loadout.${slot}`]: weaponid } } // Dynamically update the correct loadout slot
    );

    return { message: "Weapon equipped successfully.", weaponid }; // Return success message with the weapon ID
  } catch (error) {
    throw new Error(`Error equipping weapon: ${error.message || error}`);
  }
}

module.exports = {
  equipWeapon,
};
