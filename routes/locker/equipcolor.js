const { userCollection } = require('../..//idbconfig');
const { getUserIdPrefix } = require('../../utils/utils');

 const validTypes = {
      HAT: "hat_color",
      TOP: "top_color",
      BANNER: "banner_color",
      POSE: "color", // Assuming 'P' is for a general color or another item color
    };

async function equipColor(userId, type, color) {
    const parsedColor = parseInt(color, 10);

    // Validate the color value
    if (isNaN(parsedColor) || parsedColor < -400 || parsedColor > 400 || parsedColor.toString().length > 5) {
        throw new Error("Invalid color value.");
    }

    // Map the type to the database field under "equipped"

    const dbField = validTypes[type];

    if (!dbField) {
        throw new Error("Invalid type for color.");
    }

    try {
        // Update the user document with the new color under 'equipped'
        const result = await userCollection.updateOne(
             getUserIdPrefix(userId),
            { $set: { [`equipped.${dbField}`]: parsedColor } }
        );

        if (result.modifiedCount === 1) {
            return { status: "success" };
        } else {
            throw new Error("Failed to equip color.");
        }

    } catch (error) {
        throw new Error("Error equipping color: " + error.message);
    }
}

module.exports = {
    equipColor,
};
