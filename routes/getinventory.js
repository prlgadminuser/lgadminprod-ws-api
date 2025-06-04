const { battlePassCollection, userCollection, loginRewardsCollection, shopcollection } = require('./../idbconfig');
const { rarityPercentages } = require('./../boxrarityconfig');
const { serverlist, getServerByCountry } = require('./../serverlist');
const { WeaponsToBuy } = require('./buyWeapon');

async function getUserInventory(username) {
    try {
        // Prepare promises for parallel execution
        const promises = [
            await userCollection.findOneAndUpdate(
                { "account.username": username },
                { $set: { "account.last_login": Date.now() } },
                {
                    returnDocument: "after", // Return the document after update
                    projection: {
                        "account": 1,
                        "equipped": 1,
                        "currency": 1,
                        "inventory": 1,
                        "stats.sp": 1,
                    },
                }
            ),
            battlePassCollection.findOne(
                { "account.username": username },
                {
                    projection: {
                        currentTier: 1,
                        season_coins: 1,
                        bonusitem_damage: 1,
                    }
                }
            ).catch(() => null), // Handle battle pass collection errors
        ];


        promises.push(
            shopcollection.findOne({ _id: "config" }).catch(() => null) // Handle shop collection errors
        );

        // Wait for all promises to resolve
        const [userRow, bpuserRow, configrow] = await Promise.all(promises);

        if (!userRow) {
            throw new Error("User not found");
        }

        // Get current timestamps
        const currentTimestampInGMT = new Date().getTime();
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const currentTimestamp0am = currentDate.getTime();


        const slpasstier = bpuserRow ? bpuserRow.currentTier || 0 : 0;
        const season_coins = bpuserRow ? bpuserRow.season_coins || 0 : 0;
        const bonusitem_damage = bpuserRow ? bpuserRow.bonusitem_damage || 0 : 0;

        const inventory = {
            nickname: userRow.account.nickname,
            username: username,
            coins: userRow.currency.coins,
            boxes: userRow.currency.boxes,
            sp: userRow.stats.sp,
            items: userRow.inventory.items,
            weapons: userRow.inventory.weapons,
            loadout: userRow.inventory.loadout,
            slpasstier,
            season_coins,
            bonusitem_damage,
            last_collected: userRow.inventory.last_collected || 0,
            hat: userRow.equipped.hat || 0,
            top: userRow.equipped.top || 0,
            banner: userRow.equipped.banner || 0,
            pose: userRow.equipped.pose || 0,
            color: userRow.equipped.color || 0,
            hat_color: userRow.equipped.hat_color,
            top_color: userRow.equipped.top_color,
            banner_color: userRow.equipped.banner_color,
            gadget: userRow.account.gadget || 1,
            server_timestamp: currentTimestampInGMT,
            server_nexttime: currentTimestamp0am,
            lbtheme: configrow ? configrow.lobbytheme : null,
            season_end: configrow ? configrow.season_end : null,
            boxrarities: rarityPercentages,
            lastnameupdate: userRow.account.nameupdate || 0,
            //  friends: userRow.social.friends || [],
            // requests: userRow.social.requests || [],
            serverlist,
            nearestRegion: getServerByCountry(userRow.account.country_code || "Unknown"),
            weaponcatalog: WeaponsToBuy,
        };

        // Return the constructed object
        return inventory;
    } catch (error) {
        // Catch and rethrow errors with additional context
        throw new Error(`Failed to get user inventory: ${error.message}`);
    }
}

module.exports = {
    getUserInventory,
};
