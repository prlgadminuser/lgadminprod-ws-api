
const { userCollection } = require('./..//idbconfig');

async function equipWeapon(username, type, itemid) {

    const itemTypeMap = {
        w: "weapon",
    };

    const itemType = itemTypeMap[type.toLowerCase()];

    if (!itemType) {
        throw new Error("Invalid item type");
    }
   

    try {

       const firstLetter = itemid[0].toLowerCase();
        if (firstLetter !== type.toLowerCase()) {
        throw new Error("Item type does not match itemid");
        }

       const ItemIsOwned = await userCollection.findOne({ username, items: { $elemMatch: { $eq: itemid } }});

        if (!ItemIsOwned) {
            throw new Error("Item is not valid");
        }

        if (!itemType) {
            throw new Error("Invalid item type");
        }

        // Equip the item by updating the corresponding field
        await userCollection.updateOne(
            { username },
            { $set: { [itemType]: itemid } }
        );

        return { id: itemid };
    } catch (error) {
        throw new Error("Error equipping item");
    }

}

module.exports = {
    equipWeapon,
};
