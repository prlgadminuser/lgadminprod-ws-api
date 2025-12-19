
const OFFERS = {
  coins_1000: {
    description: "1000 Coins for your Skilldown account!",
    image_url: "https://cdn3.xsolla.com/img/misc/images/aa9b21f106235b866f4ba808f8a12afa.png",
    items: [
      {
        id: "coins",                  // Must match SKU in your Xsolla Publisher Account
        name: "1000 Coins",
        description: "1000 coins for your Skilldown account!",
        image_url: "https://cdn3.xsolla.com/img/misc/images/aa9b21f106235b866f4ba808f8a12afa.png",
        price: 0.99,                  // Real money price (USD here)
        quantity: 1,
        is_bonus: false
      }
    ]
  },

  // Example of another offer (add as many as you want)
  premium_pack: {
    description: "Premium Pack - Coins + Bonus Item",
    image_url: "https://example.com/premium.png",
    items: [
      {
        id: "premium_coins",
        name: "5000 Coins",
        description: "Premium coin bundle",
        image_url: "https://example.com/coins.png",
        price: 4.99,
        quantity: 1
      },
      {
        id: "bonus_item",
        name: "Exclusive Skin",
        description: "Limited edition skin",
        image_url: "https://example.com/skin.png",
        price: 0.00,  // Free bonus item
        quantity: 1,
        is_bonus: true
      }
    ]
  }

  // Add more offers here...
};


module.exports = OFFERS