const { ObjectId } = require("mongodb");
const { userItemsCollection, userCollection } = require("../idbconfig");

module.exports = {

  getUserIdPrefix(userId) {
    return { _id: new ObjectId(userId) }
  },

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

    return result;
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

  async DoesUserIdExist(userId) {
    const userIdExist = await userCollection.findOne(getUserIdPrefix(userId));

    return userIdExist;
  },

  async DoesUserNameExist(nameToCheck) {
    const nameExists = await userCollection.findOne(
      { "account.username": nameToCheck },
      {
        collation: { locale: "en", strength: 2 },
        hint: "account.username_1",
      }
    );

    return nameExists;
  },
};

