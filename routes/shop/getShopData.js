const { shopcollection } = require('../..//idbconfig');


async function getshopdata() {

  try {
    // Fetch the shop data for the daily items
 //  const dailyItemsConfig = "dailyItems";
    const itemshop = global.cached_shopdata

    if (!itemshop) {
      throw new Error("Shop configuration not found");
    }

//    return {
     // offers: itemshop.offers || [], // Return the daily items, ensuring there's a default empty array if not found
    //  shoptheme: itemshop.shop_background_theme || null,  // Return shop theme, defaulting to null if not found
    //  next_update: itemshop.next_shop_update  // Server's shop next reset time

    return global.cached_shopdata_compressed 

  } catch (error) {
    // Log error if necessary, but for now throw the error to propagate it
    throw new Error(`Error fetching shop data: ${error.message}`);
  }
}

module.exports = {
  getshopdata
}
