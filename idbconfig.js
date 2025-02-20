

const password = process.env.DB_KEY || "8RLj5Vr3F6DRBAYc"
const encodedPassword = encodeURIComponent(password);

const tokenkey = "d8ce40604d359eeb9f2bff31beca4b4b"

const lgconnecturi = `mongodb+srv://Liquem:${encodedPassword}@cluster0.ed4zami.mongodb.net/?retryWrites=true&w=majority`;

const uri = lgconnecturi

module.exports = {
   uri,
   tokenkey,
}