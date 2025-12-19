const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    address: String,
    contact: String,
    paymentMethod: String,
    items: Array,
    total: Number,
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);