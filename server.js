require('dotenv').config(); // Load environment variables

const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Stripe secret key from .env
const bodyParser = require('body-parser'); // For handling JSON payloads

const app = express();
const PORT = process.env.PORT || 4000; // Port for the API

// Middleware
app.use(express.static('frontend')); // Serve static files from the 'frontend' folder (for linksvoiid.com)
app.use(bodyParser.json()); // Parse JSON bodies

// CORS configuration
const allowedOrigins =
    process.env.NODE_ENV === 'production'
        ? ['https://linksvoiid.com', 'https://api.linksvoiid.com']
        : ['http://localhost:4000', 'http://127.0.0.1:5500']; // Allow localhost for development

app.use(
    cors({
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
    })
);

// --- Routes ---

// Stripe Publishable Key
app.get('/get-stripe-publishable-key', (req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Stripe Payment Intent Endpoint
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
        console.error('Error creating Payment Intent:', error);
        res.status(500).json({ error: error.message });
    }
});

// Catch-all route for undefined paths
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});
