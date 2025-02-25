
const { battlePassCollection, userCollection, loginRewardsCollection, shopcollection } = require('./..//idbconfig');
const { rarityPercentages } = require('./..//boxrarityconfig');
const { serverlist, getServerByCountry } = require('./..//serverlist');


async function getUserInventory(username, loginrewardactive) {
    try {
        // Update the last_login field
        await userCollection.updateOne(
            { username },
            {
                $set: { last_login: //Date.now() 
                    Date.now() }
            }
        );

        // Prepare promises for parallel execution
        const promises = [
            userCollection.findOne(
                { username },
                {
                    projection: {
                        nickname: 1,
                        coins: 1,
                        boxes: 1,
                        sp: 1,
                        items: 1,
                        last_collected: 1,
                        coinsnext: 1,
                        hat: 1,
                        top: 1,
                        banner: 1,
                        pose: 1,
                        color: 1,
                        hat_color: 1,
                        top_color: 1,
                        banner_color: 1,
                        gadget: 1,
                        nameupdate: 1,
                        friends: 1,
                        country_code: 1,
                    }
                }
            ),
            battlePassCollection.findOne(
                { username },
                {
                    projection: {
                        currentTier: 1,
                        season_coins: 1,
                        bonusitem_damage: 1,
                    }
                }
            ).catch(() => null), // Handle battle pass collection errors
        ];

        if (loginrewardactive) {
            promises.push(
                loginRewardsCollection.findOne(
                    { username },
                    {
                        projection: {
                            username: 1
                        }
                    }
                ).catch(() => null) // Handle login reward errors
            );
        } else {
            promises.push(Promise.resolve(null));
        }

        promises.push(
            shopcollection.findOne({ _id: "config" }).catch(() => null) // Handle shop collection errors
        );

        // Wait for all promises to resolve
        const [userRow, bpuserRow, onetimeRow, configrow] = await Promise.all(promises);

        if (!userRow) {
            throw new Error("User not found");
        }

        // Get current timestamps
        const currentTimestampInGMT = new Date().getTime();
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const currentTimestamp0am = currentDate.getTime();
        
        // Determine one-time reward
        const onetimereward = loginrewardactive
            ? (onetimeRow ? onetimeRow.username || 0 : 0)
            : 4;

        const slpasstier = bpuserRow ? bpuserRow.currentTier || 0 : 0;
        const season_coins = bpuserRow ? bpuserRow.season_coins || 0 : 0;
        const bonusitem_damage = bpuserRow ? bpuserRow.bonusitem_damage || 0 : 0;

        const inventory = {
            nickname: userRow.nickname || 0,
            username: username,
            coins: userRow.coins || 0,
            boxes: userRow.boxes || 0,
            sp: userRow.sp || 0,
            items: userRow.items || [],
            weapons: userRow.weapons || [],
            loadout: userRow.loadout || [],
            slpasstier,
            season_coins,
            bonusitem_damage,
            last_collected: userRow.last_collected || 0,
            hat: userRow.hat || 0,
            top: userRow.top || 0,
            banner: userRow.banner || 0,
            pose: userRow.pose || 0,
            color: userRow.color || 0,
            hat_color: userRow.hat_color || 0,
            top_color: userRow.top_color || 0,
            banner_color: userRow.banner_color || 0,
            gadget: userRow.gadget || 1,
            server_timestamp: currentTimestampInGMT,
            server_nexttime: currentTimestamp0am,
            lbtheme: configrow ? configrow.lobbytheme : null,
            season_end: configrow ? configrow.season_end : null,
            onetimereward,
            boxrarities: rarityPercentages,
            lastnameupdate: userRow.nameupdate || 0,
            friends: userRow.friends || [],
            requests: userRow.requests || [],
            serverlist,
            nearestRegion: getServerByCountry(userRow.country_code || "Unknown")
        }

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