
const { ObjectId } = require('mongodb');
const { userCollection } = require('../../idbconfig');
const { getUserInventory } = require('../main/getinventory');
const { getUserIdPrefix, IsTokenValid } = require('../../utils/utils');

async function verifyPlayer(token) {

   token = String(token); 

  if (!token) {
    throw new Error("Unauthorized");
  }

  try {
    // 1. Verify the token to ensure it's a valid, unexpired token.
    const decodedToken = IsTokenValid(token)

    const userId = decodedToken;
    if (!userId) {
      throw new Error("Invalid token");
    }
    
    const userInformation = await userCollection.findOne(
      getUserIdPrefix(userId),
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
   console.log(error)
    throw new Error("Token verification failed");
  }
}

module.exports = {
    verifyPlayer
};