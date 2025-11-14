
const { QUESTS } = require("./config");
const { userQuestCollection } = require("../idbconfig");

async function CreateNewQuests(username, questTypeIds) {
  const now = Date.now();

  const numberOfQuests = 3

  // Filter quests from hardcoded list based on provided IDs
  let selectedQuests

  if (questTypeIds) {
  selectedQuests = QUESTS.filter(q => questTypeIds.includes(q.typeid));
  } else {
  const shuffled = QUESTS.sort(() => 0.5 - Math.random());
  selectedQuests = shuffled.slice(0, numberOfQuests);
  }

    const questDocs = selectedQuests.map(q => ({
    username: username,
    typeid: q.typeid,
    goal: q.goal,
    reward: q.reward,
    progress: 0,
    completed: false,
    assignedAt: now,
    expiresAt: now + q.expiring_time,
  }));

  // Insert all selected quests at once
  await userQuestCollection.insertMany(questDocs);
}




async function updateQuestProgress(username, userQuests, eventType, amount) {
  const now = Date.now();

  // Filter in-memory active quests that should be updated
  const activeQuests = userQuests.filter(
    q => q.goal.type === eventType && !q.completed && q.expiresAt > now
  );

  if (activeQuests.length === 0) return;

  // Collect IDs of the quests to update
  const questIds = activeQuests.map(q => q._id);

  // Update only those quests by _id using updateMany
  await userQuestCollection.updateMany(
    { _id: { $in: questIds } },
    [
      {
        $set: {
          progress: { $add: ["$progress", amount] },
          completed: { $gte: [{ $add: ["$progress", amount] }, "$goal.amount"] },
        },
      },
    ]
  );

  
  const completedQuests = activeQuests.filter(
    (q) => q.progress + amount >= q.goal.amount
  );

  const completedQuestsIds =  completedQuests.map(q => q._id);

  // Optionally log completed quests
  completedQuests.forEach(q => {
      console.log(`🎉 Quest '${q.typeid}' completed for user '${username}'`);
  });

   // Optionally delete completed quests
  if (completedQuestsIds.length > 0) {
    await userQuestCollection.deleteMany({ _id: { $in: completedQuestsIds } });
  }
  
}

// Example usage

  // Assign quest
 // await assignQuestsToUser(userId, ["get_kills"]);

  // Simulate progress update
 // await updateQuestProgress(userId, "kills", 1);



module.exports = {
  initQuestIndexes,
  CreateNewQuests,
  updateQuestProgress,
};
