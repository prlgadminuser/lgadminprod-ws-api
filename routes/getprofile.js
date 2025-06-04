const { userCollection, ProfileViewsCollection } = require('./../idbconfig');

const send_joined_date = false;
const count_profile_views = false;

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
        },

        hint: "playerProfileIndex",
      }
    );

    if (!userRow) {
      throw new Error("User not found");
    }

    // Update profile views if the profile is being viewed by someone other than the user
    if (count_profile_views && selfusername !== usernamed) {
      const document = `${selfusername}$${usernamed}`;

      // Check if the document already exists
      const existing = await ProfileViewsCollection.findOne({ _id: document });

      if (!existing) {

        await ProfileViewsCollection.insertOne({ _id: document });

        await userCollection.updateOne(
          { "account.username": usernamed },
          { $inc: { "stats.p_views": 1 } },
        );
      }
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
    ].join(":");

  } catch (error) {
    throw new Error("An error occurred while fetching user profile");
  }
}

module.exports = {
  getUserProfile,
};
