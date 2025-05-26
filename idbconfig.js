
const password = process.env.DB_KEY || "8RLj5Vr3F6DRBAYc"
const encodedPassword = encodeURIComponent(password);
const { MongoClient, ServerApiVersion } = require("mongodb");
const { maintenanceMode } = require("./index");


const tokenkey = "d8ce40604d359eeb9f2bff31beca4b4b"
const webhookURL = "https://discord.com/api/webhooks/1320922981161107528/KQ_m66iOVDJeXCfSgXX1El9qcsTNC2EKj5d1HZZXiD5pLfPofF5Rb0-QV3MoWgDIaK8_"
const lgconnecturi = `mongodb+srv://Liquem:${encodedPassword}@cluster0.ed4zami.mongodb.net/?retryWrites=true&w=majority`;




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
const ItemsCertificatesCollection = db.collection("ItemsCertificates");
const battlePassCollection = db.collection("battlepass_users");
const loginRewardsCollection = db.collection("onetime_rewards");
const shopcollection = db.collection("serverconfig");


async function startMongoDB() {
    try {
        await client.connect();
       console.log("Connected to MongoDB")

       const result = await shopcollection.findOne(
        { _id: "maintenance" },
        { projection: { status: 1 } } // Only retrieve the maintenanceStatus field
      );


      global.maintenance = result.status

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
