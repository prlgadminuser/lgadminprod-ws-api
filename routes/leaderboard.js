const { userCollection } = require('./../idbconfig');

// Function to update highscores by aggregating top players' scores
const updateHighscores = async () => {
  try {
    // Fetch the top 50 players with the highest 'sp' (points) excluding the user "Liquem"
    const highscores = await userCollection
      .aggregate([
        {
          $match: {
           "account.nickname": { $ne: "Liquem" }, // Exclude player with the nickname "Liquem"
            //"stats.sp": { $gt: 0 } // Ensure we only consider players with a positive score
          }
        },
        {
          $sort: {
            "stats.sp": -1 // Sort by score (sp) in descending order
          }
        },
        {
          $limit: 50 // Limit the results to the top 50 players
        },
        {
          $project: {
            _id: 0, // Exclude MongoDB _id field from the results
            n: "$account.nickname", // Shorten "nickname" to "n"
            u: "$account.username", // Shorten "username" to "u"
            s: { $ifNull: ["$stats.sp", 0] } // Use 0 as the default if "sp" (score) is null
          }
        }
      ])
      .toArray();

    if (highscores) {
      global.highscores = highscores; // Update the global highscores variable with the fetched data
    } else {
      console.error("No highscores found.");
    }
  } catch (error) {
    console.error("Error while updating highscores:", error);
  }
};

// Function to get the current highscores
async function gethighscores() {
  // Return the current highscores stored in the global object
  return global.highscores || []; // Return an empty array if no highscores are available
}

// Function to initialize the highscores system
async function setupHighscores() {
  // Immediately update the highscores on setup
  await updateHighscores();

  // Set up an interval to refresh the highscores every 5 minutes (300000ms)
  setInterval(async () => {
    await updateHighscores();
  }, 300000); // Update every 5 minutes
}

module.exports = {
  setupHighscores,
  gethighscores,
};
