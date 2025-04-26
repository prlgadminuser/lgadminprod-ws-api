
const { userCollection, badWords, usernameRegex, passwordRegex, tokenkey } = require('./..//idbconfig');
const { jwt, bcrypt } = require('./..//index');
const { webhook } = require('./..//discordwebhook');

async function CreateAccount(username, password, user_country) {
    try {
        const finalCountryCode = user_country

        const start_coins = 100

        if (!username || !password) {
            return { status: "Username and password are required" };
        }

        if (username === password) {
            return { status: "Name and password cannot be the same" };
        }

        if (!usernameRegex.test(username)) {
            return { status: "Username not allowed" };
        }

        
        const containsBadWords = badWords.test(username);

        if (containsBadWords) {
            return { status: "Name not allowed. Try another one" };
        }


        if (!passwordRegex.test(password)) {
            return { status: "Invalid password. Ensure there are no special characters" };
        }

        const existingUser = await userCollection.findOne(
            { username: { $regex: new RegExp(`^${username}$`, "i") } },
            { projection: { _id: 0, username: 1 } },
        );

        if (existingUser) {
            return { status: "Name already taken. Choose another one." };
        }

            const hashedPassword = await bcrypt.hash(password, 2);
            const token = jwt.sign({ username }, tokenkey);
            const currentTimestamp = Date.now();

            try {

                const account = {
                    username: username,
                    nickname: username,
                    password: hashedPassword,
                    token: token,
                    country_code: finalCountryCode,
                    created_at: currentTimestamp,
                    last_login: currentTimestamp,
                    lastping: currentTimestamp,
                    type: "user",
                }

                const currency = {
                    coins: start_coins,
                    boxes: 0,      
                }

                const inventory = {
                    items: [],
                    weapons: ["1","2","3"],
                    loadout: { "1": "1","2": "2", "3": "3"},
                    last_collected: 0,
                    nameupdate: 0,
                }

                const equipped = {
                    hat: "0",
                    top: "0",
                    banner: "0",
                    hat_color: 0,
                    top_color: 0,
                    banner_color: 0,

                }

                const stats = {
                    sp: 0,
                    wins: 0,
                    kills: 0,
                    damage: 0,
                }

                await userCollection.insertOne({
                    account,
                    currency,
                    inventory,
                    equipped,
                    stats,
                });


                const joinedMessage = `${username} has joined Skilldown from ${finalCountryCode}`;
                webhook.send(joinedMessage);

                return { token: token };
            } catch (error) {
                return { status: "Unexpected Error"};
            }
    } catch (error) {
        return { status: "Unexpected Error"};
    }
};

module.exports = {
    CreateAccount
};
