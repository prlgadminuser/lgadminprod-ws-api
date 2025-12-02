const { userCollection, nicknameRegex, badWords } = require('./..//idbconfig'); 

const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

async function updateNickname(username, newName) {
    try {
        const newNickname = newName;

        // Validate the newNickname parameter
        if (!newNickname) {
            return { status: "not allowed5" };
        }

        // Verify newNickname against the nicknameRegex
        if (!nicknameRegex.test(newNickname)) {
            return { status: "not allowed" };
        }

        if (badWords.test(newNickname)) {
            return { status: "not allowed" };
        }

        const user = await userCollection.findOne(
            { "account.username": username },
            { projection: { "account.nameupdate": 1 } } // Only return the nicknameUpdatedAt field
        );

        // Check if the nickname can be updated based on the cooldown
        const now = Date.now();
        const lastUpdated = user?.account?.nameupdate || 0; // Default to epoch if no timestamp exists
        const timeDiff = now - lastUpdated; // Difference in milliseconds

      
        if (timeDiff < cooldownPeriod) { // Check if the cooldown is still in effect
           // const remainingTime = cooldownPeriod - timeDiff; // Remaining time in milliseconds
           // const remainingHours = Math.floor(remainingTime / (1000 * 60 * 60)); // Remaining hours
           // const remainingMinutes = Math.ceil((remainingTime % (1000 * 60 * 60)) / (1000 * 60)); // Remaining minutes

            return { status: "cooldown" };
        }
        
             const nicknameExists = await userCollection.findOne(
            { "account.nickname": newName },
            {
                collation: { locale: "en", strength: 2 },
            }
        );


        if (nicknameExists) {
            return { status: "taken" };
        }

        // Update the nickname and the timestamp in the database
        await userCollection.updateOne(
            { "account.username": username },
            { 
                $set: { 
                    "account.nickname": newNickname, 
                    "account.nameupdate": Date.now() // Set current timestamp as nicknameUpdatedAt 
                } 
            }
        );

        return { status: "success", t: Date.now() };
    } catch (error) {
        throw new Error("Err");
    }
}

module.exports = {
    updateNickname
};
