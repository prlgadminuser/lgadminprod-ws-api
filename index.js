"use strict";

const connectedPlayers = new Map();
//const playerQueue = new Map();

let connectedClientsCount = 0;

let maintenanceMode = false;

const jwt = require("jsonwebtoken");
const Limiter = require("limiter").RateLimiter;
//const bcrypt = require("bcrypt");
const Discord = require("discord.js");
const { RateLimiterMemory } = require('rate-limiter-flexible');
module.exports = { jwt, Limiter, bcrypt, Discord, RateLimiterMemory, connectedPlayers };
const { startMongoDB, shopcollection } = require("./idbconfig");
var sanitize = require('mongo-sanitize');
const WebSocket = require("ws");
const http = require('http');
const LZString = require("lz-string");
const { verifyPlayer } = require('./routes/verifyPlayer');
const { getUserInventory } = require('./routes/getinventory');
const { updateNickname } = require('./routes/updatename');
const { getshopdata } = require('./routes/getShopData');
const { equipItem } = require('./routes/equipitem');
const { equipColor } = require("./routes/equipcolor");
const { getdailyreward } = require('./routes/dailyreward');
const { buyItem } = require('./routes/buyitem');
const { equipWeapon } = require('./routes/updateLoadout');
const { buyWeapon } = require('./routes/buyWeapon');
const { buyRarityBox } = require('./routes/buyraritybox');
const { getUserProfile } = require('./routes/getprofile');
const { GetFriendsDataLocal, UpdateSelfPingTime } = require('./routes/FriendsOnlineSystem');
const { setupHighscores, gethighscores } = require('./routes/leaderboard');
const { createRateLimiter, ConnectionOptionsRateLimit, apiRateLimiter, AccountRateLimiter, 
        getClientIp, getClientCountry, ws_message_size_limit, api_message_size_limit, WS_MSG_SIZE_LIMIT, maxClients, pingInterval, allowedOrigins, friendUpdatesTime } = require("./limitconfig");
const { CreateAccount } = require('./accounthandler/register');
const { Login } = require('./accounthandler/login');
const { setUserOnlineStatus } = require('./routes/redisHandler')

//setUserOnlineStatus("agag", "agg")

