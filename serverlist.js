const serverlist = {
  EU: [
   // "wss://s1-eu-sdgame.onrender.com",
    "wss://eu.skilldown.io",
  ],
  AS: [
    "wss://s1-as-sdgame.onrender.com",     
  ],
  US: [
    "wss://s1-us-sdgame.onrender.com",     
  ],
};

const nearbyserver = {
  EU: new Set([
    "GB", "FR", "DE", "IT", "ES", "NL", "SE", "PL", "NO", "FI",
    "BE", "AT", "DK", "PT", "CZ", "HU", "IE", "RO", "GR", "CH",
    "SK", "SI", "HR", "BG", "LT", "LV", "EE", "LU", "MT", "CY"
  ]),
  US: new Set([
    "US", "CA", "MX", "BR", "AR", "CO", "CL", "PE", "VE", "EC",
    "GT", "CR", "PA", "UY", "BO", "PY", "DO", "HN", "NI", "SV"
  ]),
  AS: new Set([
    "JP", "CN", "IN", "KR", "SG", "TH", "VN", "MY", "PH", "ID",
    "PK", "BD", "LK", "AE", "SA", "IL", "IR", "KZ", "UZ", "QA",
    "OM", "KW", "BH", "JO", "SY", "IQ", "NP", "MM", "AF", "MN"
  ])
};


function getServerByCountry(countryCode) {
  const fallback = "US";

  if (!countryCode || countryCode === "Unknown") return fallback;

  countryCode = countryCode.toUpperCase();

  for (const [region, countriesSet] of Object.entries(nearbyserver)) {
    if (countriesSet.has(countryCode)) {
      return region;
    }
  }

  return fallback;
}

module.exports = {
  serverlist,
  getServerByCountry,
};



