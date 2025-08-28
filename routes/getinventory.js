const { battlePassCollection, userCollection, userInventoryCollection, shopcollection, userWeaponsCollection } = require('./../idbconfig');
const { FIXED_OFFERS } = require('./../paystation');
const { rarityPercentages } = require('./../boxrarityconfig');
const { serverlist, getServerByCountry } = require('./../serverlist');
const { WeaponsToBuy } = require('./buyWeapon');
const { RealMoneyPurchasesEnabled } = require('./../index');


async function getPlayerItems(username) {

    const itemDocuments = await userInventoryCollection.find(
        { uid: username },
        { projection: { id: 1, _id: 0 } } // Project only the itemId field and exclude the _id
    )
    .limit(100)
    //.hint("player_item_unique")
    .hint("player_unique_sorted")
    .toArray();

    const itemIdsArray = itemDocuments.map(doc => doc.id);
    return itemIdsArray
   
}

async function getPlayerWeaponsData(username) {
    const itemDocuments = await userWeaponsCollection.find(
        { uid: username }, // filter
        { projection: { _id: 0, uid: 0 } } // exclude _id
    )
    .limit(100)
    //.hint("player_item_unique")
    .hint("weaponindex")
    .toArray();

    return itemDocuments;
}


//getPlayerItems("Lique")
 //.then(items => {
  // console.log("Player items:", items);
//})


   

async function getUserInventory(username) {
    try {
        // Prepare promises for parallel execution
        const promises = [
            await userCollection.findOneAndUpdate(
                { "account.username": username },
                { $set: { "account.last_login": Date.now() } },
                {
                  //  returnDocument: "after", // Return the document after update
                    projection: {
                        "account": 1,
                        "equipped": 1,
                        "currency": 1,
                        "inventory": 1,
                        "stats.sp": 1,
                    },
                    hint: "account.username_1"
                }
            ),
            
             ];

        promises.push(
            await battlePassCollection.findOne(
                { username },
                {
                    projection: {
                        ss_passtier: 1,
                        ss_coins: 1,
                        ss_damage: 1,
                    }
                }
            ).catch(() => null), // Handle battle pass collection errors
        );


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


        const season_passtier = bpuserRow ? bpuserRow.ss_passtier || 0 : 0;
        const season_coins = bpuserRow ? bpuserRow.ss_coins || 0 : 0;
        const bonusitem_damage = bpuserRow ? bpuserRow.ss_damage || 0 : 0;

        const userInventory = await getPlayerItems(username)
        const userWeaponData = await getPlayerWeaponsData(username)

        const skillpassdata = {
         tier: season_passtier,
         bucks: season_coins,
         season_damage: bonusitem_damage
        }
          

        const inventory = {
            nickname: userRow.account.nickname,
            username: username,
            coins: userRow.currency.coins,
            boxes: userRow.currency.boxes,
            sp: userRow.stats.sp,
            items: userInventory,
            skillpass: skillpassdata,
            weapons: userRow.inventory.weapons,
            weapondata: userWeaponData,
            loadout: userRow.inventory.loadout,
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
            in_app_purchases: RealMoneyPurchasesEnabled ? FIXED_OFFERS : "disabled" ,
        };
  
        // Return the constructed object
        return inventory;
      //  })
    } catch (error) {
        // Catch and rethrow errors with additional context
        throw new Error(`Failed to get user inventory: ${error.message}`);
        
    }
   
}

module.exports = {
    getUserInventory,
};
