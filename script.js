// script.js — LIVE: Stripe + simple Posts/Media tabs + single mixed media grid

// ==============================
// Stripe (one-time card payment)
// ==============================
const PLANS = {
  monthly:    { amount: 200, currency: 'usd', label: 'Access' },  // $4.00
  quarterly:  { amount: 199, currency: 'usd', label: 'Access' },  // $1.99
  semiannual: { amount: 299, currency: 'usd', label: 'Access' },  // $2.99
};

// Auto-pick API base for live vs local
const IS_PROD  = /\.?linksvoiid\.com$/i.test(location.hostname);
const API_BASE = IS_PROD ? 'https://api.linksvoiid.com' : 'http://localhost:5000';

let stripe, elements, card, activePlanKey = null;

(async function initStripe() {
  try {
    const res = await fetch(`${API_BASE}/get-stripe-publishable-key`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch publishable key');
    const { publishableKey } = await res.json();
    if (!publishableKey?.startsWith('pk_')) return; // Stripe not needed here

    stripe   = Stripe(publishableKey);
    elements = stripe.elements();
    card     = elements.create('card', { hidePostalCode: true });
    const mount = document.getElementById('card-element');
    if (mount) card.mount('#card-element');
  } catch (err) {
    console.warn('Stripe init skipped:', err.message);
  }
})();

const modal      = document.getElementById('subscribeModal');
const closeBtn   = document.getElementById('closeModalBtn');
const form       = document.getElementById('subForm');
const errorBox   = document.getElementById('subError');
const confirmBtn = document.getElementById('confirmBtn');

// open from pricing buttons
document.querySelectorAll('.sub-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    activePlanKey = btn.getAttribute('data-plan') || 'monthly';
    if (modal) {
      modal.hidden = false;
      document.body.classList.add('modal-open');
    }
  });
});

// open from "Subscribe to unlock video" CTA
document.addEventListener('click', (e) => {
  const cta = e.target.closest('.ppv__cta');
  if (!cta) return;
  activePlanKey = activePlanKey || 'monthly';
  if (modal) {
    modal.hidden = false;
    document.body.classList.add('modal-open');
  }
});

if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
  });
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!stripe || !card) return alert('Payments not ready yet.');

    const plan = PLANS[activePlanKey];
    if (!plan) return alert('Unknown plan.');

    const fullName = document.getElementById('fullName')?.value.trim() || '';
    const email    = document.getElementById('email')?.value.trim() || '';
    const line1    = document.getElementById('line1')?.value.trim() || '';
    const line2    = document.getElementById('line2')?.value.trim() || '';
    const city     = document.getElementById('city')?.value.trim() || '';
    const state    = document.getElementById('state')?.value.trim() || '';
    const postal   = document.getElementById('postal')?.value.trim() || '';
    const country  = document.getElementById('country')?.value.trim() || '';

    confirmBtn && (confirmBtn.disabled = true);
    errorBox && (errorBox.textContent = '');

    try {
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
      window.location.href = 'confirm.html';  // redirect

      if (modal) {
        modal.hidden = true;
        document.body.classList.remove('modal-open');
      }
      form.reset();
    } catch (err) {
      errorBox && (errorBox.textContent = err.message || 'Payment failed. Please try again.');
    } finally {
      confirmBtn && (confirmBtn.disabled = false);
    }
  });
}

// ==============================
// Posts / Media top-level tabs
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  const tabsNav  = document.querySelector('.profile-tabs');
  const tabPosts = document.getElementById('tab-posts');
  const tabMedia = document.getElementById('tab-media');

  if (tabsNav && tabPosts && tabMedia) {
    tabsNav.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-link');
      if (!btn) return;

      tabsNav.querySelectorAll('.tab-link').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const showPosts = btn.dataset.tab === 'posts';
      tabPosts.hidden = !showPosts;
      tabMedia.hidden = showPosts;

      if (!showPosts) buildMixedMediaGrid(); // build once when Media opens
    });
  }
});

// ==============================
// Mixed Media Grid (no sub-filters)
// ==============================
function buildMixedMediaGrid() {
  const grid = document.getElementById('grid-all');
  if (!grid) return;

  if (grid.dataset.built === '1') return; // already built

  const dataEl      = document.getElementById('media-data');
  const totalPhotos = Number(dataEl?.dataset.photos || 183);
  const totalVideos = Number(dataEl?.dataset.videos || 137);
  const durMin      = Number(dataEl?.dataset.durMin || 1);
  const durMax      = Number(dataEl?.dataset.durMax || 28);

  const statMedia = document.getElementById('stat-media');
  if (statMedia) statMedia.textContent = totalPhotos + totalVideos;

  const tplPhoto = document.getElementById('tpl-photo');
  const tplVideo = document.getElementById('tpl-video');
  if (!tplPhoto || !tplVideo) return;

  const frag = document.createDocumentFragment();
  const max  = Math.max(totalPhotos, totalVideos);
  let p = 0, v = 0;

  // Interleave video/photo
  for (let i = 0; i < max; i++) {
    if (v < totalVideos) {
      const vid = tplVideo.content.firstElementChild.cloneNode(true);
      const durEl = vid.querySelector('.media-dur');
      if (durEl) durEl.textContent = randomDuration(durMin, durMax);
      frag.appendChild(vid);
      v++;
    }
    if (p < totalPhotos) {
      const pho = tplPhoto.content.firstElementChild.cloneNode(true);
      frag.appendChild(pho);
      p++;
    }
  }

  grid.appendChild(frag);
  grid.dataset.built = '1';
}

// ==============================
// Small utilities
// ==============================
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomDuration(minM = 1, maxM = 28) {
  const m = randomInt(minM, maxM);
  const s = randomInt(0, 59);
  return `${m}:${String(s).padStart(2, '0')}`;
}


