const { ObjectId } = require("mongodb");
const { ClansCollection, userCollection } = require("../../idbconfig");
const {
  DoesClanExist,
  DoesUserIdExist,
  getUserIdPrefix,
} = require("../../utils/utils");

async function TryToAddPlayerToClan(clanId, userId, requestedBy = null) {
  try {
    const userExists = await DoesUserIdExist(userId);
    if (!userExists) {
      throw new Error("User does not exist");
    }

    const clan = await DoesClanExist(clanId);
    if (!clan) {
      throw new Error("Clan does not exist");
    }

    const IsUserAlreadyInClan = await ClansCollection.findOne(
      {
        _id: new ObjectId(clanId),
        "clanMembers.userId": userId,
      },
      {
        hint: "clanMembers.userId_1",
      },
    );

    if (IsUserAlreadyInClan) {
      throw new Error("Member is already in the clan");
    }

    const newMember = {
      userId: userId,
      role: "member", // default role
      joined_at: Date.now(),
    };

    const updateResult = await ClansCollection.updateOne(
      getUserIdPrefix(clanId),
      {
        $push: { clanMembers: newMember },
      },
      {
        hint: "clanMembers.userId_1",
      },
    );

    return updateResult.modifiedCount === 1;
  } catch (err) {
    console.error("Failed to add player to clan:", err.message);
    throw err;
  }
}

module.exports = {
  TryToAddPlayerToClan,
};
