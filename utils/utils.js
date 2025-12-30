const { userCollection, userInventoryCollection } = require("../idbconfig");


module.exports = {
  async SaveUserGrantedItems(userId, rewarditems, local_owned_items, session) {
    if (!items.length) return;


    const baseTimestamp = Date.now();

    const docs = rewarditems.map((id, index) => ({
      userid: userId,
      itemid: id,
      time: baseTimestamp + index,
    }));

   const result = await userInventoryCollection.insertMany(docs, {
      session,
    });

   if (result) rewarditems.forEach((item) => local_owned_items.add(item));
  },
};
