


const rarityConfig = {
    normal: {
        threshold: 0.8,
        coinsRange: [15, 30], 
        itemCount: 0, 
        customItems: null, 
        message: "success",
    },

    rare: {
        threshold: 0.99925,
        coinsRange: [15, 25],
        itemCount: 2, 
        customItems: [
            "A003", "A004", "A005", "A006", "A007", "A008", "A009", "A010",
            "A011", "A012", "A013", "A014", "A015", "A016", "A017", "A018",
            "A019", "A020", "A021", "A022", "A023", "A025", "A026", "A030",
            "A031", "A034", "B001", "B002", "B003", "B004", "B005", "B006",
            "B007", "B008", "B009", "B010", "B011", "B012", "B013", "B014",
            "B015", "B016", "B017", "B018", "B019", "B020", "B024", "B025",
            "I001", "I002", "I003", "I004", "I005", "I007", "I008", "I009",
            "I010", "P001", "P002", "P003", "P004", "P005", "P006", "P007",
            "P008"
        ],

        message: "success",
    },
    
    legendary: {
        threshold: 1,
        coinsRange: [130, 200],
        itemCount: 2, 
        customItems: [
            "A029", "I011"
        ],
        message: "success",
    },
};





function calculateRarityPercentages() {
    const rarityPercentages = {};
    let previousThreshold = 0;

    for (const [rarity, config] of Object.entries(rarityConfig)) {
        const percentage = ((config.threshold - previousThreshold) * 100).toFixed(2) + '%';
        rarityPercentages[rarity] = parseFloat(percentage);
        previousThreshold = config.threshold;
    }

    return rarityPercentages;
}

// Call calculateRarityPercentages to log the percentages at runtime
const rarityPercentages = calculateRarityPercentages(); 

module.exports = {
    rarityPercentages,
    rarityConfig,
}
