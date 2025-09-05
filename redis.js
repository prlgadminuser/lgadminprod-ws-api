// src/database/redisClient.js
const Redis = require("ioredis");
const { REDIS_KEY } = require("./ENV");
const { connectedPlayers } = require(".");

const sub = new Redis(REDIS_KEY);

sub.subscribe("bans", (err) => {
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

sub.on("message", (channel, message) => {
  const data = JSON.parse(message);
  const username = data.uid
  kickPlayer(username);
});

module.exports = { sub };
