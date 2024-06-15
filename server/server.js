const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Cart = require('./models/Cart');
const { auth, adminAuth } = require('./middleware/auth');

const allowedOrigins = [
    'https://golfcartmanagement-ipazzrlvk-jbird0088s-projects.vercel.app',
    'http://localhost:3000'
  ];

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'x-auth-token'],
    credentials: true,
  }));

app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// User Registration
app.post('/api/users/register', auth, async (req, res) => {
  const { username, role, password } = req.body;
  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({ username, role, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    res.status(201).json(user);
    sendUpdates();
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Get all users
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
    sendUpdates();
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// User Login
app.post('/api/users/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const payload = { user: { id: user.id, role: user.role } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {
      if (err) {
        throw err;
      }
      res.json({ token });
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

app.get('/api/protected', auth, (req, res) => {
  res.json({ msg: 'This is a protected route', user: req.user });
});

app.get('/api/admin', auth, adminAuth, (req, res) => {
  res.json({ msg: 'This is an admin route', user: req.user });
});

// Fetch all carts
app.get('/api/carts', auth, async (req, res) => {
  try {
    const carts = await Cart.find().sort({ Order: 1 }).exec();
    res.json(carts);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

// Add a new Cart
app.post('/api/carts', auth, adminAuth, async (req, res) => {
  const { Cart_Number, Cart_Status } = req.body;

  if (Cart_Number == null || Cart_Status == null) {
    return res.status(400).json({ msg: 'Please provide all required fields' });
  }

  try {
    let cart = await Cart.findOne({ Cart_Number });
    if (cart) return res.status(400).json({ msg: 'Cart already exists' });

    cart = new Cart({ Cart_Number, Cart_Status });
    await cart.save();
    res.status(201).json(cart);
    sendUpdates();
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

app.delete('/api/carts/:id', auth, adminAuth, async (req, res) => {
  try {
    await Cart.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Cart removed' });
    sendUpdates();
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
      const newOrder = Cart_Status === 'available' ? 1 : 999;
      const updateData = { Cart_Status, Order: newOrder };
  
      if (Cart_Status === 'unavailable') {
        updateData.$inc = { TimesUnavailable: 1 };
      }
  
      const cart = await Cart.findById(req.params.id);
      if (!cart) {
        return res.status(404).json({ msg: 'Cart not found' });
      }
  
      if (Cart_Status === 'unavailable') {
        cart.TimesUnavailable += 1;
      }
      cart.Cart_Status = Cart_Status;
      cart.Order = newOrder;
  
      await cart.save();
  
      if (Cart_Status === 'out_of_order') {
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
      sendUpdates();
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
    sendUpdates();
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
});

let clients = [];

app.get('/api/updates', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

const sendUpdates = async () => {
  try {
    const carts = await Cart.find().sort({ Order: 1 }).exec();
    clients.forEach(client => {
      client.write(`data: ${JSON.stringify(carts)}\n\n`);
    });
  } catch (err) {
    console.error('Error sending updates:', err);
  }
};

server.listen(5000, () => console.log('Server running on port 5000'));
