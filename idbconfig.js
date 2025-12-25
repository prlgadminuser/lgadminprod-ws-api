
const { MongoClient, ServerApiVersion } = require("mongodb");
const { UpdateMaintenance, LZString, UpdateItemShopCached } = require("./index");
const { createChallenge, verifySolution } = require("./accounthandler/security");

const lgconnecturi = process.env.MONGO_URI
const tokenkey = process.env.TOKEN_KEY
const webhookURL = process.env.DISCORDWEBHOOK
const DB_name = process.env.DB_NAME




const nicknameRegex = /^(?!.*[&<>\/\\\s:$.]).{4,16}$/;
const usernameRegex = /^(?!.*[&<>\/\\\s:$.]).{4,16}$/;
const passwordRegex = /^(?!.*[&<>\/\\\s:$.]).{4,20}$/;

const badWords = /\b(undefined|null|liquem|nigga|nigger|niga|fuck|ass|bitch|hure|schlampe|hitler|whore)\b/i;

const uri = lgconnecturi

const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

const db = client.db(DB_name);
const userCollection = db.collection("users");
const userInventoryCollection = db.collection("users_items");
const userWeaponsCollection = db.collection("users_weapons");
const userQuestCollection = db.collection("users_quests");
const userSocialCollection = db.collection("users_social");
const battlePassCollection = db.collection("battlepass_users");
const loginRewardsCollection = db.collection("onetime_rewards");
const shopcollection = db.collection("serverconfig");
const PaymentCollection = db.collection("payments")

//console.log(createChallenge(4))

//const challange = `{"difficulty":4,"salt":"45fc8a49a5e017023ad45e1b888037eb","expiry":1763166498797}.a749d2b63d9282c49e5e0798e09a3ba2048feaa6cddda5d5ce93e416564ddeef`


//console.log(verifySolution(challange, "112426"))




async function startMongoDB() {
    try {
        await client.connect();
       console.log("Connected to MongoDB")

       const result = await shopcollection.findOne(
        { _id: "maintenance" },
        { projection: { status: 1, public_message: 1 } } // Only retrieve the maintenanceStatus field
      );

       const cached_shopdata = await shopcollection.findOne(
        { _id: "ItemShop" }, 
      );




      UpdateMaintenance(result.status, result.public_message)

      global.maintenance = result.status
      global.maintenance_publicinfomessage = result.public_message,
      await UpdateItemShopCached(cached_shopdata);

 
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}


module.exports = {
   uri,
   client,
   tokenkey,
   startMongoDB,
   userCollection,
   db,
   battlePassCollection,
   loginRewardsCollection,
   shopcollection,
   nicknameRegex,
   usernameRegex,
   passwordRegex,
   badWords,
   webhookURL,
   userSocialCollection,
   PaymentCollection,
   userInventoryCollection,
   userWeaponsCollection,
   userQuestCollection,
}
