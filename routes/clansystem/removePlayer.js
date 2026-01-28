const { ObjectId } = require("mongodb");
const { ClansCollection, userCollection } = require("../../idbconfig");
const { DoesClanExist, DoesUserIdExist, getUserIdPrefix } = require("../../utils/utils");

async function RemovePlayerFromClan(clanId, userId, requestedBy = null) {
  try {
    const userExists = await DoesUserIdExist(userId);
    if (!userExists) {
      throw new Error("User does not exist");
    }

    const clan = await DoesClanExist(clanId);
    if (!clan) {
      throw new Error("Clan does not exist");
    }

    const IsUserInClan = await ClansCollection.findOne(
      {
        _id: new ObjectId(clanId),
        "members.userId": userId,
      },
      {
        hint: "members.userId_1",
      },
    );

    if (!IsUserInClan) {
      throw new Error("user is not in the clan");
    }

    const updateResult = await ClansCollection.updateOne(
      getUserIdPrefix(clanId),
      {
        $pull: { members: { userId: userId } },
      },
      {
        hint: "members.userId_1",
      },
    );

    return updateResult.modifiedCount === 1;
  } catch (err) {
    console.error("Failed to add player to clan:", err.message);
    throw err;
  }
}

module.exports = {
  RemovePlayerFromClan,
};
