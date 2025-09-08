"use strict";

const connectedPlayers = new Map();
//const playerQueue = new Map();
function serverid ()  {
const serverid =  "xxxxxxxxxx".replace(/[xy]/g, function (c) {
  const r = (Math.random() * 16) | 0;
  const v = c === "x" ? r : (r & 0x3) | 0x8; // Ensures UUID version 4
  return v.toString(16);
}) 
return serverid
}

const SERVER_INSTANCE_ID = serverid()

let connectedClientsCount = 0;

let maintenanceMode = false;

function UpdateMaintenance(change, msg) {
  global.maintenance = change;
  if (msg) {
    global.maintenance_publicinfomessage = msg;
  }
}

const RealMoneyPurchasesEnabled = false;

const jwt = require("jsonwebtoken");
const Limiter = require("limiter").RateLimiter;
const bcrypt = require("bcrypt");
const Discord = require("discord.js");
const { RateLimiterMemory } = require("rate-limiter-flexible");

function isString(value) {
  return typeof value === "string" || value instanceof String;
}

module.exports = {
  isString,
  jwt,
  Limiter,
  bcrypt,
  Discord,
  RateLimiterMemory,
  connectedPlayers,
  maintenanceMode,
  UpdateMaintenance,
  RealMoneyPurchasesEnabled,
  connectedPlayers,
  SERVER_INSTANCE_ID
};
const {
  startMongoDB,
  shopcollection,
  userCollection,
  userInventoryCollection,
} = require("./idbconfig");
var sanitize = require("mongo-sanitize");
const WebSocket = require("ws");
const bodyParser = require("body-parser");
const http = require("http");
const { verifyPlayer } = require("./routes/verifyPlayer");
const { getUserInventory } = require("./routes/getinventory");
const { updateNickname } = require("./routes/updatename");
const { getshopdata } = require("./routes/getShopData");
const { equipItem } = require("./routes/equipitem");
const { equipColor } = require("./routes/equipcolor");
const { getdailyreward } = require("./routes/dailyreward");
const { buyItem } = require("./routes/buyitem");
const { equipWeapon } = require("./routes/updateLoadout");
const { buyWeapon } = require("./routes/buyWeapon");
const { buyRarityBox } = require("./routes/buyraritybox");
const { getUserProfile } = require("./routes/getprofile");
const {
  GetFriendsDataLocal,
  UpdateSelfPingTime,
} = require("./routes/FriendsOnlineSystem");
const { setupHighscores, gethighscores } = require("./routes/leaderboard");
const {
  createRateLimiter,
  ConnectionOptionsRateLimit,
  apiRateLimiter,
  AccountRateLimiter,
  getClientIp,
  getClientCountry,
  ws_message_size_limit,
  api_message_size_limit,
  WS_MSG_SIZE_LIMIT,
  maxClients,
  pingInterval,
  allowedOrigins,
  friendUpdatesTime,
} = require("./limitconfig");
const { CreateAccount } = require("./accounthandler/register");
const { Login } = require("./accounthandler/login");
const { verifyToken } = require("./routes/verifyToken");
const {
  addPlayerToChat,
  removePlayerFromChat,
  sendMessage,
} = require("./playerchat/chat");
const {
  CreatePaymentLink,
  verifyWebhook,
  handlePaypalWebhookEvent,
} = require("./paystation");
const { sub, checkExistingSession, removeSession, addSession } = require("./redis");

function CompressAndSend(ws, type, message) {
  const json_message = JSON.stringify({ type: type, data: message });
  // const finalmessage = LZString.compressToBase64(json_message); // or compressToBase64 for safer transmission
  ws.send(json_message);
}



//setUserOnlineStatus("agag", "agg")

async function setCommonHeaders(res, origin) {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self'"
  );
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=()");
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }
}

const webhookRawBodyParser = bodyParser.json({
  verify: (req, res, buf) => {
    // This crucial line attaches the raw buffer of the request body to req.rawBody
    // Your verifyWebhook function will use req.rawBody.toString('utf8')
    req.rawBody = buf;
  },
});

