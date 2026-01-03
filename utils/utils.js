const { userItemsCollection } = require("../idbconfig");

module.exports = {
  async SaveUserGrantedItems(userId, rewarditems, local_owned_items, session) {
    if (!rewarditems.length) return;

    const baseTimestamp = Date.now();

    const docs = rewarditems.map((id, index) => ({
      userid: userId,
      itemid: id,
      time: baseTimestamp + index,
    }));

    const result = await userItemsCollection.insertMany(docs, {
      session,
    });

    if (result) rewarditems.forEach((item) => local_owned_items.add(item));
  },

  async UserOwnsAnyItemsOfArray(userId, itemsToCheck) {
    const OwnsOneOrMoreOfferItems = await userItemsCollection.findOne(
      {
        userid: userId,
        itemid: { $in: itemsToCheck }, // Checks if any itemid matches in the array
      },
      {
        hint: "player_item_unique",
        projection: { userid: 1, _id: 0 }, // Optionally return only the matching itemid
      }
    );

    return OwnsOneOrMoreOfferItems;
  },

   async UserNameExists(userId, itemsToCheck) {
    const OwnsOneOrMoreOfferItems = await userItemsCollection.findOne(
      {
        userid: userId,
        itemid: { $in: itemsToCheck }, // Checks if any itemid matches in the array
      },
      {
        hint: "player_item_unique",
        projection: { userid: 1, _id: 0 }, // Optionally return only the matching itemid
      }
    );

    return OwnsOneOrMoreOfferItems;
  },
};
