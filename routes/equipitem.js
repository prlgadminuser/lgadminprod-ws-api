
const { userCollection } = require('./..//idbconfig');

async function equipItem(username, type, itemid) {


    const itemTypeMap = {
        a: "hat",
        b: "top",
        i: "banner",
        p: "pose",
    };

    const itemType = itemTypeMap[type.toLowerCase()];

    if (!itemType) {
        throw new Error("Invalid item type");
    }

    // Allow itemid "0" to always be equipped
    if (itemid === "0") {
        try {
            await userCollection.updateOne(
                { username },
                { $set: { [itemType]: itemid } }
            );
            return { message: "Success" };
        } catch (error) {
            throw new Error("Error while equipping item");
        }
    }

    try {
        // Check if the user has the item
        //const user = await userCollection.findOne(
       //     { username, items: { $elemMatch: { $eq: itemid } } }  // this might be unecessary cause its used for checking if multiple fields exist
       // );

       const ItemIsOwned = await userCollection.findOne({ username, items: itemid });

        if (!ItemIsOwned) {
            throw new Error("Item is not valid");
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
    equipItem,
};
