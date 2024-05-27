const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

//Import models
const User = require('./models/User');
const Cart = require('./models/Cart');
const Log = require('./models/Log');
const auth = require('./middleware/auth');


const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));


//User Registration
app.post('/api/users/register', async (req, res) => {

    //Extract username, role and password from the request body
    const { username, role, password } = req.body;
    try {
      //Check if a user with the username already exists  
      let user = await User.findOne({ username });
      if (user){
        //If user exists, send a 400 response
        return res.status(400).json({ msg: 'User already exists' });
      } 
  
      //Create a new user instance
      user = new User({ username, role, password });
      //Generate a salt for hashing the password
      const salt = await bcrypt.genSalt(10);
      //Hash the password with the generated salt
      user.password = await bcrypt.hash(password, salt);
      //Save the user to the db
      await user.save();
  
      //create a new payload with the user's id
      const payload = { user: { id: user.id } };

      //Sign a JSON Web Toiken with the payload and secret key, set to expire in 1 hour
      jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {

        //Throw error during token generation if needed
        if (err){
            throw err;
        } 

        //Send the generated token in response
        res.json({ token });
      });

      //If an error occurs send a 500 response
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  });

  //User Login
  app.post('/api/users/login', async (req, res) => {

    //Extract username and password from the request body
    const {username, password} = req.body;
    try{

        //Check if a user with the given username exists
        const user = await User.findOne({username});

        //IF the user is not found throw a 400 response
        if(!user){
            return res.status(400).json({msg: "Invalid Credentials"});
        }

        //Compare provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);

        //If passwords do not match send a 400 response
        if(!isMatch){
            return res.status(400).json({msg: "Invalid Credentials"});
        }

        //Create a payload with the user's ID
        const payload = {user: {id: user.id}};

        //Sign a JSON Web Token with the payload and a secret key, set to expire in 1 hour
        jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: 3600}, (err, token) => {

            //Throw error during token generation if needed
            if(err){
                throw err;
            }

            //Send the generated token in the response
            res.json({token});
        });
    
    //If an error occurs, send a 500 response
    }catch(err){
        res.status(500).json({msg: err.message});
    }
  });

  app.get('/api/protected', auth, (req, res) => {
    res.json({ msg: 'This is a protected route', user: req.user });
  });
  

io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
