
const { userCollection, nicknameRegex, badWords } = require('./..//idbconfig');

async function updateNickname(username, newName) {

    try {
        const newNickname = newName

        // Validate the newNickname parameter
        if (!newNickname) {
            return { status: "not allowed5" };
        }

        // Verify newNickname against the nicknameRegex
        if (!nicknameRegex.test(newNickname)) {
            return { status: "not allowed" };
        }

        // Check if the new nickname contains any prohibited words
        
        const containsBadWords = badWordsPattern.test(username);
        if (containsBadWords) {
            return { status: "not allowed" };
        }

        // Check if the new nickname is already taken by another user
        const nicknameExists = await userCollection.findOne(
            { nickname: { $regex: new RegExp(`^${newNickname}$`, "i") } },
            { projection: { _id: 1 } } // Only check if the nickname exists (no need to return full user)
        );

        if (nicknameExists) {
            return { status: "taken" };
        }

        // Fetch the user's current nicknameUpdatedAt timestamp
        const user = await userCollection.findOne(
            { username },
            { projection: { nameupdate: 1 } } // Only return the nicknameUpdatedAt field
        );

        // Check if the nickname can be updated based on the cooldown
        const now = Date.now();
        const lastUpdated = user?.nameupdate || 0; // Default to epoch if no timestamp exists
        const timeDiff = now - lastUpdated; // Difference in milliseconds

        const cooldownPeriod = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        if (timeDiff < cooldownPeriod) { // Check if the cooldown is still in effect
            const remainingTime = cooldownPeriod - timeDiff; // Remaining time in milliseconds
            const remainingHours = Math.floor(remainingTime / (1000 * 60 * 60)); // Remaining hours
            const remainingMinutes = Math.ceil((remainingTime % (1000 * 60 * 60)) / (1000 * 60)); // Remaining minutes

            return { status: "cooldown" };
        }

        // Update the nickname and the timestamp in the database
        await userCollection.updateOne(
            { username },
            { 
                $set: { 
                    nickname: newNickname, 
                    nameupdate: Date.now() // Set current timestamp as nicknameUpdatedAt 
                } 
            }
        );

        return { status: "success", t: Date.now()};
    } catch (error) {

        throw new Error("Err");
    }
}


module.exports = {
   updateNickname
};
