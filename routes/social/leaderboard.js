const { userCollection } = require('../../idbconfig');
const LZString = require("lz-string");
const { getUserIdPrefix } = require('../../utils/utils');

const limit = 50
const UpdateInterval = 1 * 1000 * 60 // minutes between highscore updates


const updateUserDocumentsPlaces = true


// ... other imports ...

const updateHighscores = async () => {
  try {

    // Single query: get top 50 with ALL needed fields
    const highscores = await userCollection
      .find(
        {
          // Optional: exclude banned (if you have ban_data in projection)
          // "account.ban_data.until": { $lte: now }  // or use partial index for active only
        },
        {
          projection: {
            score: "$stats.sp",
            userId: "_id",
            username: "$account.username",
            hat: "$equipped.hat",
            color: "$equipped.color",
            hat_color: "$equipped.hat_color",
            // Add ban check if needed: "account.ban_data.until": 1
          },
        }
      )
      .hint("leaderboard_skillpoints") // your index on stats.sp (descending)
      //.sort({ "stats.sp": -1 })       // ← CRITICAL: add sort to use index properly
      .limit(limit)
    //  .explain()
     .toArray();

     //console.log(JSON.stringify(highscores))

    if (!highscores.length) {
      console.error("No highscores found.");
      return;
    }

    // Optional: update places in DB (bulkWrite as before)
    if (updateUserDocumentsPlaces) {
      const timestamp = Date.now();
      const bulkOps = highscores.map((player, index) => ({
        updateOne: {
          filter: getUserIdPrefix(player._id),
          update: { $set: { "stats.place": { place: index + 1, updated: timestamp } } },
        },
      }));

      await userCollection.bulkWrite(bulkOps);
    }

    // No second query needed! All data is already here
    const finalHighscores = highscores.map((player) => {
      return `${player._id}$${player.username}$${player.score}$${player.hat}$${player.color}$${player.hat_color}`;
    });

    const highscoresString = JSON.stringify(finalHighscores);
    const compressedString = LZString.compress(highscoresString);

    global.highscores = compressedString;
   // console.log(`Highscores updated: ${highscores.length} players`);
  } catch (error) {
    console.error("Error updating highscores:", error);
  }
};

// Rest of your code (setup, gethighscores) remains the same

async function gethighscores() {
  return global.highscores || [];
}



async function setupHighscores() {
  await updateHighscores();
  setInterval(async () => {
    await updateHighscores();
  }, UpdateInterval);
}

module.exports = {
  setupHighscores,
  gethighscores,
  UpdateInterval
};

