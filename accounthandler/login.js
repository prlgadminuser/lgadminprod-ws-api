
const { userCollection, tokenkey } = require('./..//idbconfig');
const { jwt, bcrypt } = require('./..//index');

const GenerateNewToken = false

async function Login(username, password) {
  
    try {
      const user = await userCollection.findOne(
        { "account.username": username },
        { projection: { "account.username": 1, "account.password": 1, "account.token": 1, } },
      )
  
      if (!user) {
        return { status: "Invalid username or password" };
      }
  
      const passwordMatch = await bcrypt.compare(password, user.account.password);
  
      if (!passwordMatch) {
        return { status: "Invalid username or password" };
      }
  
      const token = GenerateNewToken ? jwt.sign({ username: user.account.username }, tokenkey) : user.account.token;


      if (GenerateNewToken) {
        await userCollection.updateOne({ "account.username": username }, { $set: { token } });
      }
  
      return { token: token };
    } catch (error) {
        return { status: "Unexpected error" };
    }
  };
   
module.exports = {
    Login
};
