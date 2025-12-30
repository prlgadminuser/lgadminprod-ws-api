const { SaveUserGrantedItems } = require("../utils/utils");
const {
  userCollection,
  shopcollection,
  userInventoryCollection,
  client,
} = require("./../idbconfig");


async function buyItem(username, offerKey, owneditems) {
  try {
    //  const shopData = await shopcollection.findOne(
    //   { _id: "ItemShop" },
    //   { projection: { [`items.${offerKey}`]: 1 } }
    // );

    const shopData = global.cached_shopdata;

    // If the offer is not found, throw an error
    const selectedOffer = shopData?.offers?.[offerKey];

    if (!selectedOffer) throw new Error("Offer is not existing.");

    // we cache shopdata so in case shopdata fails at updating we prevent that a player can buy an expired item
    if (Date.now() > selectedOffer.data.expires_at) throw new Error("Offer is expired.");

    if (!selectedOffer) throw new Error("Offer is not valid.");
  
    // Get the currency field from the offer
    const items = selectedOffer.items;
    const currency = selectedOffer.pricing.currency; // Default to "coins" if currency is not specified
    const price = parseInt(selectedOffer.pricing.price, 10);


      const userRow = await userCollection.findOne(
      { "account.username": username },
      { projection: { [`currency.${currency}`]: 1 } } // Fetch user's balance dynamically
    );

    if (!userRow) {
      throw new Error("User not found.");
    }

   if ((userRow.currency[currency] || 0) < price) {
      throw new Error(`Not enough ${currency} to buy the offer.`);
    }

    const OwnsOneOrMoreOfferItems = await userInventoryCollection.findOne(
      {
        userid: username,
        itemid: { $in: items }, // Checks if any itemid matches in the array
      },
      {
        hint: "player_item_unique",
        projection: { userid: 1, _id: 0 }, // Optionally return only the matching itemid
      }
    );
    //const user = itemIds.some(id => owneditems.has(id));

    if (OwnsOneOrMoreOfferItems) {
      throw new Error("You already own one or more items from this offer.");
    }

    let updateFields = {};

    if (selectedOffer.type === "boxes") {
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

      await SaveUserGrantedItems(username, items, owneditems, session)

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

    return {
      message: `Offer bought successfully.`,
    };
  } catch (error) {
    throw new Error(
      error.message || "An error occurred while processing your request."
    );
  }
}

module.exports = {
  buyItem,
};
