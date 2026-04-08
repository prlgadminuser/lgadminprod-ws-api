const { rarityConfig } = require("../../boxrarityconfig");
const { SaveUserGrantedItems } = require("../../utils/utils");
const { userCollection, client } = require("../..//idbconfig");
const { getUserIdPrefix } = require("../../utils/utils");
const { generateLootBoxes } = require("./generateBoxes");

const hoursSince = (timestamp) => (Date.now() - timestamp) / (1000 * 60 * 60);
const canCollectDaily = (lastCollected) => hoursSince(lastCollected) >= 24;


const isStreakAlive = (lastCollected) => {
  if (!lastCollected) return false;

  const now = Date.now();
  const last = new Date(lastCollected).getTime();
  const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

  return now - last < TWO_DAYS_MS;
};


// === MAIN FUNCTION ===
async function getdailyreward(userId, owneditems) {

  try {

      const user = await userCollection.findOne(getUserIdPrefix(userId), {
    projection: { "inventory.daily_reward.last_collected_at": 1 },
  });

  const lastCollected = user.inventory.daily_reward.last_collected_at;

  if (!user) throw new Error("User not found.");
  if (!canCollectDaily(lastCollected)) {  throw new Error("You can only collect rewards once every 24 hours.");}


  const update = {
    $set: {},
    $inc: {},
  };

  update.$set["inventory.daily_reward.last_collected_at"] = Date.now() 

    if (isStreakAlive(lastCollected)) {
    update.$inc["inventory.daily_reward.streak"] = 1;
  } else {
    update.$set["inventory.daily_reward.streak"] = 1; // reset streak
  }

  const boxes_amount = 10000


 const rewards = await generateLootBoxes(boxes_amount, userId, owneditems, update)


  return {
    time: Date.now(),
    rewards, // Array of [type, value]
  };
  }

  catch(err) {
console.log(err)
  }
}

module.exports = { getdailyreward };
