


    const serverlist = {  // available server adresses - is send with the inventory when the player logs in
        EU: [
          "wss://s1-eu-sdgame.onrender.com"
        ],
        US: [
          "wss://s1-us-sdgame.onrender.com",     
        ]
      };
      
      module.exports = {
        serverlist
      };


      const nearbyserver = {
        EU: ["GB", "FR", "DE", "IT", "ES", "NL", "SE", "PL", "NO", "FI"],
        NA: ["US", "CA", "MX"],
        AS: ["JP", "CN", "IN", "KR", "SG", "TH", "VN"]
    };

      function getServerByCountry(countryCode) {
  
        const fallback = US
    
        if (countryCode === "Unknown") return fallback; // Handle empty or undefined input
    
        countryCode = countryCode.toUpperCase(); // Normalize input
    
        for (const [region, countries] of Object.entries(nearbyserver)) {
            if (countries.includes(countryCode)) {
                return `${region} Server`;
            }
        }
    
        return fallback; // Fallback if no match
    }
    
      

  module.exports = {
    serverlist,
    getServerByCountry,
  }
  
  