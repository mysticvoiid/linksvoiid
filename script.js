// script.js — single one-time payment via Card Element

const PLANS = {
  monthly:    { amount: 200,  currency: 'usd', label: 'Access' },
  quarterly:  { amount: 199, currency: 'usd', label: 'Access' },
  semiannual: { amount: 299, currency: 'usd', label: 'Access' },
};

const API_BASE = 'http://localhost:5000';

let stripe, elements, card, activePlanKey = null;

(async function initStripe() {
  const { publishableKey } =
    await fetch(`${API_BASE}/get-stripe-publishable-key`).then(r => r.json());
  if (!publishableKey?.startsWith('pk_')) {
    alert('Missing/invalid Stripe publishable key.'); return;
  }
  stripe   = Stripe(publishableKey);
  elements = stripe.elements();
  card     = elements.create('card', { hidePostalCode: true });
  card.mount('#card-element');
})();

const modal      = document.getElementById('subscribeModal');
const closeBtn   = document.getElementById('closeModalBtn');
const form       = document.getElementById('subForm');
const errorBox   = document.getElementById('subError');
const confirmBtn = document.getElementById('confirmBtn');

document.querySelectorAll('.sub-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    activePlanKey = btn.getAttribute('data-plan');
    modal.hidden = false;
    document.body.classList.add('modal-open');
  });
});

closeBtn.addEventListener('click', () => {
  modal.hidden = true;
  document.body.classList.remove('modal-open');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!stripe || !card) return alert('Payments not ready yet.');

  const plan = PLANS[activePlanKey];
  if (!plan) return alert('Unknown plan.');

  const fullName = document.getElementById('fullName').value.trim();
  const email    = document.getElementById('email').value.trim();
  const line1    = document.getElementById('line1').value.trim();
  const line2    = document.getElementById('line2').value.trim();
  const city     = document.getElementById('city').value.trim();
  const state    = document.getElementById('state').value.trim();
  const postal   = document.getElementById('postal').value.trim();
  const country  = document.getElementById('country').value.trim();

  confirmBtn.disabled = true;
  errorBox.textContent = '';

  try {
    // Create ONE-TIME PaymentIntent on backend
    const res = await fetch(`${API_BASE}/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: plan.amount,
        currency: plan.currency,
        label: plan.label
      })
    });
    const data = await res.json();
    if (!res.ok || !data.clientSecret) throw new Error(data.error || 'Failed to create payment');

    // Confirm with Card Element (card-only)
    const result = await stripe.confirmCardPayment(data.clientSecret, {
      payment_method: {
        card,
        billing_details: {
          name: fullName,
          email,
          address: { line1, line2, city, state, postal_code: postal, country }
        }
      }
    });

    if (result.error) throw new Error(result.error.message);

    alert('Payment successful! 🎉');
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    form.reset();
  } catch (err) {
    errorBox.textContent = err.message || 'Payment failed. Please try again.';
  } finally {
    confirmBtn.disabled = false;
  }
});









