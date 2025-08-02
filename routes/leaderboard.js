const { userCollection } = require('./../idbconfig');

const excludedNicknames = ["Liquem", "BotPlayer1", "Cheater42"];
const limit = 20
const UpdateInterval = 5 * 1000 * 60;


const updateHighscores = async () => {
  try {
    let highscores
    highscores = await userCollection
      .find({}, { projection: { _id: 0, n: "$account.nickname", u: "$account.username", s: "$stats.sp" } })
      //.sort({ "stats.sp": -1 }) 
      .hint("highscoresIndex")
      .limit(limit)
      .toArray()
    //highscores = highscores.filter(player => !excludedNicknames.includes(player.n));
    if (highscores) {
      global.highscores = highscores;
    } else {
      console.error("No highscores found.");
    }
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


