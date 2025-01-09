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
    res.send('API is running on api.linksvoiid.com');
});

// Endpoint to provide the Stripe publishable key
app.get('/get-publishable-key', (req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Endpoint to create a PaymentIntent
app.post('/create-payment-intent', async (req, res) => {
    const { amount } = req.body;

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

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on https://api.linksvoiid.com`);
});





