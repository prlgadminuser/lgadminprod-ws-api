const { userCollection } = require("./..//idbconfig");

const allowed_weapons = new Set([
  "1", "2", "3", "4"
]);

const allowed_gadgets = new Set([
  "1", "2", "3"
]);

const loadout_allowed_items = {
weapons: Array.from(allowed_weapons),
gadgets: Array.from(allowed_gadgets) 
}


async function equipWeapon(username, slot, weaponid) {
  try {
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

    if (!allowed_weapons.has(weaponid)) throw new Error("Item is not valid.");

    await userCollection.updateOne(
      { "account.username": username },
      { $set: { [`inventory.loadout.slot${slot}`]: weaponid } } 
    );

    return { message: "Weapon equipped successfully.", weaponid }; 
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

    if (!allowed_gadgets.has(gadgetid)) throw new Error("Item is not valid.");

    await userCollection.updateOne(
      { "account.username": username }, 
      { $set: { [`inventory.loadout.gadget`]: gadgetid } } 
    );

    return { message: "Gadget equipped successfully.", gadgetid }; 
  } catch (error) {
    throw new Error(`Error equipping gadget: ${error.message || error}`);
  }
}


module.exports = {
  equipWeapon,
  equipGadget,
  loadout_allowed_items,
};

