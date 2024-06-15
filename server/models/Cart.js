const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  Cart_Number: { type: Number, unique: true, required: true },
  Cart_Status: { type: String, default: 'available' },
  Status_Set_At: { type: Date, default: Date.now },
  Order: { type: Number, default: 0 },
  TimesUnavailable: {type: Number, default: 0}
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
