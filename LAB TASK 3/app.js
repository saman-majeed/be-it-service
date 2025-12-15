const express = require('express');
const app = express();
const path = require('path');

// Port configuration
const PORT = process.env.PORT || 3000;

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse body data (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Serve static files (CSS, Images)
app.use(express.static(path.join(__dirname, 'public')));

// --- ROUTES ---

// 1. Home Page
app.get('/', (req, res) => {
    res.render('index');
});

// 2. Checkout Page
app.get('/checkout', (req, res) => {
    // In a real app, you might pass cart data here
    res.render('checkout');
});

// 3. Payment Page
app.get('/payment', (req, res) => {
    res.render('payment');
});

// 4. Handle Order Submission (Mock)
app.post('/process-order', (req, res) => {
    const orderData = req.body;
    console.log("Order received:", orderData);
    // Redirect to payment page after processing
    res.redirect('/payment');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