const server = http.createServer(async (req, res) => {
  if (req.url === "/from-paypal-webhook") {
    webhookRawBodyParser(req, res, (err) => {});
  }

  const origin = req.headers.origin;
  await setCommonHeaders(res, origin);

  try {
    if (req.url !== "/from-paypal-webhook") {
      const ip = getClientIp(req);
      if (!ip) {
        res.writeHead(429, { "Content-Type": "text/plain" });
        return res.end("Unauthorized");
      }

      try {
        await apiRateLimiter.consume(ip);
      } catch {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("Too many requests. Try again later");
      }

      if (!origin || origin.length > 50 || !allowedOrigins.includes(origin)) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        return res.end("Unauthorized");
      }
    }

    // Handle preflight OPTIONS requests
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      return res.end();
    }

    let body = "";
    let requestAborted = false;

    req.on("data", (chunk) => {
      if (!req.url === "/from-paypal-webhook") {
        if (chunk.length && chunk.length > api_message_size_limit) {
          requestAborted = true;
          res.writeHead(429, { "Content-Type": "text/plain" });
          res.end("Unauthorized");
          req.destroy();
          return;
        }
      }
      body += chunk.toString();
      body = escapeInput(body);
    });

    req.on("end", async () => {
      if (requestAborted) return;

      try {
        let requestData = {};
        if (body) {
          try {
            requestData = JSON.parse(body);
          } catch {
            res.writeHead(400, { "Content-Type": "text/plain" });
            return res.end("Error: Invalid JSON");
          }
        }

        if (global.maintenance == "true") {
          res.writeHead(400, { "Content-Type": "text/plain" });

          const maintenancedata = {
            status: "maintenance",
            gmsg: global.maintenance_publicinfomessage,
          };

          return res.end(JSON.stringify(maintenancedata));
        }

        switch (req.url) {
          case "/token":
            if (req.method !== "POST") {
              res.writeHead(405, { "Content-Type": "text/plain" });
              return res.end("Method Not Allowed");
            }

            if (!requestData.token) {
              res.writeHead(400, { "Content-Type": "text/plain" });
              return res.end("token invalid");
            }

            const tokenResult = await verifyToken(requestData.token, 2);

            if (tokenResult === "valid") {
              res.writeHead(200, { "Content-Type": "text/plain" });
              return res.end("true");
            } else if (tokenResult === "invalid"){
              res.writeHead(401, { "Content-Type": "text/plain" });
              return res.end("token invalid");
            } else if (tokenResult.ban_until) {
              res.writeHead(500, { "Content-Type": "text/plain" });
              return res.end(JSON.stringify(tokenResult));
            } else {
              res.writeHead(401, { "Content-Type": "text/plain" });
              return res.end("server error");
            }
      
            

          case "/register":
            if (req.method !== "POST") {
              res.writeHead(405, { "Content-Type": "text/plain" });
              return res.end("Method Not Allowed");
            }

            if (!requestData.username || !requestData.password) {
              res.writeHead(400, { "Content-Type": "text/plain" });
              return res.end("Error: Missing username or password");
            }

            const userIp = getClientIp(req);
            const userCountry = getClientCountry(req);
            const rateLimitData = await AccountRateLimiter.get(userIp);

            if (rateLimitData && rateLimitData.remainingPoints <= 0) {
              res.writeHead(429, { "Content-Type": "text/plain" });
              return res.end("You can't create more accounts.");
            }

            const createResult = await CreateAccount(
              requestData.username,
              requestData.password,
              userCountry
            );

            if (createResult.token) {
              await AccountRateLimiter.consume(userIp);
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ data: createResult }));
            } else {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ data: createResult }));
            }

          case "/login":
            if (req.method !== "POST") {
              res.writeHead(405, { "Content-Type": "text/plain" });
              return res.end("Method Not Allowed");
            }

            if (!requestData.username || !requestData.password) {
              res.writeHead(400, { "Content-Type": "text/plain" });
              return res.end("Error: Missing username or password");
            }

            const loginResult = await Login(
              requestData.username,
              requestData.password
            );
            if (loginResult) {
              res.writeHead(200, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ data: loginResult }));
            } else {
              res.writeHead(401, { "Content-Type": "text/plain" });
              return res.end("Error: Invalid credentials");
            }

          case "/from-paypal-webhook":
            try {
              const isValid = await verifyWebhook(req);
              if (!isValid) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                return res.end("Not valid webhook");
              }

              await handlePaypalWebhookEvent(req.body);

              res.writeHead(200, { "Content-Type": "text/plain" });
              return res.end("success");
            } catch (error) {
              res.writeHead(500, { "Content-Type": "text/plain" });
              return res.end("Not valid webhook");
            }

          default:
            res.writeHead(500, { "Content-Type": "text/plain" });
            return res.end("Error: Not Found");
        }
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(500, { "Content-Type": "text/plain" });
        }
        return res.end("Error: Internal server error");
      }
    });
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
    }
    res.end("Error: Internal server error");
  }
});

