const { shopcollection } = require('./../idbconfig');

async function getshopdata() {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Reset time to 00:00:00 for consistency
  const t0am = currentDate.getTime();

  try {
    // Fetch the shop data for the daily items
    const dailyItemsConfig = "dailyItems";
    const itemshop = await shopcollection.findOne({ _id: dailyItemsConfig });

    if (!itemshop) {
      throw new Error("Shop configuration not found");
    }

    return {
      dailyItems: itemshop.items || [], // Return the daily items, ensuring there's a default empty array if not found
      shoptheme: itemshop.theme || null,  // Return shop theme, defaulting to null if not found
      server_nexttime: t0am  // Server's next reset time
    };
  } catch (error) {
    // Log error if necessary, but for now throw the error to propagate it
    throw new Error(`Error fetching shop data: ${error.message}`);
  }
}

module.exports = {
  getshopdata,
};
