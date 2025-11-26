 
 const { userCollection } = require('./../idbconfig');


async function searchplayers(text) {
  if (text.length < 4 || text.length > 16) {
    throw new Error("search text invalid length");
  }

  const lower = text.toLowerCase();
  const nextChar = String.fromCharCode(lower.charCodeAt(lower.length - 1) + 1);
  const nextPrefix = lower.slice(0, -1) + nextChar;

  try {
    const users = await userCollection
    .find(
      {
        "account.nickname": {
          $gte: text,     // case doesn't matter due to collation
          $lt: nextPrefix
        }
      },
      
        { projection: { _id: 0, nickname: "$account.nickname", username: "$account.username", stats: "$stats.sp" },
        collation: { locale: "en", strength: 2 },
        hint: { "account.nickname": 1 }
      }
    )
    .limit(3)
    .toArray()
   // .explain("executionStats");

    console.log(JSON.stringify(users));
    return users;
  } catch (error) {
    console.error("Search error:", error);
    throw new Error("error");
  }
}

async function getUsersSlice(min, max) {

    if (min < 1 || max <= min) {
    throw new Error("Invalid range: ensure min >= 1 and max > min");
  }
  
  try {
    const users = await userCollection.find(
      {}, // No filter
      {
        projection: {
          username: 1,
          nickname: 1,
          sp: 1,
          _id: 0
        }
      }
    )
    .skip(min - 1)     // Skip first 4 documents (index 0-3)
    .limit(max - min + 1)   // Get next 11 documents (index 4-14, i.e., 5th to 15th)
    .toArray();

    return users;
  } catch (error) {
    throw new Error("error");
  }
}


module.exports = {searchplayers}
