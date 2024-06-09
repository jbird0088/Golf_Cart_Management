const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); 
require('dotenv').config();

//Import models
const User = require('./models/User');
const Cart = require('./models/Cart');
const Log = require('./models/Log');
const {auth, adminAuth} = require('./middleware/auth');


const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));


//User Registration
app.post('/api/users/register', auth, async (req, res) => {

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
      res.status(201).json(user);
      //If an error occurs send a 500 response
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  });


//Get all users
app.get('/api/users', auth, async (req, res) => {
    try {
      const users = await User.find().select('-password');
      res.json(users);
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  });

  // Delete user
app.delete('/api/users/:id', auth, async (req, res) => {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.json({ msg: 'User removed' });
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
        const payload = {user: {id: user.id, role: user.role}};

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

app.get('/api/admin', auth, adminAuth, (req, res) => {
    res.json({ msg: 'This is an admin route', user: req.user });
  });

//Fetch all carts
app.get('/api/carts', auth, async (req, res) => {
    try {
        //Find all existing carts
        const carts = await Cart.find().sort({ Order: 1 }).exec();
        console.log(carts);

        //send carts in response
        res.json(carts);

    //If error respond with 500 status
    }catch(err){
        res.status(500).json({msg: err.message});
    }
});

//Add a new Cart
app.post('/api/carts', auth, adminAuth, async (req, res) => {
    const { Cart_Number, Cart_Status } = req.body;
  
    // Validate request body
    if (Cart_Number == null || Cart_Status == null) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }
  
    try {
      let cart = await Cart.findOne({ Cart_Number });
      if (cart) return res.status(400).json({ msg: 'Cart already exists' });
  
      cart = new Cart({ Cart_Number, Cart_Status });
      await cart.save();
      res.status(201).json(cart);
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  });

  app.put('/api/carts/:id', auth, async (req, res) => {
    const { Cart_Status, reason, maintenanceContacted } = req.body;

    if (!Cart_Status) {
        return res.status(400).json({ msg: 'Please provide a valid status' });
    }

    try {
        // Determine the new order value
        const newOrder = Cart_Status === 'available' ? 1 : 999;

        const cart = await Cart.findByIdAndUpdate(
            req.params.id,
            { Cart_Status, Order: newOrder },
            { new: true }
        );

        if (!cart) {
            return res.status(404).json({ msg: 'Cart not found' });
        }

        if (Cart_Status === 'out_of_order') {
            // Send an email to admin staff
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: 'jackbird27@gmail.com',
                subject: 'Cart Out of Order Notification',
                text: `Cart ${cart.Cart_Number} is out of order.\n\nReason: ${reason}\nMaintenance Contacted: ${maintenanceContacted ? 'Yes' : 'No'}`,
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return console.error('Error sending email:', error);
                }
                console.log('Email sent:', info.response);
            });
        }

        res.json(cart);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});


// Save new order of carts
app.post('/api/carts/order', auth, async (req, res) => {
    const { carts } = req.body;
  
    try {
      for (const cart of carts) {
        await Cart.findByIdAndUpdate(cart.id, { Order: cart.order });
      }
  
      res.json({ msg: 'Order updated successfully' });
    } catch (err) {
      res.status(500).json({ msg: err.message });
    }
  });
  
    
  
  
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
