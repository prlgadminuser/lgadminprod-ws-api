const { userCollection } = require('./../idbconfig');

async function equipItem(username, type, itemid) {
    const itemTypeMap = {
        a: "hat",
        b: "top",
        i: "banner",
        p: "pose",  // Assuming 'p' stands for pose (or other item)
    };

    const itemType = itemTypeMap[type.toLowerCase()];

    if (!itemType) {
        throw new Error("Invalid item type.");
    }

    // Allow itemid "0" to always be equipped (assuming this is a default item)
    if (itemid === "0") {
        try {
            await userCollection.updateOne(
                { "account.username": username },
                { $set: { [`equipped.${itemType}`]: itemid } }  // Update item under 'equipped'
            );
            return { message: "Success" };
        } catch (error) {
            throw new Error("Error while equipping item.");
        }
    }

    try {
        // Check if the user owns the item (this assumes items are stored in 'items' array)
        const ItemIsOwned = await userCollection.findOne({
            "account.username": username,
            "inventory.items": itemid  // Check if the item exists in the 'items' array under inventory
        });

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
