const { userCollection, userInventoryCollection } = require("../idbconfig");

userCollection;

module.exports = {
  async SaveUserItemRewards(userId, rewarditems, local_owned_items) {
    if (!items.length) return;

    rewarditems.forEach((item) => local_owned_items.add(item));

    const baseTimestamp = Date.now();

    const docs = rewarditems.map((id, index) => ({
      uid: userId,
      id: id,
      ts: baseTimestamp + index,
    }));

    await userInventoryCollection.insertMany(docs);
  },
};
