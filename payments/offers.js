
const getCoinOffer = (offerId, coins, price, image_url, is_bonus = false) => ({
  items: [
    {
      id: offerId,
      name: `${coins} Coins`,
      description: `${coins} coins for your Skilldown account!`,
      image_url: image_url,
      price: price,
      quantity: 1,
      is_bonus: is_bonus
    }
  ]
});



const OFFERS = {
  coins_small: getCoinOffer("coins_small", 500, 0.99, "https://cdn3.xsolla.com/img/misc/images/aa9b21f106235b866f4ba808f8a12afa.png"),
  coins_medium: getCoinOffer("coins_medium", 1100, 1.99, "https://cdn3.xsolla.com/img/misc/images/aa9b21f106235b866f4ba808f8a12afa.png"),
  coins_large: getCoinOffer("coins_large", 5000, 9.99, "https://cdn3.xsolla.com/img/misc/images/aa9b21f106235b866f4ba808f8a12afa.png"),
  coins_mega: getCoinOffer("coins_mega", 12000, 19.99, "https://cdn3.xsolla.com/img/misc/images/aa9b21f106235b866f4ba808f8a12afa.png"),
  coins_ultra: getCoinOffer("coins_ultra", 25000, 39.99, "https://cdn3.xsolla.com/img/misc/images/aa9b21f106235b866f4ba808f8a12afa.png"),
  coins_bonus: getCoinOffer("coins_bonus", 50000, 69.99, "https://cdn3.xsolla.com/img/misc/images/aa9b21f106235b866f4ba808f8a12afa.png"),

  special_items_pack: {
    items: [
      {
        id: "coins",                  // Must match SKU in your Xsolla Publisher Account
        name: "1000 Coins",
        description: "1000 coins for your Skilldown account!",
        image_url: "https://cdn3.xsolla.com/img/misc/images/aa9b21f106235b866f4ba808f8a12afa.png",
        price: 0.99,                  // Real money price (USD here)
        quantity: 1,
        is_bonus: true
      }
    ]
  },
};

const OFFERKEYS = Object.keys(OFFERS)


module.exports = {
  OFFERS,
  OFFERKEYS
}