// Loop through all headers and log their keys and value

const wss = new WebSocket.Server({
  noServer: true,
  clientTracking: false,
  perMessageDeflate: false,
  proxy: true,
  maxPayload: ws_message_size_limit, // 10MB max payload
});

// Function to escape special characters in strings (for MongoDB safety)


const deepSanitizeAndEscape = (value) => {
  // If value is an array, recursively sanitize and escape each element
  if (Array.isArray(value)) {
    return value.map((elm) => deepSanitizeAndEscape(elm)); // Return sanitized and escaped array
  }

  // If value is an object, recursively sanitize and escape each value in the object
  if (typeof value === "object" && value !== null) {
    const sanitizedObj = {};
    Object.keys(value).forEach((key) => {
      sanitizedObj[key] = deepSanitizeAndEscape(value[key]); // Recursively sanitize and escape object values
    });
    return sanitizedObj; // Return sanitized object
  }

  // Apply both sanitization and escaping
  return escapeInput(sanitize(value));
};

function escapeInput(input) {
  if (input === null || input === undefined) return "";

  if (typeof input === "object") {
    return JSON.stringify(input, (key, value) => {
      if (typeof value === "string") {
        return value.replace(/[$]/g, "");
      }
      return value;
    });
  }
  return String(input).replace(/[$]/g, "");
}


