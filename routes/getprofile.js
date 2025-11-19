const { isString } = require('..');
const { userCollection, userSocialCollection } = require('./../idbconfig');
const { UpdateInterval } = require('./leaderboard');

const joined_date_displaymode = 1;
const count_profile_views = true;
const ignore_user_already_viewed_profile = false

async function getUserProfile(usernamed, selfusername) {

  try {
    // Fetch user data from the database
    const userRow = await userCollection.findOne(
      { "account.username": usernamed },
      {
        projection: {
          _id: 0, 
          "account.username": 1,
          "account.nickname": 1,
          "equipped.hat": 1,
          "equipped.top": 1,
          "equipped.banner": 1,
          "equipped.pose": 1,
          "equipped.color": 1,
          "equipped.hat_color": 1,
          "equipped.top_color": 1,
          "equipped.banner_color": 1,
          "account.created_at": 1,
          "stats.kills": 1,
          "stats.damage": 1,
          "stats.wins": 1,
          "stats.sp": 1,
          "stats.p_views": 1,
          "stats.place": 1,
          "inventory.loadout": 1,
        },

        //hint: "playerProfileIndex",
         hint: "account.username_1",
      }
    );

    if (!userRow) {
      throw new Error("User not found");
    }

    
    if (count_profile_views && selfusername !== usernamed) TryIncreaseProfileViews(selfusername, usernamed)


    let displayString = null;

    if (joined_date_displaymode === 2) {
      const joinedTimestamp = userRow.account.created_at
      const currentTime = new Date().getTime();
      const timeSinceJoined = currentTime - joinedTimestamp;
      const daysSinceJoined = Math.floor(timeSinceJoined / (1000 * 60 * 60 * 24));
      const monthsSinceJoined = Math.floor(daysSinceJoined / 30);
      const yearsSinceJoined = Math.floor(monthsSinceJoined / 12);
      if (yearsSinceJoined > 0) {
        displayString = `${yearsSinceJoined} year${yearsSinceJoined > 1 ? "s" : ""}`;
      } else if (monthsSinceJoined > 0) {
        displayString = `${monthsSinceJoined} month${monthsSinceJoined > 1 ? "s" : ""}`;
      } else {
        displayString = `${daysSinceJoined} day${daysSinceJoined > 1 ? "s" : ""}`;
      }

    } else if (joined_date_displaymode === 1) {
      const joinedTimestamp = userRow.account.created_at
      const currentTime = new Date().getTime();
      const timeSinceJoined = currentTime - joinedTimestamp;
      const daysSinceJoined = Math.floor(timeSinceJoined / (1000 * 60 * 60 * 24));
      displayString = daysSinceJoined === 0 ? "0" : daysSinceJoined
    }

    let leaderboard_rank

    if (userRow.stats.place) {
      if (userRow.stats.place.updated > Date.now() + UpdateInterval) {
        leaderboard_rank = 0;
      } else {
        leaderboard_rank = userRow.stats.place.place;
      }
    } else {
      leaderboard_rank = 0;
    }

    // Return the user profile data as a string joined with `:`

    const formattedLoadout = [
    userRow.inventory.loadout.slot1,
    userRow.inventory.loadout.slot2,
    userRow.inventory.loadout.slot3,
    ].join(":")


    return [
      userRow.account.username,
      userRow.account.nickname,
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
      userRow.stats.p_views,
      // Display the join date if requested
      displayString || null,
      formattedLoadout,
      leaderboard_rank,
    ].join("$");

  } catch (error) {
    throw new Error("An error occurred while fetching user profile");
  }
}



async function TryIncreaseProfileViews(selfusername, usernamed) {
  const document = `p_view=${selfusername}$${usernamed}`;

  const InsertViewEntry = await userSocialCollection.updateOne(
    { _id: document },
    { $setOnInsert: { _id: document } },
    { upsert: true }
  );

  if (InsertViewEntry.upsertedCount > 0) {
    await userCollection.updateOne(
      { "account.username": usernamed },
      { $inc: { "stats.p_views": 1 } }
    );
  }
}



module.exports = {
  getUserProfile,
};
