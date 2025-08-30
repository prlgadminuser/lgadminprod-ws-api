const { userCollection } = require("./..//idbconfig");

const allowed_weapons = new Set([
  "1", "2", "3"
]);

const allowed_gadgets = new Set([
  "1", "2", "3"
]);

async function equipWeapon(username, slot, weaponid) {
  try {
    // Validate the slot and weaponid
    if (!slot || !(slot >= 1 && slot <= 3)) {
      throw new Error(
        "Invalid position in loadout. Slot must be between 1 and 3."
      );
    }

    if (!weaponid || weaponid.length > 5) {
      throw new Error(
        "Invalid weapon ID. Weapon ID should not exceed 5 characters."
      );
    }

    if (!allowed_weapons.has(weaponid))  throw new Error("Item is not valid.") 
  
    await userCollection.updateOne(
      { "account.username": username }, // Filter by username
      { $set: { [`inventory.loadout.slot${slot}`]: weaponid } } // Dynamically update the correct loadout slot
    );

    return { message: "Weapon equipped successfully.", weaponid }; // Return success message with the weapon ID
  } catch (error) {
    throw new Error(`Error equipping weapon: ${error.message || error}`);
  }
}




async function equipGadget(username, gadgetid) {
  try {

    if (!gadgetid || gadgetid.length > 5) {
      throw new Error(
        "Invalid gadget ID. gadget ID should not exceed 5 characters."
      );
    }

    if (!allowed_gadgets.has(gadgetid))  throw new Error("Item is not valid.") 
  
    await userCollection.updateOne(
      { "account.username": username }, // Filter by username
      { $set: { [`inventory.loadout.gadget`]: gadgetid } } // Dynamically update the correct loadout slot
    );

    return { message: "Gadget equipped successfully.", gadgetid }; // Return success message with the weapon ID
  } catch (error) {
    throw new Error(`Error equipping gadget: ${error.message || error}`);
  }
}


module.exports = {
  equipWeapon,
  equipGadget,
};
