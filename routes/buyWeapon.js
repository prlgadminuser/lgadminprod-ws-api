const { userCollection } = require('./..//idbconfig');

const WeaponsToBuy = {
    "4": 500,
};

async function buyWeapon(username, weaponid) {
    try {

        if (!WeaponsToBuy.hasOwnProperty(weaponid)) {
            throw new Error("Invalid weapon ID.");
        }

        const price = WeaponsToBuy[weaponid];
        const currency = "coins"; // Assuming balance is stored under this key

        // Check if the user already owns the weapon
        const ItemIsOwned = await userCollection.findOne({ username, weapons: { $in: [weaponid] } });
        if (ItemIsOwned) {
            throw new Error("You already own this weapon.");
        }

        // Fetch the user's balance
        const userRow = await userCollection.findOne(
            { username },
            { projection: { [currency]: 1 } } 
        );

        if (!userRow) {
            throw new Error("User not found.");
        }

        if ((userRow[currency] || 0) < price) {
            throw new Error(`Not enough ${currency} to buy the offer.`);
        }

        // Update the user's balance and add the weapon
        let updateFields = {
            $addToSet: { weapons: weaponid }, 
            $inc: { [currency]: -price }
        };

        await userCollection.updateOne({ username }, updateFields);

        return {
            message: "success",
        };
    } catch (error) {
        throw new Error(error.message || "An error occurred while processing your request.");
    }
}

module.exports = {
    buyWeapon,
    WeaponsToBuy
};
