const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const Product = require('./models/Product'); // Import the model

// Port configuration
const PORT = process.env.PORT || 3000;

// 1. Connect to MongoDB
mongoose.connect('mongodb+srv://samanmajeed110_db_user:iFIE2mQKXSzzvisz@cluster0.vosjip2.mongodb.net/?appName=Cluster0')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

// Set EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- ROUTES ---

// SEED ROUTE: Run this once to populate your DB!
// Go to http://localhost:3000/seed in your browser
app.get('/seed', async (req, res) => {
    // Clear existing data
    await Product.deleteMany({});

    // Insert Sample Data
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

// 2. HOME PAGE (With Pagination & Filtering)
app.get('/', async (req, res) => {
    try {
        // --- Filtering Logic ---
        let query = {};
        if (req.query.category) {
            query.category = req.query.category;
        }

        // --- Pagination Logic ---
        const page = parseInt(req.query.page) || 1; // Current page (default 1)
        const limit = 4; // Items per page
        const skip = (page - 1) * limit;

        // Fetch Data
        const products = await Product.find(query)
            .limit(limit)
            .skip(skip);

        // Get total count for pagination buttons
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        res.render('index', {
            products: products,
            currentPage: page,
            totalPages: totalPages,
            category: req.query.category || '' // Pass current category to keep filter active
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// Checkout Route
app.get('/checkout', (req, res) => {
    res.render('checkout');
});

// Payment Route
app.get('/payment', (req, res) => {
    res.render('payment');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
