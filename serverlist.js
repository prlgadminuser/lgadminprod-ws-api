


const serverlist = {  // available server adresses - is send with the inventory when the player logs in
  EU: [
    "wss://s1-eu-sdgame.onrender.com"
  ],
  AS: [
    "wss://s1-as-sdgame.onrender.com",     
  ],
  US: [
    "wss://s1-us-sdgame.onrender.com",     
  ],
};

      
      module.exports = {
        serverlist
      };


      const nearbyserver = {
        EU: [
            "GB", "FR", "DE", "IT", "ES", "NL", "SE", "PL", "NO", "FI", 
            "BE", "AT", "DK", "PT", "CZ", "HU", "IE", "RO", "GR", "CH"
        ],
        US: [
            "US", "CA", "MX", "BR", "AR", "CO", "CL", "PE", "VE", "EC"
        ],
        AS: [
            "JP", "CN", "IN", "KR", "SG", "TH", "VN", "MY", "PH", "ID", 
            "PK", "BD", "LK", "AE", "SA", "IL", "IR", "KZ", "UZ", "QA"
        ]
    };
    

      function getServerByCountry(countryCode) {
  
        const fallback = "US"
    
        if (countryCode === "Unknown") return fallback; // Handle empty or undefined input
    
        countryCode = countryCode.toUpperCase(); // Normalize input
    
        for (const [region, countries] of Object.entries(nearbyserver)) {
            if (countries.includes(countryCode)) {
                return `${region}`;
            }
        }
    
        return fallback; // Fallback if no match
    }
    
      

  module.exports = {
    serverlist,
    getServerByCountry,
  }
  
  