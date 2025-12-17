const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const Product = require('./models/Product');
const Contact = require('./models/Contact'); // IMPORT CONTACT MODEL

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect('mongodb+srv://samanmajeed110_db_user:iFIE2mQKXSzzvisz@cluster0.vosjip2.mongodb.net/?appName=Cluster0')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
app.use(session({
    secret: 'my secret key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Make cart available to all views
app.use((req, res, next) => {
    res.locals.cart = req.session.cart || [];
    next();
});

// ================= ADMIN ROUTES =================
app.get('/admin', async (req, res) => {
    const products = await Product.find();
    res.render('admin/dashboard', { products });
});

app.get('/admin/product/new', (req, res) => res.render('admin/edit-product', { editing: false }));

app.post('/admin/product/create', async (req, res) => {
    await new Product(req.body).save();
    res.redirect('/admin');
});

app.get('/admin/product/edit/:id', async (req, res) => {
    const product = await Product.findById(req.params.id);
    res.render('admin/edit-product', { editing: true, product });
});

app.post('/admin/product/update', async (req, res) => {
    const { id, ...data } = req.body;
    await Product.findByIdAndUpdate(id, data);
    res.redirect('/admin');
});

app.get('/admin/product/delete/:id', async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
});

// ================= CUSTOMER ROUTES =================

// Home Page
app.get('/', async (req, res) => {
    let query = {};
    if (req.query.category) query.category = req.query.category;

    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const products = await Product.find(query).limit(limit).skip(skip);
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render('index', { products, currentPage: page, totalPages, category: req.query.category || '' });
});

// Product Detail Page
app.get('/product/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.render('product-details', { product });
    } catch (err) {
        res.redirect('/');
    }
});

// Add to Cart
app.post('/add-to-cart/:id', async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!req.session.cart) req.session.cart = [];
    req.session.cart.push(product);
    res.redirect('/checkout');
});

// Checkout Page
app.get('/checkout', (req, res) => {
    const cart = req.session.cart || [];
    let total = 0;
    cart.forEach(item => total += item.price);
    res.render('checkout', { cart: cart, total: total });
});

// Clear Cart
app.get('/clear-cart', (req, res) => {
    req.session.cart = [];
    res.redirect('/checkout');
});

app.get('/payment', (req, res) => res.render('payment'));

// NEW: Contact Form Handler
app.post('/contact', async (req, res) => {
    try {
        const newContact = new Contact({
            name: req.body.name,
            email: req.body.email,
            message: req.body.message
        });
        await newContact.save();
        console.log("New Message Saved!");
        res.redirect('/?message_sent=true#contact');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error sending message");
    }
});

// Seed Route
app.get('/seed', async (req, res) => {
    await Product.deleteMany({});
    const products = [
        { name: "Software Installation", category: "Software", price: 50, description: "OS and app installation.", iconClass: "fa-solid fa-mobile-screen" },
        { name: "System Boost", category: "Software", price: 80, description: "Speed up your slow computer.", iconClass: "fa-solid fa-gauge-high" },
        { name: "Hardware Repair", category: "Hardware", price: 120, description: "Fixing broken components.", iconClass: "fa-solid fa-gear" },
        { name: "Expert Consulting", category: "Service", price: 60, description: "Professional IT advice.", iconClass: "fa-solid fa-comments" },
        { name: "Virus Removal", category: "Software", price: 45, description: "Clean malware and viruses.", iconClass: "fa-solid fa-shield-virus" },
        { name: "Data Recovery", category: "Service", price: 200, description: "Recover lost files.", iconClass: "fa-solid fa-database" },
        { name: "Screen Replacement", category: "Hardware", price: 150, description: "New screens for laptops.", iconClass: "fa-solid fa-desktop" },
        { name: "Network Setup", category: "Service", price: 100, description: "Home or office wifi setup.", iconClass: "fa-solid fa-wifi" },
    ];
    await Product.insertMany(products);
    res.send("Database Seeded! <a href='/'>Go Home</a>");
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));