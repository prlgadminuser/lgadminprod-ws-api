const { userCollection } = require("./../idbconfig");

const item_own_check_local = true;

const itemTypeMap = {
  A: "hat",
  B: "top",
  I: "banner",
  P: "pose", // Assuming 'p' stands for pose (or other item)
};

async function equipItem(username, itemtype, itemid, owneditems) {
  // Allow itemid "0" to always be equipped (assuming this is a default item)

  const itemType = itemTypeMap[itemtype];

  if (!itemType) {
    throw new Error("Invalid item type.");
  }

  if (itemid === "0") {
    try {
      await userCollection.updateOne(
        { "account.username": username },
        { $set: { [`equipped.${itemtype}`]: itemid } } // Update item under 'equipped'
      );
      return { message: "success" };
    } catch (error) {
      throw new Error("Error while equipping item.");
    }
  }

  try {
    const itemType = itemTypeMap[itemid[0]];

    if (!itemType) {
      throw new Error("Invalid item type.");
    }

    const ItemIsOwned = owneditems.has(itemid);

    if (!ItemIsOwned) {
      throw new Error("Item is not valid or not owned.");
    }

    // Equip the item by updating the corresponding field in the 'equipped' section
    await userCollection.updateOne(
      { "account.username": username },
      { $set: { [`equipped.${itemType}`]: itemid } }
    );

    return { id: itemid, message: "Item equipped successfully." };
  } catch (error) {
    throw new Error("Error equipping item: " + error.message);
  }
}

module.exports = {
  equipItem,
};
