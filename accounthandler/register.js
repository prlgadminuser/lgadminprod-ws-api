const {
  userCollection,
  badWords,
  usernameRegex,
  passwordRegex,
  tokenkey,
  client,
} = require("./..//idbconfig");
const { jwt, bcrypt } = require("./..//index");
const { webhook } = require("./..//discordwebhook");
const { CheckUserIp } = require("./security");
const { DoesUserNameExist, getUserIdPrefix } = require("../utils/utils");

const allow_bad_words = false;
const allowVPNS = false

async function CreateAccount(username, password, user_country, userIp) {

  username = String(username); 
  password = String(password); 
  
  try {
    // Initial setup
    const finalCountryCode = String(user_country); // Ensure country_code is a string
    const start_coins = 100; // Coins should be an integer

    // Validate input
    if (!username || !password) {
      return { status: "Name and password are required" };
    }

    if (username === password) {
      return { status: "Name and password cannot be the same" };
    }

    if (!usernameRegex.test(username)) {
      return { status: "Name not allowed" };
    }

    if (!allow_bad_words) {
      if (badWords.test(username)) {
        return { status: "Name contains inappropriate words" };
      }
    }

    if (!passwordRegex.test(password)) {
      return {
        status: "Invalid password. Ensure there are no special characters",
      };
    }

    // Check if username already exists
    const existingUser = await DoesUserNameExist(username)
    if (existingUser) {
      return { status: "Name already taken. Choose another one." };
    }
    

    if (!allowVPNS) {

    const isUsingVpn = await CheckUserIp(userIp)

    if (isUsingVpn.isVPN && isUsingVpn.type !== "Compromised Server") {
      return { status: "VPNs/Proxies are not allowed. Please disable them and try again" };
    }
  }


    // Hash password and create token
    const hashedPassword = await bcrypt.hash(password, 1); // Increased salt rounds for better security
    const currentTimestamp = Date.now(); // Ensure this is an integer

    // Prepare account details
    const account = {
      username: String(username), // Ensure username is a string
      password: hashedPassword, // Ensure password is a string
      token: "0",
      country_code: finalCountryCode, // Ensure country_code is a string
      created_at: currentTimestamp, // Cast to int
      last_login: currentTimestamp, // Cast to int
      nameupdate: 0, // Ensure nameupdate is an integer
      ban_data: { type: 1, until: 0, reason: 0 } // mainly used for bans (cheating etc)
    };

    const currency = {
      coins: Number(start_coins), // Ensure coins is an integer
      boxes: 0, // Ensure boxes is an integer
    };

    const inventory = {
      loadout: {
        slot1: "1", // Ensure loadout values are strings
        slot2: "2",
        slot3: "3",
        gadget: "1"
      },
      last_collected: 0, // Ensure last_collected is an integer
    };

    const equipped = {
      hat: "0", // Ensure hat is a string
      top: "0", // Ensure top is a string
      banner: "0", // Ensure banner is a string
      pose: "0", // Ensure pose is a string
      hat_color: 0, // Ensure hat_color is an integer
      top_color: 0, // Ensure top_color is an integer
      banner_color: 0, // Ensure banner_color is an integer
      color: 0,
    };

    const stats = {
      sp: 0, // Ensure sp is an integer
      wins: 0, // Ensure wins is an integer
      kills: 0, // Ensure kills is an integer
      damage: 0, // Ensure damage is an integer
      p_views: 0,
    };

    const success = await userCollection.insertOne(
      { account, currency, inventory, equipped, stats },
    );

    if (success && success.acknowledged) { 

      webhook.send(`${username} has joined Skilldown from ${finalCountryCode}`).catch(() => {}); 
    
    } else {
      throw new Error("Account creation failed")
    }

    const userId = success.insertedId

    const token = jwt.sign(userId.toString(), tokenkey);

      if (token)  {

        result = { status: "success", token: token };
      const insertToken = await userCollection.updateOne(
   getUserIdPrefix(userId),
  {
    $set: {
      "account.token": token
    }
  }
);
    }


    return result || { status: "Account creation failed" };
  } catch (error) {
   console.error("Error creating account:", error);
    return "Account creation failed. Try again later";
  }
}

module.exports = {
  CreateAccount,
};
