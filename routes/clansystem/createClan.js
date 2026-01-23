const { ClansCollection, userCollection } = require("../../idbconfig");
const { DoesClanExist } = require("../../utils/utils");

const clanCreationPrice = {
  price: 500,
  currency: "coins",
};

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
        "clanMembers.userId": userId,
      },
      {
        hint: "clanMembers.userId_1",
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

    const clanData = {
      clanName: "New Clan", // ← should come from parameter in real code
      clanTag: "NEW", // ← should come from parameter or be generated
      joinType: joinType,
      clanMembers: [ownerMemberData],
      created_at: Date.now(),
      country_code: "XX",
    };

    const result = await ClansCollection.insertOne(clanData);
    return result; // return the new clan _id
  } catch (err) {
    console.error("Clan creation failed:", err);
    throw err;
  }
}

module.exports = {
  CreateClan,
  // Optional: export helper if needed elsewhere
  // findClanById,
};
