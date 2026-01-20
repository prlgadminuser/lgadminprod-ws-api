const { isPasswordCorrect, createToken } = require("../utils/utils");
const { userCollection} = require("./..//idbconfig");

const GenerateNewToken = false;

async function Login(username, password) {

  username = String(username); 
  password = String(password); 

  try {
    const user = await userCollection.findOne(
      { "account.username": username },
      {
        projection: {
          "account.username": 1,
          "account.password": 1,
          "account.token": 1,
        },
        hint: "account.username_1",
      }
    );

    if (!user) {
      return { status: "Invalid username or password" };
    }

    const passwordMatch = isPasswordCorrect(password, user.account.password);

    if (!passwordMatch) {
      return { status: "Invalid username or password" };
    }

    let token

    if (GenerateNewToken) {
      token = createToken(user._id);

      await userCollection.updateOne(
        { "account.username": username },
        { $set: { token } },
      );
    } else {
      token = user.account.token;
    }



    return { token: token };
  } catch (error) {
    return { status: "Unexpected error" };
  }
}

module.exports = {
  Login,
};
