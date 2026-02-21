const { ClansCollection, userCollection } = require("../../idbconfig");
const { DoesClanExist, getUserIdPrefix } = require("../../utils/utils");

const clanCreationPrice = {
  price: 500,
  currency: "coins",
};

const ValidScoreRequirementRanges = new Set([0,1000,2000,3000,4000,5000]);

const ValidJoinTypes = new Set(["Open", "InviteOnly", "Closed"]);

// Helper to check if a clan exists and return it (or null)

async function CreateClan(userId, joinType) {
  if (!ValidJoinTypes.has(joinType)) {
    throw new Error(
      `Invalid join type. Allowed: ${[...ValidJoinTypes].join(", ")}`,
    );
  }

  try {
    const isUserAlreadyinAnyClan = await ClansCollection.findOne(
      {
        "members.userId": userId,
      },
      {
        hint: "members.userId_1",
      },
    );

    if (isUserAlreadyinAnyClan)
      throw new Error(`creating clan user is already in a clan`);

    const userRow = await userCollection.findOne(getUserIdPrefix(userId), {
      projection: { [`currency.${clanCreationPrice.currency}`]: 1 },
    });

    if (!userRow) {
      throw new Error("User not found.");
    }

    if (
      userRow.currency[clanCreationPrice.currency] < clanCreationPrice.price
    ) {
      throw new Error(
        `Not enough ${clanCreationPrice.currency} to buy clan creation.`,
      );
    }

    const BuyClanCreation = await userCollection.updateOne(getUserIdPrefix(userId), {
      $inc: {
        [`currency.${clanCreationPrice.currency}`]: -clanCreationPrice.price,
      },
    });

    if (!BuyClanCreation) {
      throw new Error("Purchase not completed");
    }

    const ownerMemberData = {
      userId: userId,
      role: "owner",
      joined_at: Date.now(),
    };


    const clanMetadata = {
      name: "New Clan", // ← should come from parameter in real code
      tag: "NEW", // ← should come from parameter r be generated
      description: "No description",
      joinType: joinType,
    };

    const clanInfo = {
      created_at: Date.now(),
      country_code: "XX",
    };

    const clanData = {

      metadata: clanMetadata,
      members: [ownerMemberData],
      info: clanInfo
    };

    const result = await ClansCollection.insertOne(clanData);
    return result; // return the new clan _id
  } catch (err) {
   // console.error("Clan creation failed:", err);
    throw err;
  }
}

module.exports = {
  CreateClan,
  // Optional: export helper if needed elsewhere
  // findClanById,
};
