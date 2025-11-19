const { userCollection } = require('./../idbconfig');
const LZString = require("lz-string");

const excludedNicknames = ["Liquem", "BotPlayer1", "Cheater42"];
const limit = 50
const UpdateIntervalMins = 5 // minutes between highscore updates


const updateUserDocumentsPlaces = false

const updateHighscores = async () => {
  try {
    const highscores = await userCollection
      .find(
        {},
        {
          projection: {
            _id: 0,
            score: "$stats.sp",
            username: "$account.username",
          },
        }
      )
      .hint("highscores_skillpoints")
      .limit(limit)
      .toArray();

    if (!highscores.length) {
      console.error("No highscores found.");
      return;
    }

    if (updateUserDocumentsPlaces) {
      const timestamp = Date.now();
      const bulkOps = highscores.map((player, index) => {
        const place = index + 1;
        const placedata = {
          place: place,
          time: timestamp,
        };

        return {
          updateOne: {
            filter: { "account.username": player.username },
            update: { $set: { "stats.place": placedata } },
            hint: "account.username_1",
          },
        };
      });

      if (bulkOps.length > 0) {
        const result = await userCollection.bulkWrite(bulkOps);
      } else {
        console.log("bulkops highscore error");
      }
    }

    const usernames = highscores.map((player) => player.username);
    const playerdetails = await userCollection
      .find(
        { "account.username": { $in: usernames } },
        {
          projection: {
            _id: 0,
            username: "$account.username",
            nickname: "$account.nickname",
            hat: "$equipped.hat",
            color: "$equipped.color",
            hat_color: "$equipped.hat_color",
          },
        }
      )
      .hint("account.username_1")
      .toArray();

    const playerDetailsMap = playerdetails.reduce((map, player) => {
      map[player.username] = {
        nickname: player.nickname,
        hat: player.hat,
        color: player.color,
        hat_color: player.hat_color,
      };
      return map;
    }, {});

    const finalHighscores = highscores.map((player) => {
      const details = playerDetailsMap[player.username] || {};

      return `${details.nickname}:${player.username}:${player.score}:${details.hat}:${details.color}:${details.hat_color}`;
    });

    const highscoresString = JSON.stringify(finalHighscores);

    const compressedString = LZString.compress(highscoresString);

    console.log(highscoresString);

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
  }, UpdateIntervalMins * 60000);
}

module.exports = {
  setupHighscores,
  gethighscores,
};

