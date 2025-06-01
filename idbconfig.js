

const { MongoClient, ServerApiVersion } = require("mongodb");
const { UpdateMaintenance } = require("./index");
const { MONGO_URI, TOKEN_KEY, DISCORDWEBHOOK } = require("./ENV")

const lgconnecturi = process.env.MONGO_URI || MONGO_URI
const tokenkey = process.env.TOKEN_KEY || TOKEN_KEY
const webhookURL = process.env.DISCORDWEBHOOK || DISCORDWEBHOOK




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

const db = client.db("Cluster0");
const userCollection = db.collection("users");
const battlePassCollection = db.collection("battlepass_users");
const loginRewardsCollection = db.collection("onetime_rewards");
const shopcollection = db.collection("serverconfig");
const ItemsCertificatesCollection = db.collection("itemsCertificates");


async function startMongoDB() {
    try {
        await client.connect();
       console.log("Connected to MongoDB")

       const result = await shopcollection.findOne(
        { _id: "maintenance" },
        { projection: { status: 1, public_message: 1 } } // Only retrieve the maintenanceStatus field
      );

  

   // userCollection.createIndex({ "account.username": 1, "inventory.items": 1 })



      UpdateMaintenance(result.status, result.public_message)

      global.maintenance = result.status
      global.maintenance_publicinfomessage = result.public_message

    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}


module.exports = {
   uri,
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
   ItemsCertificatesCollection,
}
