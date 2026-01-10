const { userCollection } = require("../..//idbconfig");
const { getUserIdPrefix } = require('../../utils/utils');

const itemTypeMap = {
  HAT: "hat",
  TOP: "top",
  BANNER: "banner",
  POSE: "pose", // Assuming 'p' stands for pose (or other item)
};

async function equipItem(userId, itemtype, itemid, owneditems) {
  try {
    // Validate provided item type
    const mappedType = itemTypeMap[itemtype];
    if (!mappedType) {
      throw new Error("Invalid item type.");
    }

    // If equipping default item "0"
    if (itemid === "0") {
      await userCollection.updateOne(
         getUserIdPrefix(userId),
        { $set: { [`equipped.${mappedType}`]: itemid } }
      );
      return { message: "success" };
    }

    // Determine actual item type from item ID (first character)
    const itemTypeFromId = itemTypeMap[itemid.split(":")[0]];
    if (!itemTypeFromId) {
      throw new Error("Invalid item type.");
    }

    // Verify the user owns the item
    if (!owneditems.has(itemid)) {
      throw new Error("Item is not valid or not owned.");
    }

    // Equip item
    await userCollection.updateOne(
       getUserIdPrefix(userId),
      { $set: { [`equipped.${itemTypeFromId}`]: itemid } }
    );

    return { id: itemid, message: "Item equipped successfully." };

  } catch (error) {
    throw new Error("Error equipping item: " + error.message);
  }
}


module.exports = {
  equipItem,
};