const server = http.createServer(async (req, res) => {
    try {

       // if (req.headers.length)
        const ip = getClientIp(req);

        if (!ip) {
            res.writeHead(429, { 'Content-Type': 'text/plain' });
            return res.end("Unauthorized");
        }

        // Handle Rate Limiting - Ensure It Stops Execution on Failure
        try {
            await apiRateLimiter.consume(ip);
        } catch {
            res.writeHead(429, { 'Content-Type': 'text/plain' });
            return res.end("Too many requests. Try again later");
        }

        const origin = req.headers.origin;

        if (!origin || origin.length > 50 || !allowedOrigins.includes(origin)) {
            res.writeHead(429, { 'Content-Type': 'text/plain' });
            return res.end("Unauthorized");
        }

        if (maintenanceMode) {
            res.writeHead(429, { 'Content-Type': 'text/plain' });
            return res.end("Quick Maintenance. Be back soon");
        }
    

        // Security Headers
        //res.setHeader("X-Frame-Options", "DENY");
       // res.setHeader("X-Content-Type-Options", "nosniff");
      //  res.setHeader("Referrer-Policy", "no-referrer");
       // res.setHeader("Permissions-Policy", "interest-cohort=()");
       res.setHeader("X-Frame-Options", "DENY");
       res.setHeader("X-Content-Type-Options", "nosniff");
       res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
       res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self'");
       res.setHeader("Referrer-Policy", "no-referrer");
       res.setHeader("Permissions-Policy", "geolocation=(), microphone=()");
       res.setHeader("Access-Control-Allow-Origin", origin);
       res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
       res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");


        // Handle preflight OPTIONS requests
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            return res.end();
        }

        let body = '';
        req.on('data', (chunk) => {
            if (chunk.length && chunk.length > api_message_size_limit) {
                res.writeHead(429, { 'Content-Type': 'text/plain' });
                return res.end("Unauthorized");
            }
            body += chunk.toString();
            body = escapeInput(body.toString());
        });

        req.on('end', async () => {
            try {
                let requestData = {};
                if (body) {
                    try {
                        requestData = JSON.parse(body);
                    } catch (err) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        return res.end("Error: Invalid JSON");
                    }
                }

                switch (req.url) {
                    case '/register':
                        if (req.method !== 'POST') break;

                        if (!requestData.username || !requestData.password) {
                            res.writeHead(400, { 'Content-Type': 'text/plain' });
                            return res.end("Error: Missing username or password");
                        }


                        const ip = getClientIp(req);
                        const user_country = getClientCountry(req);
                        // Apply Rate Limiting Before Processing
                        const rateLimitData = await AccountRateLimiter.get(ip);

                        if (rateLimitData && rateLimitData.remainingPoints <= 0) {
                            res.writeHead(429, { 'Content-Type': 'text/plain' });
                            return res.end("You cant create more accounts.");
                        }


                        const response = await CreateAccount(requestData.username, requestData.password, user_country);
                        if (response.token) {
                            AccountRateLimiter.consume(ip);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ data: response }));
                        } else {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ data: response }));
                        }


                    case '/login':
                        if (req.method !== 'POST') break;

                        if (!requestData.username || !requestData.password) {
                            res.writeHead(400, { 'Content-Type': 'text/plain' });
                            return res.end("Error: Missing username or password");
                        }

                        const loginResponse = await Login(requestData.username, requestData.password);
                        if (loginResponse) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            return res.end(JSON.stringify({ data: loginResponse }));
                        } else {
                            res.writeHead(401, { 'Content-Type': 'text/plain' });
                            return res.end("Error: Invalid credentials");
                        }
                        break;

                    default:
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        return res.end("Error: Not Found");
                }
            } catch (err) {
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                }
                return res.end("Error: Internal server error");
            }
        });
    } catch (err) {
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
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
function escapeStringForMongo(input) {
    return String(input).replace(/[§.]/g, '');
}

const deepSanitizeAndEscape = (value) => {
    // If value is an array, recursively sanitize and escape each element
    if (Array.isArray(value)) {
        return value.map(elm => deepSanitizeAndEscape(elm));  // Return sanitized and escaped array
    }

    // If value is an object, recursively sanitize and escape each value in the object
    if (typeof value === 'object' && value !== null) {
        const sanitizedObj = {};
        Object.keys(value).forEach(key => {
            sanitizedObj[key] = deepSanitizeAndEscape(value[key]);  // Recursively sanitize and escape object values
        });
        return sanitizedObj;  // Return sanitized object
    }

    // Apply both sanitization and escaping
    return escapeInput(sanitize(value));
}

function escapeInput(input, isJwt = false) {
    if (input === null || input === undefined) return '';

    if (isJwt && typeof input === 'string') {
        return input.replace(/[$]/g, '');; // Return the JWT as is, no sanitization
    }

    if (typeof input === 'object') {
        return JSON.stringify(input, (key, value) => {
            if (typeof value === 'string') {
                return value.replace(/[$.]/g, '');
            }
            return value;
        });
    }
    return String(input).replace(/[$.]/g, '');
}


async function handleMessage(ws, message, playerVerified) {

    try {

        const escapedMessage = escapeInput(message.toString())
        //const escapedMessage = escapeInput(message.toString());
        const data = JSON.parse(escapedMessage);

        const checkSizeLimits = (data) => {
            for (const [key, value] of Object.entries(data)) {
                // Check key length
                if (key.length > WS_MSG_SIZE_LIMIT.max_key_length) {
                    return { error: `Key "${key}" is too long.` };
                }
        
                // Check value length if it's a string
                if (typeof value === 'string' && value.length > WS_MSG_SIZE_LIMIT.max_value_length) {
                    return { error: `Value for "${key}" is too long.` };
                }
        
                // Recursively check if the value is an object (e.g., nested data)
                if (typeof value === 'object' && value !== null) {
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
                response = await equipItem(playerVerified.playerId, data.type, data.itemid);
                ws.send(JSON.stringify({ type: "equipitem", data: response }));
                break;

            case "buy_weapon":
                response = await buyWeapon(playerVerified.playerId, data.wid);
                ws.send(JSON.stringify({ type: "buyweapon", data: response }));
                break;
                
            case "equip_weapon":
                response = await equipWeapon(playerVerified.playerId, data.slot, data.wid);
                ws.send(JSON.stringify({ type: "equipweapon", data: response }));
                break;    

            case "equip_color":
                response = await equipColor(playerVerified.playerId, data.type, data.color);
                ws.send(JSON.stringify({ type: "equipcolor", data: response }));
                break;

            case "dailyreward":
                response = await getdailyreward(playerVerified.playerId);
                ws.send(JSON.stringify({ type: "dailyreward", data: response }));
                break;

            case "change_name":
                response = await updateNickname(playerVerified.playerId, data.new);
                ws.send(JSON.stringify({ type: "nickname", data: response }));
                break;

            case "shopdata":
                response = await getshopdata();
                ws.send(JSON.stringify({ type: "shopdata", data: response }));
                break;

            case "buyitem":
                response = await buyItem(playerVerified.playerId, data.buyid);
                ws.send(JSON.stringify({ type: "buyitem", data: response }));
                break;

            case "profile":
                response = await getUserProfile(data.pid, playerVerified.playerId);
                ws.send(JSON.stringify({ type: "profile", data: response }));
                break;

            case "openbox":
                response = await buyRarityBox(playerVerified.playerId);
                ws.send(JSON.stringify({ type: "openbox", data: response }));
                break;

            case "highscore":
                response = await gethighscores();
                ws.send(JSON.stringify({ type: "highscores", data: response }));
                break;

            default:
                ws.close(1007, "error");
                break;
        }
    } catch (error) {
        ws.close(1007, "error");
    }
}

const rateLimiterConnection = new RateLimiterMemory(ConnectionOptionsRateLimit);

wss.on("connection", (ws, req) => {
    if (maintenanceMode) {
        ws.close(4000, "maintenance");
        return;
    }

    const playerVerified = ws.playerVerified;
    playerVerified.lastPongTime = Date.now();

    //console.log(playerVerified.playerId, "connected");

    ws.send(JSON.stringify({ type: "connection_success", accdata: playerVerified.inventory }));

    const pingIntervalId = setInterval(() => {
        if (!ws || playerVerified.lastPongTime <= Date.now() - 50000) {
            ws.close(3845, "activity timeout");
        }pingInterval
    }, pingInterval);


    /*
    getfrienddata(playerVerified.playerId, ws)

    
    async function getfrienddata(username, ws) {

    try {
        const friendsdata = await GetFriendsDataLocal(username);
        UpdateSelfPingTime(username)
        ws.send(JSON.stringify({ type: "friendsup", data: friendsdata }));
   
       } catch (error) {

       }
    }

 const FriendOnlineInterval = setInterval(async () => {

        if (playerVerified.inventory.friends.length > -1) {
             try {
               await getfrienddata(playerVerified.playerId, ws)
          
              } catch (error) {
  
                  clearInterval(FriendRealtimeDataInterval)
                  console.error("Error fetching friends' data:", error);
              }
          }
      }, friendUpdatesTime);

      */
    


    ws.on("message", async (message) => {

        try {
            if (!playerVerified.rateLimiter.tryRemoveTokens(1) || message.length > ws_message_size_limit) {
                ws.close(1007, "error");
                return;
            }

            await handleMessage(ws, message, playerVerified);
        } catch (error) {
            ws.close(1007, "error");
        }
    });

    ws.on("error", (error) => {
        if (error.message.includes('payload size')) {
          //  console.error('Payload size exceeded:', error.message);
            ws.close(1009, "Payload size exceeded");
        } else {
           // console.error('WebSocket error:', error);
        }
    });

    ws.on("close", () => {
        if (typeof pingIntervalId !== "undefined" && pingIntervalId) {
            clearInterval(pingIntervalId);
        }
        
        if (typeof FriendOnlineInterval !== "undefined" && FriendOnlineInterval) {
            clearInterval(FriendOnlineInterval);
        }
        

        const playerId = ws.playerVerified?.playerId;

        if (playerId) {
            connectedPlayers.delete(playerId);
            connectedClientsCount--;

           // if (playerQueue.has(playerId)) {
             //   playerQueue.delete(playerId);
               // console.log(`Player ${playerId} removed from queue due to disconnection.`);
          //  }
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
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
        }

        if (connectedClientsCount >= maxClients) {
            socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
            socket.destroy();
            return;
        }

        const token = request.url.split('/')[1];

        if (!token || token.trim() === '') {
        throw new Error('Invalid token');
        }

        const sanitizedToken = escapeInput(token, true); 

        try {
            const playerVerified = await verifyPlayer(sanitizedToken);
            

            const existingConnection = connectedPlayers.get(playerVerified.playerId);
            if (existingConnection) {
                existingConnection.close(1001, "Reassigned connection");
                await new Promise(resolve => existingConnection.on('close', resolve));

                connectedPlayers.delete(playerVerified.playerId)
            }

           playerVerified.rateLimiter = createRateLimiter();
            wss.handleUpgrade(request, socket, head, (ws) => {
                ws.playerVerified = playerVerified;
                connectedPlayers.set(playerVerified.playerId, ws); 

                connectedClientsCount++;
                wss.emit("connection", ws, request);
            });
        } catch (error) {
           // console.log(error)
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
        }
    } catch (error) {
       // console.log(error)
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
    }
});


//const PORT = process.env.PORT || 8080;

const PORT = 8080;

startMongoDB().then(() => {
    server.listen(PORT, () => {
       console.log(`Server started on Port ${PORT}`);
    });
});

function watchItemShop() {
    const pipeline = [{ $match: { "fullDocument._id": { $in: ["dailyItems", "maintenance"] }, operationType: "update" } }];
    let changeStream;

    const startChangeStream = () => {
        changeStream = shopcollection.watch(pipeline, { fullDocument: "updateLookup" });

        changeStream.on("change", (change) => {
            const docId = change.fullDocument._id;
            if (docId === "dailyItems") {
                broadcast("shopupdate");
            } else if (docId === "maintenance") {
                maintenanceMode = change.fullDocument.status === "true";
                broadcast("maintenanceupdate");
                if (maintenanceMode) closeAllClients(4001, "maintenance");
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
    connectedPlayers.forEach((ws) => ws.readyState === WebSocket.OPEN && ws.send(msg));
}

function closeAllClients(code, reason) {
    connectedPlayers.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.close(code, reason);
        }
    });
}

process.on("SIGINT", () => {
    changeStream.close();
    process.exit();
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
  });
  
  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection:", reason, promise);
  });
