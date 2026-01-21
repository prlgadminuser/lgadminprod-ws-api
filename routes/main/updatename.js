const { userCollection, nicknameRegex, badWords } = require('../..//idbconfig'); 
const { getUserIdPrefix, DoesUserNameExist } = require('../../utils/utils');

const oneDay = 86400000
const DaysOfCooldown = 7
const cooldownPeriod = DaysOfCooldown * oneDay; // 24 hours in milliseconds

async function updateUserName(userId, newname) {
    try {
        const newName = newname;

        // Validate the newNickname parameter
        if (!newName) {
            return { status: "not allowed5" };
        }

        // Verify newNickname against the nicknameRegex
        if (!nicknameRegex.test(newName)) {
            return { status: "not allowed" };
        }

        if (badWords.test(newName)) {
            return { status: "not allowed" };
        }

        const user = await userCollection.findOne(
            getUserIdPrefix(userId),
            { projection: { "account.nameupdate": 1 } } // Only return the nicknameUpdatedAt field
        );

        // Check if the nickname can be updated based on the cooldown
        const now = Date.now()
        const next_name_update_cooldown = now + cooldownPeriod
        const next_allowed_update_time = user?.account?.nameupdate || 0; // Default to epoch if no timestamp exists

      
        if (now < next_allowed_update_time) { // Check if the cooldown is still in effect
           // const remainingTime = cooldownPeriod - timeDiff; // Remaining time in milliseconds
           // const remainingHours = Math.floor(remainingTime / (1000 * 60 * 60)); // Remaining hours
           // const remainingMinutes = Math.ceil((remainingTime % (1000 * 60 * 60)) / (1000 * 60)); // Remaining minutes

            return { status: "cooldown" };
        }
        
        const nameTaken = await DoesUserNameExist(newname)

        if (nameTaken) {
            return { status: "taken" };
        }

        // Update the nickname and the timestamp in the database
        await userCollection.updateOne(
             getUserIdPrefix(userId),
            { 
                $set: { 
                    "account.username": newName, 
                    "account.nameupdate": next_name_update_cooldown // Set current timestamp as nicknameUpdatedAt 
                } 
            }
        );

        return { status: "success", next_allowed_namechange: next_name_update_cooldown };
    } catch (error) {
      //  console.log(error)
        throw new Error("Err");
    }
}

module.exports = {
   updateUserName 
};

