const { userCollection } = require('./../idbconfig');

const excludedNicknames = ["Liquem", "BotPlayer1", "Cheater42"];
const limit = 20
const UpdateInterval = 5 * 1000 * 60;

const fetchUserDesigns = true


const updateHighscores = async () => {
  try {
    // 1. Fetch the highscores and a list of usernames
    const highscores = await userCollection
      .find({}, { projection: { _id: 0, n: "$account.nickname", u: "$account.username", s: "$stats.sp" } })
      .hint("highscoresIndex")
      .limit(limit)
      .toArray();

    // Check if highscores were found before proceeding
    if (!highscores || highscores.length === 0) {
      console.error("No highscores found.");
      return;
    }

    if (fetchUserDesigns) {

      // 2. Get a list of usernames from the highscores
      const usernames = highscores.map(player => player.u);

      // 3. Fetch player details for the highscores
      const playerdetails = await userCollection
        //.find({ "account.username": { $in: usernames } }, { projection: { _id: 0, u: "$account.username", c: "$equipped.color", h: "$equipped.hat", hc: "$equipped.hat_color" } })
         .find({ "account.username": { $in: usernames } }, { projection: { _id: 0, u: "$account.username", h: "$equipped.hat", c: "$equipped.color", hc: "$equipped.hat_color",  } })
        .hint("playerProfileIndex")
        .toArray();

      // 4. Create a map for quick lookup of player details
      const playerDetailsMap = playerdetails.reduce((map, player) => {
        //map[player.u] = { c: player.c, h: player.h, hc: player.hc };
         map[player.u] = { h: player.h, c: player.c, hc: player.hc, };
        return map;
      }, {});

      // 5. Combine the data into a single array
      const finalHighscores = highscores.map(player => {
        const details = playerDetailsMap[player.u] || {};
        return {
          ...player,
          ...details
        };
      });

      // 6. Update the global variable
      global.highscores = finalHighscores;

    } else {

      global.highscores = highscores;
    }

     console.log(global.highscores);

  } catch (error) {
    console.error("Error while updating highscores:", error);
  }
};


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
};

