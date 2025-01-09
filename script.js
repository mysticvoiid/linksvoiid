let stripe;
let cardElement;

document.addEventListener('DOMContentLoaded', async () => {
    const continueButton = document.getElementById('continueButton');
    const paymentDiv = document.getElementById('paymentDiv');
    const paymentForm = document.getElementById('paymentForm');
    const confirmation = document.getElementById('confirmation');
    const retryButton = document.createElement('button'); // Retry button

    retryButton.textContent = 'Try Again';
    retryButton.style.display = 'none';
    retryButton.id = 'retryButton';
    paymentDiv.parentNode.insertBefore(retryButton, paymentDiv.nextSibling);

    // Continue button always shows the payment form
    continueButton.addEventListener('click', () => {
        continueButton.style.display = 'none'; // Hide the button
        paymentDiv.style.display = 'block'; // Show payment form
    });

    retryButton.addEventListener('click', () => {
        retryButton.style.display = 'none'; // Hide retry button
        paymentDiv.style.display = 'block'; // Show payment form again
    });

    try {
        // Fetch the Stripe publishable key from the server
        const response = await fetch('http://localhost:5000/get-publishable-key');
        const { publishableKey } = await response.json();

        if (!publishableKey) {
            console.error('Failed to fetch Stripe publishable key');
            return;
        }

        // Initialize Stripe with the fetched key
        stripe = Stripe(publishableKey);

        // Mount Stripe Card Element
        const elements = stripe.elements();
        const style = {
            base: {
                color: '#fff', // White text
                fontSize: '16px',
                '::placeholder': {
                    color: '#aaa' // Light gray placeholder
                }
            },
            invalid: {
                color: '#ff4500' // Red text for invalid input
            }
        };
        cardElement = elements.create('card', { style });
        cardElement.mount('#cardElement');

        // Handle Payment Submission
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            try {
                const response = await fetch('http://localhost:5000/create-payment-intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: 80000 }) // $6 = 600 cents
                });

                const { clientSecret, error } = await response.json();

                if (error) {
                    throw new Error(error.message);
                }

                const { paymentIntent, error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
                    payment_method: {
                        card: cardElement
                    }
                });

                if (stripeError) {
                    throw new Error(stripeError.message);
                }

                if (paymentIntent && paymentIntent.status === 'succeeded') {
                    confirmation.style.display = 'block';
                    paymentDiv.style.display = 'none';
                }
            } catch (error) {
                showPaymentError('Payment not processed: ' + error.message);
            }
        });
    } catch (error) {
        console.error('Error initializing Stripe:', error.message);
    }

    // Function to show payment error and enable retry
    function showPaymentError(message) {
        alert(message); // Show pop-up error message
        retryButton.style.display = 'block'; // Show retry button
        paymentDiv.style.display = 'none'; // Hide payment form
    }
});




