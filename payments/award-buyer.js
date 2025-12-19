const { userCollection } = require("../idbconfig");
const OFFERS = require("./offers");

async function awardBuyer(userid, offerid) {
  const offer = OFFERS[offerid];
  if (!offer) {
    return false;
  }

  try {
    let result;

    switch (offerid) {

      case "coins_1000":
        result = await userCollection.updateOne(
          { "account.usernme": userid },
          { $inc: { "currency.coins": 1000 } }
        );
        break;

      case "coins_5000":
        result = await userCollection.updateOne(
          { "account.username": userid },
          { $inc: { "currency.coins": 5000 } }
        );
        break;

      default:
        return false;
    }

    // Ensure update actually succeeded
    if (!result || result.matchedCount !== 1 || result.modifiedCount !== 1) {
      return false;
    }

    return true;

  } catch {
    return false;
  }
}

module.exports = {
    awardBuyer

}
