const { userCollection } = require('./../idbconfig');

const send_joined_date = false;
const count_profile_views = false;

async function getUserProfile(usernamed, selfusername) {
  try {
    // Fetch user data from the database
    const userRow = await userCollection.findOne(
      { "account.username": usernamed },
      {
        projection: {
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
          "account.kills": 1,
          "account.damage": 1,
          "account.wins": 1,
          "account.sp": 1,
          "social.p_views": 1,
        },
      }
    );

    if (!userRow) {
      throw new Error("User not found");
    }

    // Update profile views if the profile is being viewed by someone other than the user
    if (count_profile_views && selfusername !== usernamed) {
      await userCollection.updateOne(
        { "account.username": usernamed },
        { $inc: { "social.p_views": 1 } },
        { upsert: true }
      );
    }

    let displayString = null;
    // Calculate and format the join date if `send_joined_date` is enabled
    if (send_joined_date) {
      const joinedTimestamp = userRow.account.created_at.getTime();
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
    }

    // Return the user profile data as a string joined with `:`
    return [
      userRow.account.username || "User",
      userRow.account.nickname || "User",
      userRow.equipped.hat || 0,
      userRow.equipped.top || 0,
      userRow.equipped.banner || 0,
      userRow.equipped.pose || 0,
      userRow.equipped.color || 0,
      userRow.equipped.hat_color || 0,
      userRow.equipped.top_color || 0,
      userRow.equipped.banner_color || 0,
      userRow.account.sp || 0,
      userRow.account.kills || 0,
      userRow.account.damage || 0,
      userRow.account.wins || 0,
      userRow.social.p_views || 0,
      // Display the join date if requested
      displayString || null,
    ].join(":");

  } catch (error) {
    throw new Error("An error occurred while fetching user profile");
  }
}

module.exports = {
  getUserProfile,
};
