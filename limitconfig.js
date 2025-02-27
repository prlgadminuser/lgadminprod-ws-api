
const { Limiter, RateLimiterMemory } = require('./index');


const friendUpdatesTime = 20000
const ws_message_size_limit = 50
const api_message_size_limit = 120
const pingInterval = 60000;
const maxClients = 20; // max connected players for websocket


const WS_MSG_SIZE_LIMIT = {
  max_key_length: 15,
  max_value_length: 20
}


function createRateLimiter() { // connected sending message rate limit
  const rate = 5;
  return new Limiter({
    tokensPerInterval: rate,
    interval: 1000, // milliseconds
  });
}

const getClientCountry = (req) => {
  const clientcountry = req.headers['cf-ipcountry'] || "Unknown"

  return clientcountry
};

const getClientIp = (req) => {
  const clientip = req.headers['true-client-ip'] || req.connection.remoteAddress;

  if (!clientip) throw new Error("error: ip not defined");

  return clientip
};
// back4app ip = req.headers['x-forwarded-for']?.split(',')[0]
// render ip = req.headers['true-client-ip']
// test ip = req.connection.remoteAddress;

const ConnectionOptionsRateLimit = { 
  points: 1, // Number of points
  duration: 2, // Per second
};

const apiRateLimiter = new RateLimiterMemory({
    points: 3,  // 10 requests per second
    duration: 1,
});

const AccountRateLimiter = new RateLimiterMemory({
  points: 2,  // 10 requests per second
  duration: 86400,
});

const allowedOrigins = [
    "https://slcount.netlify.app",
    "https://slgame.netlify.app",
    "https://serve.gamejolt.net",
    "http://serve.gamejolt.net",
    "tw-editor://.",
    "https://html-classic.itch.zone",
    "null",
    "https://turbowarp.org",
    "https://liquemgames.itch.io/sr",
    "https://skilldown.netlify.app",
    "https://uploads.ungrounded.net",
    "https://prod-dpgames.crazygames.com",
    "https://crazygames.com",
    "https://crazygames.com/game/skilled-royale",
    "https://s-ri0p-delgae.netlify.app",
];




module.exports = {
  createRateLimiter,
  ConnectionOptionsRateLimit,
  apiRateLimiter,
  AccountRateLimiter,
  getClientIp,
  getClientCountry,
  ws_message_size_limit,
  api_message_size_limit,
  maxClients,
  pingInterval,
  allowedOrigins,
  friendUpdatesTime,
  WS_MSG_SIZE_LIMIT
}
