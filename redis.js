// src/database/redisClient.js
const Redis = require("ioredis");
const REDIS_KEY = process.env.REDIS_KEY
const { connectedPlayers, SERVER_INSTANCE_ID } = require(".");

const rediskey = REDIS_KEY
const SERVER_HEARTBEAT_PREFIX = "wsApiServer_heartbeat:"
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

function kickPlayerBan(username) {
  const ws = connectedPlayers.get(username);

  if (ws && ws.close) {
    ws.send("client_kick");
    ws.close(4009, "You have been banned.");
  }
}

function kickPlayerNewConnection(username) {
  const ws = connectedPlayers.get(username);

  if (ws && ws.close) {
    ws.send("code:double");
    ws.close(4009, "You have been banned.");
  }
}





const clanMembers = new Map();  

/*publishClanUpdate("clan_abc123", {
    level: 12,
    memberCount: 48,
    badge: "legend",
    announcement: "Season reset complete!"
}); */

function AddPlayerToClan(ws, clubId) {
    if (!clanMembers.has(clubId)) {
        clanMembers.set(clubId, new Set());     
       subscribeToClan(clubId);
    }
    clanMembers.get(clubId).add(ws);

    ws.clanId = clubId;
}

// === When player disconnects ===
function RemovePlayerFromClan(ws) {
    if (!ws.clanId) return;

    const members = clanMembers.get(ws.clanId);
    if (members) {
        members.delete(ws);
        if (members.size === 0) {
            // Last player of this clan left this server → can unsubscribe
            unsubscribeFromClan(ws.clanId);
            clanMembers.delete(ws.clanId);
        }
    }
}

function subscribeToClan(clubId) {
    const channel = `club:${clubId}`;

    // Prevent duplicate subscriptions
    if (sub.isReady && !sub.subscriptions?.includes(channel)) {
        sub.subscribe(channel, (err) => {
            if (err) {
                console.error(`Failed to subscribe to ${channel}:`, err);
            } else {
                console.log(`Subscribed to clan channel: ${channel}`);
            }
        });
    }
}

function unsubscribeFromClan(clubId) {
    const channel = `club:${clubId}`;
    sub.unsubscribe(channel, (err) => {
        if (err) {
            console.error(`Failed to unsubscribe from ${channel}:`, err);
        } else {
            console.log(`Unsubscribed from ${channel}`);
        }
    });
}



async function publishClanUpdate(clubId, updateData = {}) {
    const channel = `club:${clubId}`;

    const message = {
        type: "clan_update",
        timestamp: Date.now(),
        payload: updateData
        // Example payload:
        // { level: 12, badge: "gold", memberCount: 47, announcement: "New event!" }
    };

    try {
        await pub.publish(channel, JSON.stringify(message));
        console.log(`Clan update published for ${clubId}`);
    } catch (err) {
        console.error("Publish failed:", err);
    }
}

async function HandleClanUpdate(data) {
  const channel = `club:${data.clubId}`;

  try {
    const localClanMembers = clanMembers.get(data.clubId);

    if (!localClanMembers || localClanMembers.size === 0) {
      // No one from this clan is connected to this server instance
      return;
    }

    const message = JSON.stringify({
        type: data.type,
        timestamp: data.timestamp,
        payload: data.payload || {}
    });

    for (const ws of localClanMembers) {
      if (clientWs.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }

    console.log(`Clan update delivered to ${localClanMembers.size} players on this server` );
  } catch (err) {
    console.error("Clan event processing error:", err);
  }
}
  



sub.on("message", (channel, message) => {
  const data = JSON.parse(message);
  const type = data.type;
  const username = data.uid;
  switch (type) {
    case "ban":
      kickPlayerBan(username);
      break;

    case "disconnect":
      kickPlayerNewConnection(username);
      break;

    case "clan_update":
      HandleClanUpdate(data);
      break;

    default:
      console.log(`Unknown event type: ${type}`);
  }
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


module.exports = { sub, addSession, removeSession, checkExistingSession, redisClient };
