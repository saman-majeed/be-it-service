const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const Product = require('./models/Product');
const Contact = require('./models/Contact');
const Order = require('./models/Order');

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

// ================= ADMIN ROUTES (PRODUCTS) =================
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

// ============================================
// TASK 4: ADMIN ORDER LIFECYCLE MANAGEMENT
// ============================================

// 1. View All Orders (Admin)
app.get('/admin/orders', async (req, res) => {
    // Fetch all orders, newest first
    const orders = await Order.find().sort({ date: -1 });
    res.render('admin/orders', { orders });
});

// 2. Update Order Status (Step-by-Step Logic)
app.post('/admin/order/update-status/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        const currentStatus = order.status;

        // STRICT LOGIC: Prevent Skipping Steps
        let nextStatus = null;

        if (currentStatus === 'Placed') {
            nextStatus = 'Processing';
        } else if (currentStatus === 'Processing') {
            nextStatus = 'Delivered';
        }

        // Only update if there is a valid next step
        if (nextStatus) {
            order.status = nextStatus;
            await order.save();
        }

        res.redirect('/admin/orders');
    } catch (err) {
        console.error(err);
        res.redirect('/admin/orders');
    }
});

// ================= CUSTOMER ROUTES =================

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

app.get('/product/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.render('product-details', { product });
    } catch (err) {
        res.redirect('/');
    }
});

app.post('/add-to-cart/:id', async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!req.session.cart) req.session.cart = [];
    req.session.cart.push(product);
    res.redirect('/checkout');
});

app.get('/checkout', (req, res) => {
    const cart = req.session.cart || [];
    let total = 0;
    cart.forEach(item => total += item.price);
    res.render('checkout', { cart: cart, total: total });
});

app.get('/clear-cart', (req, res) => {
    req.session.cart = [];
    res.redirect('/checkout');
});

app.get('/payment', (req, res) => res.render('payment'));

app.post('/contact', async (req, res) => {
    try {
        const newContact = new Contact({
            name: req.body.name,
            email: req.body.email,
            message: req.body.message
        });
        await newContact.save();
        res.redirect('/?message_sent=true#contact');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error sending message");
    }
});

// ============================================
// TASK 2: COUPON DISCOUNT MIDDLEWARE
// ============================================
const applyDiscount = (req, res, next) => {
    const couponCode = req.body.coupon;
    const cart = req.session.cart || [];

    // 1. Calculate Base Subtotal
    let subtotal = 0;
    cart.forEach(item => subtotal += item.price);

    // 2. Check Coupon Logic
    let discount = 0;
    if (couponCode === 'SAVE10') {
        discount = subtotal * 0.10;
    }

    // 3. Calculate Final Total
    const grandTotal = subtotal - discount + 10;

    // 4. Attach calculations
    req.calculatedOrder = {
        subtotal: subtotal,
        discount: discount,
        grandTotal: grandTotal,
        couponApplied: couponCode === 'SAVE10'
    };

    next();
};

// ============================================
// ORDER PREVIEW & CONFIRM ROUTES
// ============================================

// 1. Order Preview Route
app.post('/order/preview', applyDiscount, (req, res) => {
    req.session.pendingOrder = {
        address: req.body.address,
        email: req.body.email,
        contact: req.body.contact,
        paymentMethod: req.body.payment,
        subtotal: req.calculatedOrder.subtotal,
        discount: req.calculatedOrder.discount,
        total: req.calculatedOrder.grandTotal
    };

    res.render('order-preview', {
        cart: req.session.cart || [],
        orderInfo: req.session.pendingOrder
    });
});

// 2. Final Confirm Route
app.post('/order/confirm', async (req, res) => {
    try {
        const cart = req.session.cart || [];
        const orderInfo = req.session.pendingOrder;

        if (!orderInfo) return res.redirect('/checkout');

        const newOrder = new Order({
            address: orderInfo.address,
            email: orderInfo.email,
            contact: orderInfo.contact,
            paymentMethod: orderInfo.paymentMethod,
            items: cart,
            total: orderInfo.total,
            status: 'Placed'
        });

        const savedOrder = await newOrder.save();

        req.session.cart = [];
        req.session.pendingOrder = null;

        res.redirect(`/order/success/${savedOrder._id}`);
    } catch (err) {
        console.error(err);
        res.redirect('/checkout');
    }
});

// 3. Success Page Route
app.get('/order/success/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        res.render('order-success', { order });
    } catch (err) {
        res.redirect('/');
    }
});

// ============================================
// TASK 3: CUSTOMER ORDER HISTORY ROUTES
// ============================================

// 1. Show the Search Page (GET)
app.get('/my-orders', (req, res) => {
    res.render('my-orders', { orders: null, error: null });
});

// 2. Process the Search (POST)
app.post('/my-orders', async (req, res) => {
    const userEmail = req.body.email;

    try {
        // Find orders matching the email, newest first
        const orders = await Order.find({ email: userEmail }).sort({ date: -1 });

        if (orders.length === 0) {
            return res.render('my-orders', { orders: [], error: 'No orders found for this email.' });
        }

        res.render('my-orders', { orders: orders, error: null });
    } catch (err) {
        console.error(err);
        res.render('my-orders', { orders: null, error: 'Something went wrong.' });
    }
});

// ============================================
// OLD ROUTES (For Online Payment compatibility)
// ============================================

app.post('/prepare-payment', (req, res) => {
    req.session.pendingOrder = {
        address: req.body.address,
        email: req.body.email,
        contact: req.body.contact,
        paymentMethod: 'Online Credit Card'
    };
    res.redirect('/payment');
});

app.post('/confirm-payment', async (req, res) => {
    try {
        const cart = req.session.cart || [];
        const orderInfo = req.session.pendingOrder || { address: "Unknown", contact: "Unknown", paymentMethod: "Online" };

        let total = 0;
        cart.forEach(item => total += item.price);
        total += 10;

        const newOrder = new Order({
            address: orderInfo.address,
            email: orderInfo.email,
            contact: orderInfo.contact,
            paymentMethod: orderInfo.paymentMethod,
            items: cart,
            total: total,
            status: 'Placed'
        });

        const savedOrder = await newOrder.save();

        req.session.cart = [];
        req.session.pendingOrder = null;

        res.redirect(`/order/success/${savedOrder._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error confirming payment");
    }
});

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