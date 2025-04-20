
const { userCollection } = require('./..//idbconfig');

const updateHighscores = async () => {
  try {
    const highscores = await userCollection
      .aggregate([
        {
          $match: {
            nickname: { $ne: "Liquem" }, // Exclude player with username "Liquem"
            sp: { $gt: 0 }
          }
        },
        {
          $sort: {
            sp: -1
          }
        },
        {
          $limit: 50
        },
        {
          $project: {
            _id: 0,
            n: "$nickname",  // Shortened "nickname" to "n"
            u: "$username",  // Shortened "username" to "u"
            s: { $ifNull: ["$sp", 0] }
          }
        }
      ])
      .toArray();

    global.highscores = highscores

   // console.log("Highscores were successfully updated.");
  } catch (error) {
    console.error("Internal Server Error while updating highscores:", error);
  }
};



async function gethighscores() {

  const highscores = global.highscores

  return highscores;
}

async function setupHighscores() {

  updateHighscores();

  setInterval(updateHighscores, 300000);
}

module.exports = {
  setupHighscores,
  gethighscores,
}