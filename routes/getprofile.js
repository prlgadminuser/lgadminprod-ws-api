
const { userCollection } = require('./..//idbconfig');

const send_joined_date = false
const count_profile_views = false

async function getUserProfile(usernamed, selfusername) {
  try {
    // Fetch user data from the database
    const userRow = await userCollection.findOne(
      { username: usernamed },
      {
        projection: {
          username: 1,
          nickname: 1,
          hat: 1,
          top: 1,
          banner: 1,
          pose: 1,
          color: 1,
          hat_color: 1,
          top_color: 1,
          banner_color: 1,
          created_at: 1,
          kills: 1,
          damage: 1,
          wins: 1,
          sp: 1,
          p_views: 1,
          // country_code: 1, // Uncomment if country_code is needed
        },
      }
    );

    if (!userRow) {
      throw new Error("User not found");
    }


    if (count_profile_views && selfusername !== usernamed) {

      userCollection.updateOne(
        { username: usernamed },                          // Find the user whose profile is being viewed
        {
          $inc: { p_views: 1 },                           // Increment the profile views count               // Add the viewer to the viewers set
        },
        {
          upsert: true,                                   // Create a new document if not found                     // Ensure default values are set on insert (if needed)
        }
      );
    }


    if (send_joined_date) {

      const joinedTimestamp = userRow.created_at.getTime();
      const currentTime = new Date().getTime();
      const timeSinceJoined = currentTime - joinedTimestamp;
  
      const daysSinceJoined = Math.floor(timeSinceJoined / (1000 * 60 * 60 * 24));
      const monthsSinceJoined = Math.floor(daysSinceJoined / 30);
      const yearsSinceJoined = Math.floor(monthsSinceJoined / 12);
  
      let displayString;
  
      if (yearsSinceJoined > 0) {
        displayString = `${yearsSinceJoined} year${yearsSinceJoined > 1 ? "s" : ""}`;
      } else if (monthsSinceJoined > 0) {
        displayString = `${monthsSinceJoined} month${monthsSinceJoined > 1 ? "s" : ""}`;
      } else {
        displayString = `${daysSinceJoined} day${daysSinceJoined > 1 ? "s" : ""}`;
      }
    }


    // Return the user profile data
  /*return {
      username: userRow.username || "User",
      nickname: userRow.nickname || "User",
      hat: userRow.hat || 0,
      top: userRow.top || 0,
      banner: userRow.banner || 0,
      pose: userRow.pose || 0,
      color: userRow.color || 0,
      hat_color: userRow.hat_color || 0,
      top_color: userRow.top_color || 0,
      banner_color: userRow.banner_color || 0,
     // days_since_joined: displayString,
      sp: userRow.sp || 0,
      kills: userRow.kills || 0,
      damage: userRow.damage || 0,
      wins: userRow.wins || 0,
      // country_code: userRow.country_code, // Uncomment if country_code is needed
    }; 


    */

    return [
      userRow.username || "User",
      userRow.nickname || "User",
      userRow.hat || 0,
      userRow.top || 0,
      userRow.banner || 0,
      userRow.pose || 0,
      userRow.color || 0,
      userRow.hat_color || 0,
      userRow.top_color || 0,
      userRow.banner_color || 0,
      userRow.sp || 0,
      userRow.kills || 0,
      userRow.damage || 0,
      userRow.wins || 0,
      userRow.p_views || 0,
      // country_code: userRow.country_code, // Uncomment if country_code is needed
    ].join(":");

  } catch (error) {
    throw new Error("An error occurred while fetching user profile");
  }
}

module.exports = {
  getUserProfile
}