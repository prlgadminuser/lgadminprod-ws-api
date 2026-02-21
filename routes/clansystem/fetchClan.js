const { ObjectId } = require("mongodb");
const { ClansCollection } = require("../../idbconfig");
const { getUserIdPrefix } = require("../../utils/utils");

async function FetchClanData(clanId) {
  try {
    const clanData = await ClansCollection.findOne(getUserIdPrefix(clanId), {
      projection: {
        _id: 0,
        metadata: 1,
        info: 1,
      },
    });

    const clanMemberData = await ClansCollection.aggregate([
      {
        $match: {
          _id: new ObjectId(clanId),
        },
      },
      {
        $unwind: "$members",
      },
      {
        $addFields: {
          memberObjectId: {
            $toObjectId: "$members.userId",
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "memberObjectId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 0,
          userId: "$user._id",
          username: "$user.account.username",
          sp: "$user.stats.sp",
        },
      },
    ]).toArray();

    if (clanData === null) {
      throw new Error("Clan does not exist");
    }

    const result = {
      data: clanData,
      members: clanMemberData,
    };

    return result; // return the new clan _id
  } catch (err) {
      throw new Error("Clan does not exist");
  }
}

module.exports = {
  FetchClanData,
};
