const { SaveUserGrantedItems, UserOwnsAnyItemsOfArray } = require("../../utils/utils");
const {
  userCollection,
  shopcollection,
  userItemsCollection,
  client,
} = require("../..//idbconfig");
const { getUserIdPrefix } = require('../../utils/utils');


async function buyItem(userId, offerKey, owneditems) {
  try {

    const shopData = global.cached_shopdata;
    const selectedOffer = shopData?.offers?.[offerKey];
    const currency = selectedOffer.pricing.currency;
    const price = parseInt(selectedOffer.pricing.price, 10);
    const isOfferFree = price === 0

    if (!selectedOffer) throw new Error("Offer is not existing.");

    if (Date.now() > selectedOffer.data.expires_at) {
      throw new Error("Offer is expired.");
    }

    const rewards = selectedOffer.rewards || [];

    const itemRewards = rewards
      .filter(r => r.type === "item")
      .map(r => r.id);

    const currencyRewards = rewards
      .filter(r => r.type === "currency");

    const userRow = isOfferFree ? "currency" = {
     currency: 0,
    } : await userCollection.findOne(
      getUserIdPrefix(userId),
      { projection: { [`currency.${currency}`]: 1 } }
    );

    if (!userRow) throw new Error("User not found.");

    if ((userRow.currency?.[currency] || 0) < price) {
      throw new Error(`Not enough ${currency} to buy the offer.`);
    }

    if (itemRewards.length > 0) {
      const OwnsOneOrMoreOfferItems =
        await UserOwnsAnyItemsOfArray(userId, itemRewards);

      if (OwnsOneOrMoreOfferItems) {
        throw new Error("You already own one or more items from this offer.");
      }
    }

    const updateFields = {};

    if (price > 0) {
      updateFields.$inc = {
        ...(updateFields.$inc || {}),
        [`currency.${currency}`]: -price
      };
    }

    for (const reward of currencyRewards) {
      updateFields.$inc = {
        ...(updateFields.$inc || {}),
        [`currency.${reward.id}`]: reward.amount
      };
    }

    const session = client.startSession();

    try {

      await session.withTransaction(async () => {

        if (itemRewards.length > 0) {
          await SaveUserGrantedItems(userId, itemRewards, owneditems, session);
        }

        if (Object.keys(updateFields).length > 0) {
          await userCollection.updateOne(
            getUserIdPrefix(userId),
            updateFields,
            { session }
          );
        }

      });

    } finally {
      await session.endSession();
    }

    return {
      message: `Offer bought successfully.`,
    };

  } catch (error) {
    throw new Error(
      error || "An error occurred while processing your request."
    );
  }
}

module.exports = {
  buyItem,
};
