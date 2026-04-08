
const { userCollection, userSocialCollection } = require('../..//idbconfig');
const { getUserIdPrefix } = require('../../utils/utils');
const { UpdateInterval } = require('./leaderboard');

const count_profile_views = true;
const ignore_user_already_viewed_profile = false




async function getUserProfile(userId, selfId) {
  try {
    // Fetch user data from the database
    const userRow = await userCollection.findOne(getUserIdPrefix(userId), {
      projection: {
        _id: 0,
        "account.username": 1,
        "equipped": 1,
        "account.created_at": 1,
        "stats.kills": 1,
        "stats.damage": 1,
        "stats.wins": 1,
        "stats.sp": 1,
        "stats.p_views": 1,
        "stats.place": 1,
      },
      //hint: "playerProfileIndex",
      //  hint: "account.username_1",
    });

    if (!userRow) {
      throw new Error("User not found");
    }

    const accountCreatedTimestamp = userRow.account.created_at;
    const accountCreatedYear = new Date(accountCreatedTimestamp).getFullYear

    let leaderboard_rank;

    if (userRow.stats.place) {
      const expirationTime = userRow.stats.place.updated + UpdateInterval;

      if (Date.now() > expirationTime) {
        // If the current time is past the expiration time, the score is stale/invalid.
        leaderboard_rank = 0;
      } else {
        // Otherwise, the score is still valid.
        leaderboard_rank = userRow.stats.place.place;
      }
    } else {
      leaderboard_rank = 0;
    }

    // Return the user profile data as a string joined with `:`

    const formattedLoadout = [
      userRow.equipped.loadout.slot1,
      userRow.equipped.loadout.slot2,
      userRow.equipped.loadout.slot3,
      userRow.equipped.loadout.gadget
    ].join(":");

    return [
      userRow.account.username,
      userRow.equipped.hat,
      userRow.equipped.top,
      userRow.equipped.banner,
      userRow.equipped.pose,
      userRow.equipped.color,
      userRow.equipped.hat_color,
      userRow.equipped.top_color,
      userRow.equipped.banner_color,
      userRow.stats.sp,
      userRow.stats.kills,
      userRow.stats.damage,
      userRow.stats.wins,
      formattedLoadout,
      accountCreatedYear,
      leaderboard_rank,
    ].join("$");
  } catch (error) {
    //  console.log(error)
    throw new Error("An error occurred while fetching user profile");
  }
}

module.exports = {
  getUserProfile,
};












 // if (count_profile_views && selfId !== userId) TryIncreaseProfileViews(selfId, userId);

async function TryIncreaseProfileViews(selfid, userid) {
  const document = `p_view=${selfid}$${userid}`;

  const InsertViewEntry = await userSocialCollection.updateOne(
    { _id: document },
    { $setOnInsert: { _id: document } },
    { upsert: true },
  );

  if (InsertViewEntry.upsertedCount > 0) {
    await userCollection.updateOne(getUserIdPrefix(userid), {
      $inc: { "stats.p_views": 1 },
    });
  }
}
