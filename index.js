const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const {v4} = require('uuid')
const bcrypt = require('bcrypt')

const app = express()
app.use(cors())
app.use(express.json())

let database = null
const dbPath = path.join(__dirname, 'user_details.db')
const initiliazeDBAndServer = async () => {
    try {
        database = await open({
            filename: dbPath,
            driver: sqlite3.Database
        })
        app.listen(3003, () => {
            console.log('Server is Running at http:///localhost:3003/')
        })
    } catch (error) {
        console.log(`DB Error: ${error}`)
        process.exit(1)
    }
}

initiliazeDBAndServer()

app.post('/signup/', async (request, response) => {
    const {username, password, name, age, gender} = request.body
    const id = v4()
    const getUserQuery = `SELECT * FROM users WHERE username = '${username}'`
    const dbUser = await database.get(getUserQuery)
    if (dbUser === undefined) {
        const hashedPassword = await bcrypt.hash(password, 5)
        const getNewUserQuery = `INSERT INTO users (id, username, password, name, age, gender) VALUES ('${id}', '${username}', '${hashedPassword}', '${name}', ${age}, '${gender}');`
        await database.run(getNewUserQuery)
        response.send('Registered Successfully')
    } else {
        response.status = 400
        response.send("Username already exists")
    }
})

app.post('/login/', async (request, response) => {
    const {username, password} = request.body
    const getUserQuery = `SELECT * FROM users WHERE username = '${username}'`
    const dbUser = await database.get(getUserQuery)
    if (dbUser === undefined) {
        response.status = 400
        response.send("Invalid Username")
    } else {
        const isPasswordValid = await bcrypt.compare(password, dbUser.password)
        if (isPasswordValid) {
            const payload = {username: username}
            const jwtToken = jwt.sign(payload, "TOKEN")
            response.send({jwtToken})
        } else {
            response.status = 400
            response.send("Invalid Password")
        }
    }
})

const authenticateToken = (request, response, next) => {
    console.log('authenticate')
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    }
    console.log(jwtToken)
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "TOKEN", async (error, payload) => {
        console.log(error)
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token2");
        } else {
            request.username = payload.username;
            next();
        }
      });
    }
  };

app.get('/users/', authenticateToken, async (request, response) => {
    const getUsersQuery = `SELECT * FROM users`
    const data = await database.all(getUsersQuery)
    response.send(data)
})