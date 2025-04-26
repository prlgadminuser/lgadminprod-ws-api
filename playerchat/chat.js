const { Limiter } = require('./..//index'); 

const globalChatPlayers = new Map();
const chatHistory = [];
const maxMessages = 4;

const connectionRate = 1;
const connectionBurst = 1;
const connectionInterval = 2000; // 2 seconds
const tokenBucket = new Limiter({
  tokensPerInterval: connectionRate,
  interval: connectionInterval,
  maxBurst: connectionBurst,
});

const messageRate = 1; // 1 message per second
const messageBurst = 1;
const messageTokenBucket = new Limiter({
  tokensPerInterval: messageRate,
  interval: 'second',
  maxBurst: messageBurst,
});

const maxMessageLength = 100;

function addPlayerToChat(playerId, ws) {
  // If the player is already in the chat
  if (globalChatPlayers.has(playerId)) {
    console.error('Duplicate player ID:', playerId);
    return false;
  }

  // Add player to the global chat players map
  globalChatPlayers.set(playerId, { ws });

  // Send the entire chat history to the new connection
  ws.send(JSON.stringify({ type: 'chat', msg: chatHistory, ccu: globalChatPlayers.size }));

  chatHistory.push(systemMessage);

  // Trim chat history to the last 'maxMessages' messages
  if (chatHistory.length > maxMessages) {
    chatHistory.splice(0, chatHistory.length - maxMessages);
  }


  return true;
}

function removePlayerFromChat(playerId) {
  // If the player doesn't exist in the chat
  if (!globalChatPlayers.has(playerId)) {
    return false;
  }
  // Remove player from the global chat players map
  globalChatPlayers.delete(playerId);

  return true;
}

function broadcastChatHistory(message) {
  // Broadcast the updated chat history to all connected players
  for (const player of globalChatPlayers.values()) {
    player.ws.send(JSON.stringify({ type: 'chat', msg: chatHistory, ccu: globalChatPlayers.size }));
  }
}

function broadcastGlobal(playerId, message) {
  const messageString = String(message).trim();

  // Validate message length
  if (messageString.length === 0 || messageString.length > maxMessageLength) {
    console.error('Message length is invalid:', messageString);
    return;
  }

  messageString = messageString.replace(/\s+/g, ' ');

  // Rate limit messages
  if (!messageTokenBucket.tryRemoveTokens(1)) {
    console.error('Message rate limit exceeded:', messageString);
    return;
  }

  const filteredMessage = messageString.toLowerCase().includes('badword')
    ? 'Filtered message'
    : messageString;

  const timestamp = new Date().toLocaleTimeString();

  const newMessage = {
    id: chatHistory.length + 1,
    t: timestamp,
    p: playerId,
    m: filteredMessage,
  };

  chatHistory.push(newMessage);

  // Trim chat history to the last 'maxMessages' messages
  if (chatHistory.length > maxMessages) {
    chatHistory.splice(0, chatHistory.length - maxMessages);
  }

  // Broadcast the updated chat history to all connected players
  broadcastChatHistory();
}

function sendMessage(playerId, message) {
  const messageString = String(message).trim();

  // Validate message length
  if (messageString.length === 0 || messageString.length > maxMessageLength) {
    console.error('Message length is invalid:', messageString);
    return;
  }

  // Rate limit messages
  if (!messageTokenBucket.tryRemoveTokens(1)) {
    console.error('Message rate limit exceeded:', messageString);
    return;
  }

  // Filter out inappropriate content
  const filteredMessage = messageString.toLowerCase().includes('badword')
    ? 'Filtered message'
    : messageString;

  const timestamp = new Date().toLocaleTimeString();

  const newMessage = {
    id: chatHistory.length + 1,
    t: timestamp,
    p: playerId,
    m: filteredMessage,
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

module.exports = {
    addPlayerToChat,
    removePlayerFromChat,
    broadcastChatHistory,
    broadcastGlobal,
    sendMessage,
}