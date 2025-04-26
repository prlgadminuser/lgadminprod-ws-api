
const Redis = require("ioredis");

// Connect to Upstash Redis with TLS support
const redis = new Redis({
  host: "topical-llama-11602.upstash.io",  // Replace with your Upstash Redis endpoint
   port: 6379,                             // Default Redis port
  password: "AS1SAAIjcDEzOTA5YjYxOGFiZGQ0NjNiYTg0YjhlYjY2YjA5YTBhOXAxMA", // Upstash Redis password
   tls: {}                                 // TLS support (Upstash requires it)
 });

// Function to set user's online status and activity
async function setUserOnlineStatus(username, activity) {
  try {
    const userStatus = {
      online: Date.now(),
      activity: activity,  // e.g., "playing", "in lobby", etc.
    };
    // Store the user's status as a JSON string in Redis
    const result = await redis.set(`user:${username}`, JSON.stringify(userStatus)); // Logs the result of the `set` operation

    // Set expiration time of 20 seconds for online status
    const expireResult = await redis.expire(`user:${username}`, 20); // Logs if the expiration was set

  } catch (error) {
    //console.error("Error setting online status and activity:", error);
  }
}


// Function to check online friends and their activity
async function getOnlineFriends(friends) {
  try {
    const onlineFriendsStatus = [];

    // Fetch the online status for each friend using mget
    const onlineFriends = await redis.mget(
      friends.map(f => `user:${f}`)
    );

    // Iterate over each friend's status
    onlineFriends.forEach((data, index) => {
      if (data !== null) {
        // Parse the stored data, which is a JSON string
        const parsedData = JSON.parse(data);

        // Check if the friend is online (last ping within 20 seconds)
        const lastPing = parsedData.online;
        if (Date.now() - lastPing <= 20 * 1000) {
          // If online, add the friend to the status list with their activity
          onlineFriendsStatus.push({
            username: friends[index],
            activity: parsedData.activity,  // Retrieve the activity
          });
        }
      }
    });

    return onlineFriendsStatus;
  } catch (error) {
  //  console.error("Error retrieving online friends and their activity:", error);
    return [];
  }
}

// Example Usage
const username = "player1";
const friends = ["player1", "player2", "player3"];

// Set user's online status and activity
//setUserOnlineStatus(username, "playing");

// Retrieve and check online friends with their activity
//getOnlineFriends(friends);


//module.exports = { redis, setUserOnlineStatus }