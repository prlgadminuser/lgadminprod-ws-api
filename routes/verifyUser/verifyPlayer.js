
const { ObjectId } = require('mongodb');
const { tokenkey, userCollection } = require('../../idbconfig');
const { jwt } = require('../../index');
const { getUserInventory } = require('../main/getinventory');
const { getUserIdPrefix } = require('../../utils/utils');

async function verifyPlayer(token) {

   token = String(token); 

  if (!token) {
    throw new Error("Unauthorized");
  }

  try {
    // 1. Verify the token to ensure it's a valid, unexpired token.
    const decodedToken = jwt.verify(token, process.env.TOKEN_KEY || tokenkey);

    const userId = decodedToken;
    if (!userId) {
      throw new Error("Invalid token");
    }
    
    const userInformation = await userCollection.findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          "account.nickname": 1,
          "account.username": 1,
          "account.ban_data.until": 1,
        },
      }
    );


    if (!userInformation) {
      throw new Error("Invalid token or user not found");
    }

     const bannedUntil = userInformation.account.ban_data.until
     const time = Date.now()
    if (time < bannedUntil)  return "disabled";
    

    const inventory = await getUserInventory(userId);

    return {
      playerId: userId,
      nickname: userInformation.account.nickname,
      inventory: inventory,
      items: new Set(inventory.items),
    };
  } catch (error) {
 //   console.log(error)
    throw new Error("Token verification failed");
  }
}

module.exports = {
    verifyPlayer
};