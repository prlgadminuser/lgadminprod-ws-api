
const { userCollection, tokenkey } = require('./..//idbconfig');
const { jwt, bcrypt } = require('./..//index');

const GenerateNewToken = false

async function Login(username, password) {
  
    try {
      const user = await userCollection.findOne(
        { username },
        { projection: { username: 1, password: 1, token: 1, } },
      );
  
      if (!user) {
        return { status: "Invalid username or password" };
      }
  
      const passwordMatch = await bcrypt.compare(password, user.password);
  
      if (!passwordMatch) {
        return { status: "Invalid username or password" };
      }
  
      const token = GenerateNewToken ? jwt.sign({ username: user.username }, tokenkey) : user.token;


      if (GenerateNewToken) {
        await userCollection.updateOne({ username }, { $set: { token } });
      }
  
      return { token: token };
    } catch (error) {
        return { status: "unexpected error r" };
    }
  };
   
module.exports = {
    Login
};
