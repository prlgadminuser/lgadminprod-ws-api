const { userCollection } = require('./../idbconfig');
const LZString = require("lz-string");

const excludedNicknames = ["Liquem", "BotPlayer1", "Cheater42"];
const limit = 50
const UpdateInterval = 10 * 1000 * 60;


const updateUserDocumentsPlaces = false

const updateHighscores = async () => {
  try {

    const highscores = await userCollection
      .find({}, { projection: { _id: 0, n: "$account.nickname", u: "$account.username", s: "$stats.sp" } })
      .hint("highscoresIndex")
      .limit(limit)
      .toArray();


    if (!highscores || highscores.length === 0) {
      console.error("No highscores found.");
      return;
    }



    if (updateUserDocumentsPlaces) {

    const timestamp = Date.now()
    const bulkOps = highscores.map((player, index) => {

      const place = index + 1;

      const placedata = {
        place: place,
        time: timestamp,
      }

      return {
        updateOne: {
          filter: { "account.username": player.account.username },
          update: { $set: { "stats.place": placedata } },
          hint: "account.username_1"
        },
      };
    });

    if (bulkOps.length > 0) {
      const result = await userCollection.bulkWrite(bulkOps);
    } else {
      console.log("bulkops highscore error")
    }

  }


    const usernames = highscores.map(player => player.u);

    const playerdetails = await userCollection
      .find({ "account.username": { $in: usernames } }, { projection: { _id: 0, u: "$account.username", h: "$equipped.hat", c: "$equipped.color", hc: "$equipped.hat_color" } })
      .hint("playerProfileIndex")
      .toArray();

    const playerDetailsMap = playerdetails.reduce((map, player) => {
      map[player.u] = { h: player.h, c: player.c, hc: player.hc };
      return map;
    }, {});


    const finalHighscores = highscores.map(player => {
      const details = playerDetailsMap[player.u] || {};

      return `${player.n}:${player.u}:${player.s}:${details.h}:${details.c}:${details.hc}`;
    });

    const highscoresString = JSON.stringify(finalHighscores);

    const compressedString = LZString.compress(highscoresString);

    global.highscores = compressedString;

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

