


const rarityConfig = {
    normal: {
        threshold: 0.6,
        coinsRange: [15, 30], 
        itemCount: 0, 
        customItems: null, 
    },

    rare1: {
        threshold: 0.80,
        coinsRange: [20, 40],
        itemCount: 2,
        customItems: [
            'HAT:gang_mask','HAT:hot_angel','HAT:gang_mask_glow',
                'HAT:factory','HAT:star_grey','HAT:star_purple',
                'HAT:star_bw','HAT:star_multi','HAT:twists',
                'HAT:sunny_fire','HAT:hot_cheeto','HAT:fuzzy_heart',
                'HAT:cyber','HAT:clown','HAT:dirtypixels',
                'HAT:magic','HAT:glow_hero','HAT:chiller',
                'HAT:tropical','HAT:dream_guard','HAT:pixel_glasses',
                'HAT:wizard','HAT:lucky_plucky','HAT:astro',
                'HAT:diver','HAT:mod_cut','HAT:arcade',
                'HAT:chef','HAT:robot','HAT:cracker',
                'HAT:magicstone','HAT:santa','HAT:new_year',
                'HAT:explorer','HAT:weird_mask','HAT:chrono',
                'HAT:netjump','HAT:pumpkin'
        ],
    },

    rare2: {
        threshold: 0.90,
        coinsRange: [25, 50],
        itemCount: 2,
        customItems: [
              'TOP:gang','TOP:hot_angel','TOP:factory',
                'TOP:star_grey','TOP:star_purple','TOP:star_bw',
                'TOP:star_multi','TOP:basic','TOP:sunny_fire',
                'TOP:hot_cheeto','TOP:fuzzy_heart','TOP:cyber',
                'TOP:clown','TOP:pixel_nthing','TOP:magic',
                'TOP:glow_hero','TOP:chiller','TOP:tropical',
                'TOP:dream_guard','TOP:wizard','TOP:astro',
                'TOP:random','TOP:chef','TOP:robot',
                'TOP:cracker','TOP:magicstone','TOP:santa',
                'TOP:netjump','TOP:pumpkin'
        ],
    },

    rare3: {
        threshold: 0.96,
        coinsRange: [30, 60],
        itemCount: 2,
        customItems: [
            "I001", "I002", "I003", "I004", "I005", "I007", "I008", "I009",
            "I010",
        ],
    },

    rare4: {
        threshold: 0.9995,
        coinsRange: [40, 70],
        itemCount: 2,
        customItems: [
            "P001", "P002", "P003", "P004", "P005", "P006", "P007", "P008"
        ],
    },

    legendary: {
        threshold: 1,
        coinsRange: [130, 200],
        itemCount: 2, 
        customItems: [
            "A029", "I011"
        ],
    },
};





function calculateRarityPercentages() {
    const rarityPercentages = {};
    let previousThreshold = 0;

    for (const [rarity, config] of Object.entries(rarityConfig)) {
        const percentage = ((config.threshold - previousThreshold) * 100).toFixed(2) + '%';
        rarityPercentages[rarity] = parseFloat(percentage) + '%';
        previousThreshold = config.threshold;
    }

    return rarityPercentages;
}

// Call calculateRarityPercentages to log the percentages at runtime
const rarityPercentages = calculateRarityPercentages(); 

console.log(rarityPercentages)

module.exports = {
    rarityPercentages,
    rarityConfig,
}


/* old 


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

*/ 
