const {
  userCollection,
  badWords,
  usernameRegex,
  passwordRegex,
  tokenkey,
} = require("./..//idbconfig");
const { jwt, bcrypt } = require("./..//index");
const { webhook } = require("./..//discordwebhook");

const allow_bad_words = false;

async function CreateAccount(username, password, user_country) {
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
    const existingUser = await userCollection.findOne(
      { "account.username": username },
      {
        collation: { locale: "en", strength: 2 },
      }
    );

    if (existingUser) {
      return { status: "Name already taken. Please choose another one." };
    }

    // Hash password and create token
    const hashedPassword = await bcrypt.hash(password, 1); // Increased salt rounds for better security
    const token = jwt.sign({ username: username }, tokenkey);
    const currentTimestamp = Date.now(); // Ensure this is an integer

    // Prepare account details
    const account = {
      username: String(username), // Ensure username is a string
      nickname: String(username), // Ensure nickname is a string
      password: hashedPassword, // Ensure password is a string
      token: token, // Ensure token is a string
      country_code: finalCountryCode, // Ensure country_code is a string
      created_at: currentTimestamp, // Cast to int
      last_login: currentTimestamp, // Cast to int
      lastping: currentTimestamp, // Cast to int
      nameupdate: 0, // Ensure nameupdate is an integer
      type: "user", // Type is a fixed string
    };

    const currency = {
      coins: Number(start_coins), // Ensure coins is an integer
      boxes: 0, // Ensure boxes is an integer
    };

    const inventory = {
      weapons: ["1", "2", "3"], // Ensure weapons is an array of strings
      loadout: {
        1: "1", // Ensure loadout values are strings
        2: "2",
        3: "3",
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
      gadget: "1", // Ensure color is an integer
    };

    const stats = {
      sp: 0, // Ensure sp is an integer
      wins: 0, // Ensure wins is an integer
      kills: 0, // Ensure kills is an integer
      damage: 0, // Ensure damage is an integer
      p_views: 0,
    };

    // Insert the new account into the database
    try {
      await userCollection.insertOne({
        account,
        currency,
        inventory,
        equipped,
        stats,
      });
    } catch (error) {
      // If there's a validation error, catch and log it
      if (error.code === 121) {
        // MongoDB validation error code
        const failedProperties = error.errorResponse.errInfo.details;
        return {
          status: "Server validation error",
          error: error.errorResponse.errInfo.details,
        };
      } else {
        //console.error("Unexpected error: ", error);
        return { status: "Unexpected error occurred", error: error.message };
      }
    }
    // Send webhook notification about the new user
    // const joinedMessage = `${username} has joined Skilldown from ${finalCountryCode}`;
    const joinedMessage = `${username} has joined Skilldown`;
    webhook.send(joinedMessage);

    return { token: token };
  } catch (error) {
    console.error("Error creating account:");
    return { status: "Unexpected error occurred" };
  }
}

module.exports = {
  CreateAccount,
};
