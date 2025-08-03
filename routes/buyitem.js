
const { userCollection, shopcollection, userInventoryCollection, client } = require('./../idbconfig');

async function buyItem(username, offerKey, owneditems) {
  try {
    // Fetch shop data and the selected offer using offerKey
    const shopData = await shopcollection.findOne(
      { _id: "dailyItems" },
      { projection: { [`items.${offerKey}`]: 1 } }
    );
    // If the offer is not found, throw an error
    const selectedOffer = shopData?.items?.[offerKey];
    if (!selectedOffer) {
      throw new Error("Offer is not valid.");
    }
    // Get the currency field from the offer
    const { currency = "coins" } = selectedOffer; // Default to "coins" if currency is not specified

    // Normalize itemIds to an array (handle single or bundled items)
    const itemIds = Array.isArray(selectedOffer.itemId)
      ? selectedOffer.itemId
      : [selectedOffer.itemId];

    const OwnsOfferItems = await userInventoryCollection.findOne(
      {
        uid: username,
        id: { $in: itemIds },  // Checks if any itemid matches in the array
      },
      {
        hint: "player_item_unique",
        projection: { id: 1, _id: 0 }, // Optionally return only the matching itemid
      }
    );
    //const user = itemIds.some(id => owneditems.has(id));

    if (OwnsOfferItems) {
      throw new Error("You already own an item from this offer.");
    }

    const userRow = await userCollection.findOne(
      { "account.username": username },
      { projection: { [`currency.${currency}`]: 1 } }  // Fetch user's balance dynamically
    );

    if (!userRow) {
      throw new Error("User not found.");
    }

    const price = parseInt(selectedOffer.price, 10);
    if ((userRow.currency[currency] || 0) < price) {
      throw new Error(`Not enough ${currency} to buy the offer.`);
    }

    const isItemPurchase = true
    let updateFields = {};

    if (!isItemPurchase) {
      updateFields = {
        $inc: { "currency.boxes": quantity }, // Increment the 'boxes' field by the quantity
      };
    }

    if (price > 0) {
      updateFields = {
        ...updateFields,
        $inc: { [`currency.${currency}`]: -price }, // Deduct the correct currency
      };
    }

    const session = client.startSession();


    try {
      await session.withTransaction(async () => {
        
        const baseTimestamp = Date.now();

        const documentsToInsert = itemIds.map((itemId, index) => ({
          uid: username,
          id: itemId,
          ts: baseTimestamp + index  // Ensure ts is unique and increasing
        }));

        await userInventoryCollection.insertMany(documentsToInsert, { session });

        if (Object.keys(updateFields).length > 0) {
          await userCollection.updateOne(
            { "account.username": username },
            updateFields,
            { session }
          );
        }
      });

    } catch (error) {
      throw error;
    } finally {
      await session.endSession();
    }

    itemIds.forEach(id => owneditems.add(id));

    return {
      message: `Offer bought successfully.`,
    };
  } catch (error) {
    throw new Error(error.message || "An error occurred while processing your request.");
  }
}

module.exports = {
  buyItem
};
