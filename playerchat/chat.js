

const globalChatPlayers = new Map();
const chatHistory = [];
const maxMessages = 4;

const maxMessageLength = 60;

async function addPlayerToChat(playerId, ws) {
  // If the player is already in the chat
  if (globalChatPlayers.has(playerId)) {
    console.error('Duplicate player ID:', playerId);
    return false;
  }

  // Add player to the global chat players map
  globalChatPlayers.set(playerId, { ws });

  // Send the entire chat history to the new connection
  ws.send(JSON.stringify({ type: 'chat', msg: chatHistory, ccu: globalChatPlayers.size }));



  return "connected";
}

async function removePlayerFromChat(playerId) {
  // If the player doesn't exist in the chat
  if (!globalChatPlayers.has(playerId)) {
    return false;
  }
  // Remove player from the global chat players map
  globalChatPlayers.delete(playerId);

  return "disconnected";
}

async function broadcastChatHistory(message) {
  // Broadcast the updated chat history to all connected players
  for (const player of globalChatPlayers.values()) {
    player.ws.send(JSON.stringify({ type: 'chat', msg: chatHistory, ccu: globalChatPlayers.size }));
  }
}


async function sendMessage(playerId, message) {

  let messageString = String(message).trim().replace(/\s+/g, ' ');

  if (!globalChatPlayers.has(playerId)) {
    return false;
  }

  // Validate message length
  if (messageString.length === 0 || messageString.length > maxMessageLength) {
    return;
  }

  // Rate limit messages


  // Filter out inappropriate content
  const filteredMessage = messageString.toLowerCase().includes('badword')
    ? 'Filtered message'
    : messageString;

  const timestamp = new Date().toLocaleTimeString();

  const user_roles = await getUserRoles(playerId)

  const newMessage = {
    t: timestamp,
    p: playerId,
    m: filteredMessage,
    rl: user_roles
  };

  // Add message to the chat history
  chatHistory.push(newMessage);

  // Trim chat history to the last 'maxMessages' messages
  if (chatHistory.length > maxMessages) {
    chatHistory.splice(0, chatHistory.length - maxMessages);
  }

  // Broadcast the updated chat history to all connected players
  broadcastChatHistory();
}



const Admins = new Set([
  "Liquem"
])

const Designer = new Set([
  "Liquem"
])



async function getUserRoles(playerid) {

  const roles = []

  if (Admins.has(playerid)) roles.push("Admin")

  if (Designer.has(playerid)) roles.push("Designer")

  return roles
}

module.exports = {
  addPlayerToChat,
  removePlayerFromChat,
  broadcastChatHistory,
  sendMessage,
}