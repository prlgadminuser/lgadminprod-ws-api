const { userCollection } = require('./../idbconfig');

const excludedNicknames = ["Liquem", "BotPlayer1", "Cheater42"];
const limit = 10
const UpdateInterval =  5 * 1000 * 60; 

// Function to update highscores by aggregating top players' scores
const updateHighscores = async () => {
  try {
   let highscores
    // Fetch the top 50 players with the highest 'sp' (points) excluding the user "Liquem"
   highscores = await userCollection
  .find({}, { projection: { _id: 0, n: "$account.nickname", u: "$account.username", s: "$stats.sp" } })
  .hint("highscoresIndex")
  .limit(limit)
  .toArray()



   //highscores = highscores.filter(player => !excludedNicknames.includes(player.n));

      
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
  }, UpdateInterval); // Update every 5 minutes
}


  //.sort({ "stats.sp": -1 })

module.exports = {
  setupHighscores,
  gethighscores,
};
