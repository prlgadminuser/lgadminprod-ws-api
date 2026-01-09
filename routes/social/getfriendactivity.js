
const { userCollection } = require("../idbconfig");
const { connectedPlayers } = require('./..//index');


async function GetFriendsDataLocal(username) {
  try {
    // Get the current timestamp (current time in milliseconds)

    const max_age_of_ping = 10
    const currentTimestamp = Date.now();
    const SecondsAgo = currentTimestamp - max_age_of_ping * 1000; // 10 seconds ago

    // Perform the aggregation query
    const result = userCollection.aggregate([
      {
        $match: { username: username } // Find the current user
      },
      {
        $lookup: {
          from: "users",
          let: { friendsList: "$friends" }, // Store friends list
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$username", "$$friendsList"] }, // Match only necessary friends
                lastPing: { $gt: ["$lastPing", SecondsAgo] } // Check if lastPing is within the last 10 seconds
              }
            },
            {
              $project: { _id: 0, username: 1, sp: 1, lastPing: 1 } // Only needed fields
            }
          ],
          as: "onlineFriends"
        }
      },
      {
        $project: { _id: 0, username: 1, onlineFriends: 1 } // Include the online friends in the result
      }
    ]);

    // Handle empty or null result
    if (!result || result.length === 0) {
      return { success: false, message: "No data found for the user" };
    }

    // Shorten the keys for the friends list
    const shortenedFriends = result[0].onlineFriends.map(friend => ({
      user: friend.username, // Renaming 'username' to 'user'
      score: friend.sp,       // Renaming 'sp' to 'score'
      lastPing: friend.lastPing // Keep the lastPing field for reference
    }));

    // Shorten the response with the new structure
    const shortenedResult = {
      success: true,
      data: {
        user: result[0].username,  // Renaming 'username' to 'user'
        friends: shortenedFriends  // Renamed friends list with shortened keys
      }
    };

    return shortenedResult;

  } catch (error) {
    console.error("Error fetching friends data:", error);
    return { success: false, message: "An error occurred while fetching the data" };
  }
}

module.exports = {
  GetFriendsDataLocal
}




async function GetFriendRealtimeData(username) {

}