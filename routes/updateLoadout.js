
const { userCollection } = require('./..//idbconfig');

async function equipWeapon(username, key, weaponid) {
    try {

    if (!key || !weaponid || ![1, 2, 3].includes(key)) {
        throw new Error("invalid position in loadout");
    }
    
    if (weaponid.length > 5) {
        throw new Error("weaponid is too large");
    }


      const ItemIsOwned = await userCollection.findOne({ username, items: { $in: [weaponid] } });

        if (!ItemIsOwned) {
            throw new Error("Item is not valid");
        }


        await userCollection.updateOne(
            { username }, // Filter by username
            { $set: { [`loadout.${key}`]: weaponid } } // Dynamically update the correct loadout key
        );

        return { id: weaponid };

    } catch (error) {
        throw new Error("Error equipping item");
  }
}


module.exports = {
    equipWeapon,
};
