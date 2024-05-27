const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  Cart_Number: { type: Number, required: true, ref: 'Cart' },
  Times_Out: { type: Number, required: true }
});

const Log = mongoose.model('Log', logSchema);

module.exports = Log;
