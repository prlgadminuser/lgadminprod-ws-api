const { userCollection, shopcollection, userInventoryCollection, client } = require('./../idbconfig');

async function buyItem(username, offerKey, owneditems) {
  const session = client.startSession();
  try {
    // Fetch shop data and the selected offer using offerKey
    const shopData = await shopcollection.findOne(
      { _id: "dailyItems" },
      { projection: { [`items.${offerKey}`]: 1 } }
    );

    const selectedOffer = shopData?.items?.[offerKey];
    if (!selectedOffer) throw new Error("Offer is not valid.");

    const { currency = "coins", quantity = 1 } = selectedOffer;
    const itemIds = Array.isArray(selectedOffer.itemId) ? selectedOffer.itemId : [selectedOffer.itemId];

    // Check if any of the itemIds already exist
    const alreadyOwned = await userInventoryCollection.findOne(
      {
        username: username,
        itemid: { $in: itemIds },
      },
      {
        hint: "player_item_unique",
        projection: { itemid: 1, _id: 0 },
      }
    );

    if (alreadyOwned) {
      throw new Error("You already own an item from this offer.");
    }

    const userRow = await userCollection.findOne(
      { "account.username": username },
      { projection: { [`currency.${currency}`]: 1 } }
    );

    if (!userRow) throw new Error("User not found.");

    const price = parseInt(selectedOffer.price, 10);
    if ((userRow.currency[currency] || 0) < price) {
      throw new Error(`Not enough ${currency} to buy the offer.`);
    }

    let updateFields = {};
    const isItemPurchase = true;

    if (!isItemPurchase) {
      updateFields.$inc = { "currency.boxes": quantity };
    }

    if (price > 0) {
      updateFields.$inc = {
        ...(updateFields.$inc || {}),
        [`currency.${currency}`]: -price,
      };
    }

    await session.withTransaction(async () => {
      // Insert inventory items
      const documentsToInsert = itemIds.map(itemId => ({
        username,
        itemid: itemId,
        // timestamp: new Date(),
      }));

      await userInventoryCollection.insertMany(documentsToInsert, {
        session,
      });

      await userCollection.updateOne(
        { "account.username": username },
        updateFields,
        { session }
      );
    });

    itemIds.forEach(id => owneditems.add(id));

    return { message: "Offer bought successfully." };
  } catch (error) {
    throw new Error(error.message || "An error occurred while processing your request.");
  } finally {
    await session.endSession();
  }
}

module.exports = {
  buyItem,
};
