// src/database/redisClient.js
const Redis = require("ioredis");
const { REDIS_KEY } = require("./ENV");
const { connectedPlayers, SERVER_INSTANCE_ID } = require(".");

const rediskey = REDIS_KEY
const SERVER_HEARTBEAT_PREFIX = "apiserver_heartbeat:"
const USER_PREFIX = "wsapiuser:"
const HEARTBEAT_INTERVAL_MS = 1000000
const HEARTBEAT_TTL_SECONDS = HEARTBEAT_INTERVAL_MS / 1000 * 3

const heartbeatKey = `${SERVER_HEARTBEAT_PREFIX}${SERVER_INSTANCE_ID}`;

const redisClient = new Redis(rediskey);
const sub = new Redis(rediskey);
//sub.subscribe(`server:${serverId}`); better scalable
redisClient.on("connect", () => console.log("Redis command client connected."));
redisClient.on("error", (err) => console.error("Redis command client error:", err));


sub.subscribe(`server:${SERVER_INSTANCE_ID}`, (err) => {
  if (err) console.error("Failed to subscribe to bans channel:", err);
  else console.log("Subscribed to bans channel.");
});

function kickPlayer(username) {
  const ws = connectedPlayers.get(username);

  if (ws && ws.close) {
    ws.send("client_kick");
    ws.close(4009, "You have been banned.");
  }
}

sub.on(`server:${SERVER_INSTANCE_ID}`, (channel, message) => {
  const data = JSON.parse(message);
  const username = data.uid
  kickPlayer(username);
});

function startHeartbeat() {
   redisClient.setex(heartbeatKey, HEARTBEAT_TTL_SECONDS, Date.now().toString());
    setInterval(async () => {
      try {
        await redisClient.setex(heartbeatKey, HEARTBEAT_TTL_SECONDS, Date.now().toString());
      } catch (error) {
        console.error("Error sending heartbeat to Redis:", error);
      }
    }, HEARTBEAT_INTERVAL_MS);
}

async function addSession(username) {
  const userKey = `${USER_PREFIX}${username}`;
  const sessionValue = JSON.stringify({ 
    sid: SERVER_INSTANCE_ID, 
    time: Date.now() 
  });

  await redisClient.set(userKey, sessionValue);
}

async function removeSession(username) {
  const userKey = `${USER_PREFIX}${username}`;
  await redisClient.del(userKey);
}

async function checkExistingSession(username) {
  const userKey = `${USER_PREFIX}${username}`;
  const sessionValue = await redisClient.get(userKey);

  if (!sessionValue) return null;

  let parsed;
  try {
    parsed = JSON.parse(sessionValue);
  } catch {
    return null;
  }

  const heartbeatKey = `${SERVER_HEARTBEAT_PREFIX}${parsed.sid}`;
  const isExistingServerAlive = await redisClient.exists(heartbeatKey);
  
  return isExistingServerAlive ? parsed.sid : null;
}


startHeartbeat()


module.exports = { sub, addSession, removeSession, checkExistingSession };
