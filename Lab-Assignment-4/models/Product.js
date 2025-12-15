const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    category: {
        type: String, // e.g., 'Software', 'Hardware', 'Service'
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    description: String,
    iconClass: String // We will store the FontAwesome class here (e.g., "fa-solid fa-gear")
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
