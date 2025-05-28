const { userCollection, shopcollection, ItemsCertificatesCollection } = require('./../idbconfig');

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
    const { quantity = 1 } = selectedOffer; // Get the quantity if it's specified

    // Normalize itemIds to an array (handle single or bundled items)
    const itemIds = Array.isArray(selectedOffer.itemId)
      ? selectedOffer.itemId
      : [selectedOffer.itemId];


    // Check if the user already owns any item in the offer
   const user = await userCollection.findOne({
  "account.username": username,         // Search inside account.username
  "inventory.items": { $in: itemIds },  // Check if user owns the item
});


    //const user = itemIds.some(id => owneditems.has(id));

    if (user) {
      throw new Error("You already own an item from this offer.");
    }

    // Fetch the user's balance for the specified currency
    const userRow = await userCollection.findOne(
      { "account.username": username },
      { projection: { [`currency.${currency}`]: 1 } }  // Fetch user's balance dynamically
    );

    if (!userRow) {
      throw new Error("User not found.");
    }

    // Check if the user has enough balance to buy the offer
    const price = parseInt(selectedOffer.price, 10); // Ensure price is a number
    if ((userRow.currency[currency] || 0) < price) {
      throw new Error(`Not enough ${currency} to buy the offer.`);
    }

    // Check if it's a normal item, box purchase, or season coin pack
    const isItemPurchase = !selectedOffer.itemId.includes("box") && !selectedOffer.itemId.includes("seasoncoins");
    const isBoxPurchase = selectedOffer.itemId.includes("box");
    const isSeasonCoinPack = selectedOffer.itemId.includes("seasoncoins");

    let updateFields = {};

    // Handle normal item purchase
    if (isItemPurchase) {
      updateFields = {
        $addToSet: { "inventory.items": { $each: itemIds } }, // Add the normal item(s)
      };
    }

    // Handle box purchases
    if (isBoxPurchase) {
      updateFields = {
        $inc: { "currency.boxes": quantity }, // Increment the 'boxes' field by the quantity
      };
    }

    // Handle season coin pack purchases
    if (isSeasonCoinPack) {
      updateFields = {
        $inc: { "currency.seasonCoins": quantity }, // Increment the 'seasonCoins' field by the quantity
      };
    }

    // Only deduct currency if the price is greater than zero
    if (price > 0) {
      updateFields = {
        ...updateFields,
        $inc: { [`currency.${currency}`]: -price }, // Deduct the correct currency
      };
    }

    // Deduct currency and update the user's inventory or purchase quantity in a single update operation
    await userCollection.updateOne(
      { "account.username": username },  // Search by account.username
      updateFields
    );

   // const documents = itemIds.map(id => ({
   //  iid: `${username}$${id}`,
    //}));

  // await ItemsCertificatesCollection.insertMany(documents);

    itemIds.forEach(id => owneditems.add(id));

    return {
      message: `Offer bought successfully.`,
    };
  } catch (error) {
    console.log(error)
    throw new Error(error.message || "An error occurred while processing your request.");
  }
}

module.exports = {
  buyItem
};
