const { userCollection } = require('./..//idbconfig');
const { getUserIdPrefix } = require('../../utils/utils');

const dailyRewards = [
  { field: "coins", amount: 100, message: "Day 1: 100 coins!" },
  { field: "coins", amount: 150, message: "Day 2: Keep it up! 150 coins!" },
  { field: "gems", amount: 5, message: "Day 3: Bonus! 5 gems!" },
  { field: "coins", amount: 200, message: "Day 4: 200 coins for you!" },
  { field: "xp", amount: 250, message: "Day 5: Leveling up with 250 XP!" },
  { field: "coins", amount: 300, message: "Day 6: 300 coins. Almost there!" },
  { field: "gems", amount: 10, message: "Day 7: Jackpot! 10 gems!" },
];

function More_Than_1_Day_passed(lastCollected) {
  const hoursPassed = (Date.now() - lastCollected) / (1000 * 60 * 60);
  return hoursPassed >= 24;
}

function isStreakBroken(lastCollected) {
  const hoursPassed = (Date.now() - lastCollected) / (1000 * 60 * 60);
  return hoursPassed >= 24; // missed a day? reset
}

function getMultiplier(streak) {
   if (streak >= 7) return 2.0;
   if (streak >= 5) return 1.5;
   if (streak >= 3) return 1.25;
  return 1;
}

async function getStreakDailyReward(username) {
  try {
    const user = await userCollection.findOne(
      { username },
      {
        projection: {
          _id: 0,
          //  username: 1,
          "daily_rewards.last_collected_at": 1,
          "daily_rewards.reward_day": 1,
          "daily_rewards.streak": 1,
        },
      }
    );

    if (!user) throw new Error("User not found");

    const rewards = user.daily_rewards || {};
    const lastCollected = rewards.last_collected_at || 0;

    if (!More_Than_1_Day_passed(lastCollected)) {
      throw new Error("Reward already collected. Try again later.");
    }

    const streakBroken = isStreakBroken(lastCollected);
    const currentStreak = streakBroken ? 1 : (rewards.streak || 1) + 1;

    const currentDay = rewards.reward_day || 1;
    const reward = dailyRewards[currentDay - 1];

    const multiplier = getMultiplier(currentStreak);
    const boostedAmount = Math.floor(reward.amount * multiplier);

    const nextDay = currentDay >= 7 ? 1 : currentDay + 1;

    // Build dynamic update object
    const update = {
      $inc: {
        [reward.field]: boostedAmount,
      },
      $set: {
        "daily_rewards.last_collected_at": Date.now(),
        "daily_rewards.reward_day": nextDay,
        "daily_rewards.streak": currentStreak,
      },
    };

    await userCollection.updateOne({ username }, update);


    return {
      day: currentDay,
      type: reward.field,
      baseAmount: reward.amount,
      streak: currentStreak,
      message: reward.message,
      multiplier: multiplier,
      next_reward_day: nextDay,
      time: Date.now(),
    };
  } catch (error) {
    throw new Error("Could not collect daily reward");
  }
}


function simulateStreakRewards(upToStreak = 14) {
  const simulationResults = [];

  for (let streak = 1; streak <= upToStreak; streak++) {
    const rewardDay = ((streak - 1) % dailyRewards.length) + 1;
    const reward = dailyRewards[rewardDay - 1];
    const multiplier = getMultiplier(streak);
    const boostedAmount = Math.floor(reward.amount * multiplier);

    simulationResults.push({
      streakDay: streak,
      calendarDay: rewardDay,
      type: reward.field,
      baseAmount: reward.amount,
      multiplier: multiplier,
      boostedAmount: boostedAmount,
      message: reward.message,
    });
  }

  return simulationResults;
}

// Example usage
console.log(simulateStreakRewards(14));


module.exports = {
  getStreakDailyReward,
};