async function handleMessage(ws, message, playerVerified) {
  try {
    const escapedMessage = escapeInput(message.toString());
    //const escapedMessage = escapeInput(message.toString());
    const data = JSON.parse(escapedMessage);

    const checkSizeLimits = (data) => {
      for (const [key, value] of Object.entries(data)) {
        // Check key length
        if (key.length > WS_MSG_SIZE_LIMIT.max_key_length) {
          return { error: `Key "${key}" is too long.` };
        }

        // Check value length if it's a string
        if (
          typeof value === "string" &&
          value.length > WS_MSG_SIZE_LIMIT.max_value_length
        ) {
          return { error: `Value for "${key}" is too long.` };
        }

        // Recursively check if the value is an object (e.g., nested data)
        if (typeof value === "object" && value !== null) {
          const nestedCheck = checkSizeLimits(value);
          if (nestedCheck && nestedCheck.error) {
            return nestedCheck; // Propagate the error
          }
        }
      }
      return null; // No issues found
    };

    // Validate the incoming message's size constraints
    const MessageValid = checkSizeLimits(data);

    if (MessageValid && MessageValid.error) {
      // Send error response and close WebSocket connection if validation fails
      ws.close(1007, "Message invalid.");
      return;
    }

    let response;

    switch (data.id) {
      case "ping":
        ws.playerVerified.lastPongTime = Date.now();
        break;

      case "equip_item":
        response = await equipItem(
          playerVerified.playerId,
          data.type,
          data.itemid,
          playerVerified.items
        );
        //CompressAndSend(ws, "equipitem", response)
        break;

      case "buy_weapon":
        response = await buyWeapon(playerVerified.playerId, data.wid,  playerVerified.items);
        CompressAndSend(ws, "buyweapon", response);
        break;

      case "equip_weapon":
        response = await equipWeapon(
          playerVerified.playerId,
          data.slot,
          data.wid,
          playerVerified.items,
        );
        // CompressAndSend(ws, "equipweapon", response)
        break;

      case "equip_color":
        response = await equipColor(
          playerVerified.playerId,
          data.type,
          data.color
        );
        CompressAndSend(ws, "equipcolor", response);
        break;

      case "dailyreward":
        response = await getdailyreward(
          playerVerified.playerId,
          playerVerified.items
        );
        CompressAndSend(ws, "dailyreward", response);
        break;

      case "change_name":
        response = await updateNickname(playerVerified.playerId, data.new);
        CompressAndSend(ws, "nickname", response);
        break;

      case "shopdata":
        response = await getshopdata();
        CompressAndSend(ws, "shopdata", response);
        break;

      case "buyitem":
        response = await buyItem(
          playerVerified.playerId,
          data.buyid,
          playerVerified.items
        );
        CompressAndSend(ws, "buyitem", response);
        break;

      case "profile":
        response = await getUserProfile(data.pid, playerVerified.playerId);
        CompressAndSend(ws, "profile", response);
        break;

      case "openbox":
        response = await buyRarityBox(
          playerVerified.playerId,
          playerVerified.items
        );
        CompressAndSend(ws, "openbox", response);
        break;

      case "highscore":
        response = await gethighscores();
        CompressAndSend(ws, "highscore", response);
        break;

      // chat functions

      case "joinchat":
        response = await addPlayerToChat(playerVerified.nickname, ws);
        CompressAndSend(ws, "joinchat", response);
        break;

      case "leavechat":
        response = await removePlayerFromChat(playerVerified.nickname);
        CompressAndSend(ws, "leavechat", response);
        break;

      case "sendchatmsg":
        response = await sendMessage(playerVerified.nickname, data.msg);
        //  CompressAndSend(ws, "sendchatmsg", response)
        break;

      case "get-paystation":
        if (RealMoneyPurchasesEnabled) {
          response = await (async () => {
            return await CreatePaymentLink(
              playerVerified.playerId,
              data.packid
            );
          })();

          CompressAndSend(ws, "get-paystation", response);
        }
        break;

      default:
        ws.close(1007, "error");
        //  console.log(error)
        break;
    }
  } catch (error) {
    ws.close(1007, "error");
    // console.log(error)
  }
}

const rateLimiterConnection = new RateLimiterMemory(ConnectionOptionsRateLimit);


const PING_INTERVAL = 15000; // 10 seconds
const TIMEOUT = 50000; // 50 seconds

// Setup global heartbeat interval
setInterval(() => {
  const now = Date.now();

  for (const [playerId, ws] of connectedPlayers.entries()) {
    if (!ws || ws.readyState !== ws.OPEN) continue;

    // Initialize lastPongTime if not set
    if (!ws.playerVerified.lastPongTime) {
      ws.playerVerified.lastPongTime = now;
      continue; // Skip until first pong
    }
    // Check timeout
    if (now - ws.playerVerified.lastPongTime > TIMEOUT) {
      ws.close(3845, "activity timeout");
      continue;
    }
  }
}, PING_INTERVAL);




