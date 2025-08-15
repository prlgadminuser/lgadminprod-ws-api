const globalChatPlayers = new Map(); // playerId -> sendFunction
const chatHistory = [];
const maxMessages = 4;
const maxMessageLength = 60;

async function addPlayerToChat(playerId, ws) {
  if (globalChatPlayers.has(playerId)) {
    console.error('Duplicate player ID:', playerId);
    return false;
  }

  // Store only a lightweight send function
  globalChatPlayers.set(playerId, msg => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  });

  globalChatPlayers.get(playerId)({
    type: 'chat',
    msg: chatHistory,
    ccu: globalChatPlayers.size
  });

  return "connected";
}

async function removePlayerFromChat(playerId) {
  if (!globalChatPlayers.has(playerId)) return false;

  globalChatPlayers.delete(playerId);
  return "disconnected";
}

async function broadcastChatHistory() {
  const payload = { type: 'chat', msg: chatHistory, ccu: globalChatPlayers.size };
  for (const send of globalChatPlayers.values()) {
    send(payload);
  }
}

async function sendMessage(playerId, message) {
  if (!globalChatPlayers.has(playerId)) return false;

  let messageString = String(message).trim().replace(/\s+/g, ' ');
  if (!messageString || messageString.length > maxMessageLength) return;

  const filteredMessage = messageString.toLowerCase().includes('badword') 
    ? 'Filtered message' 
    : messageString;

  const timestamp = new Date().toLocaleTimeString();
  const user_roles = await getUserRoles(playerId);

  const newMessage = { t: timestamp, p: playerId, m: filteredMessage, rl: user_roles };
  chatHistory.push(newMessage);

  if (chatHistory.length > maxMessages) {
    chatHistory.splice(0, chatHistory.length - maxMessages);
  }

  broadcastChatHistory();
}

// Roles
const Admins = new Set(["Liquem"]);
const Designer = new Set(["Liquem"]);

async function getUserRoles(playerid) {
  const roles = [];
  if (Admins.has(playerid)) roles.push("Admin");
  if (Designer.has(playerid)) roles.push("Designer");
  return roles;
}

module.exports = {
  addPlayerToChat,
  removePlayerFromChat,
  broadcastChatHistory,
  sendMessage,
};
