require('dotenv').config(); // Load environment variables
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Stripe secret key from .env
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet'); // Security headers
const morgan = require('morgan'); // Logging middleware

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allow CORS for cross-origin requests
app.use(helmet()); // Add security headers
app.use(morgan('combined')); // Log HTTP requests
app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files (e.g., index.html)

// Root Endpoint
app.get('/', (req, res) => {
    res.json({ message: "Welcome to the LinksVoiid API!" });
});

// Endpoint to provide the Stripe publishable key
app.get('/get-publishable-key', (req, res) => {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
        return res.status(500).json({ error: "Stripe publishable key not found in environment variables." });
    }
    res.json({ publishableKey });
});

// Endpoint to create a PaymentIntent
app.post('/create-payment-intent', async (req, res) => {
    const { amount } = req.body;

    if (!amount) {
        return res.status(400).json({ error: "Amount is required to create a PaymentIntent." });
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // Amount in cents
            currency: 'usd',
            payment_method_types: ['card'],
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Error creating PaymentIntent:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Fallback route for undefined endpoints
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on https://api.linksvoiid.com`);
});