wss.on("connection", async (ws, req) => {
  if (global.maintenance === "true") {
    ws.close(4000, "maintenance");
    return;
  }

  const playerVerified = ws.playerVerified;

    const username = playerVerified.playerId

   // First check if the player is already connected locally
let existingSid;
if (connectedPlayers.has(username)) {
  existingSid = SERVER_INSTANCE_ID; // Local session exists
} else {
  // Check Redis for existing session
  existingSid = await checkExistingSession(username);
}

if (existingSid) {
  if (existingSid === SERVER_INSTANCE_ID) {
    // Existing session is on THIS server → kick local connection
    const existingConnection = connectedPlayers.get(username);
    if (existingConnection) {
      existingConnection.send("code:double");
      existingConnection.close(1001, "Reassigned connection");
      await new Promise((resolve) => existingConnection.once("close", resolve));
      connectedPlayers.delete(username);
    }
  } else {
    // Existing session is on ANOTHER server → publish an invalidation event
    await redisClient.publish(
      `server:${existingSid}`,
      JSON.stringify({ type: "disconnect", uid: username })
    );
  }
}

// Add the new session
await addSession(username);

// Update local state
connectedPlayers.set(username, ws);
connectedClientsCount++;

  // Add session for this server

  CompressAndSend(ws, "connection_success", playerVerified.inventory);

  ws.on("message", async (message) => {
    try {
      if (
        !playerVerified.rateLimiter.tryRemoveTokens(1) ||
        message.length > ws_message_size_limit
      ) {
        ws.close(1007, "error");
        return;
      }
      await handleMessage(ws, message, playerVerified);
    } catch (error) {
      ws.close(1007, "error");
    }
  });

  ws.on("error", (error) => {
    if (error.message.includes("payload size")) {
      ws.close(1009, "Payload size exceeded");
    }
  });

  ws.on("close", async () => {

    removePlayerFromChat(ws.playerVerified.nickname);

    const playerId = ws.playerVerified?.playerId;

    if (playerId) {
      connectedPlayers.delete(playerId);
      connectedClientsCount--;
      await removeSession(playerId); // Remove session on disconnect
    }
  });
});


server.on("upgrade", async (request, socket, head) => {
  try {
    const ip = getClientIp(request);
    if (!ip || request.url.length > 200) return;

    await rateLimiterConnection.consume(ip);

    const origin = request.headers.origin;
    if (!origin || origin.length > 50 || !allowedOrigins.includes(origin)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    if (connectedClientsCount >= maxClients) {
      socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
      socket.destroy();
      return;
    }

    const token = request.url.split("/")[1];
    if (!token || token.trim() === "") throw new Error("Invalid token");

    const sanitizedToken = escapeInput(token);
    const playerVerified = await verifyPlayer(sanitizedToken, 1);


    if (playerVerified === "disabled") throw new Error("Invalid token");

    playerVerified.rateLimiter = createRateLimiter();

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.playerVerified = playerVerified;
      ws.playerVerified.lastPongTime = Date.now();
      wss.emit("connection", ws, request);
    });

  } catch (error) {
    socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
    socket.destroy();
  }
});

const PORT = process.env.PORT || 3090;

startMongoDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server started on Port ${PORT}`);
  });
});

function watchItemShop() {
  const pipeline = [
    {
      $match: {
        "fullDocument._id": { $in: ["dailyItems", "maintenance"] },
        operationType: "update",
      },
    },
  ];
  let changeStream;

  const startChangeStream = () => {
    changeStream = shopcollection.watch(pipeline, {
      fullDocument: "updateLookup",
    });

    changeStream.on("change", (change) => {
      const docId = change.fullDocument._id;
      if (docId === "dailyItems") {
        broadcast("shopupdate");
      } else if (docId === "maintenance") {
        UpdateMaintenance(
          change.fullDocument.status,
          change.fullDocument.public_message
        );
        if (global.maintenance == "true") closeAllClients(4001, "maintenance"); // broadcast("maintenanceupdate");
      }
    });

    changeStream.on("error", (err) => {
      console.error("Change stream error:", err);
      setTimeout(startChangeStream, 5000); // Retry after delay
    });
  };

  startChangeStream();
}

// Example usage:
watchItemShop();

setupHighscores();

function broadcast(message) {
  const msg = JSON.stringify({ update: message });
  connectedPlayers.forEach(
    (ws) => ws.readyState === WebSocket.OPEN && ws.send(msg)
  );
}

function closeAllClients(code, reason) {
  connectedPlayers.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send("maintenance_active");

      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(code, reason);
        }
      }, 100); // 100 ms delay to allow message flush
    }
  });
}


process.on("SIGINT", () => {
  changeStream.close();
  process.exit();
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason, promise);
    process.exit(1);
});
