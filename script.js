// Auto-pick API base for live vs local
const IS_PROD  = /\.?linksvoiid\.com$/i.test(location.hostname);
const API_BASE = IS_PROD ? 'https://api.linksvoiid.com' : 'http://localhost:5000';

const DEFAULT_PRICE = { amount: 16000, currency: 'usd', label: 'Access' }; // cents
let activePrice = { ...DEFAULT_PRICE };


// Stripe
let stripe, elements, card;

// Cross-step stash
const userData = {
  fullName: '',
  email: '',
  address: { line1: '', city: '', state: '', postal: '', country: 'US' }
};

// ==============================
// Tiny toast utility (instant feedback)
// ==============================
let toastTimer = null;
function ensureToastHost() {
  if (document.getElementById('toastHost')) return;
  const host = document.createElement('div');
  host.id = 'toastHost';
  Object.assign(host.style, {
    position: 'fixed', left: '50%', top: '18px', transform: 'translateX(-50%)',
    zIndex: 2000, display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'center'
  });
  document.body.appendChild(host);
}
function showToast(msg, opts = {}) {
  ensureToastHost();
  const node = document.createElement('div');
  node.textContent = msg;
  Object.assign(node.style, {
    background: opts.bg || 'rgba(15,23,42,.96)', color: '#fff',
    borderRadius: '10px', padding: '10px 14px', fontWeight: 600,
    boxShadow: '0 6px 24px rgba(0,0,0,.25)', fontSize: '14px'
  });
  document.getElementById('toastHost').appendChild(node);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.remove(), opts.ms ?? 1600);
}

// ==============================
// Stripe init (lazy card mount)
// ==============================
(async function initStripe () {
  try {
    const res = await fetch(`${API_BASE}/get-stripe-publishable-key`);
    if (!res.ok) throw new Error('Failed to fetch publishable key');
    const { publishableKey } = await res.json();
    if (!publishableKey?.startsWith('pk_')) return;

    stripe   = Stripe(publishableKey);
    elements = stripe.elements();
  } catch (e) {
    console.warn('Stripe init skipped:', e.message);
  }
})();

function mountCard () {
  if (!elements || card) return;
  const mount = document.getElementById('card-element');
  if (!mount) return;
  card = elements.create('card', { hidePostalCode: true });
  card.mount('#card-element');
}

// ==============================
// Modal + step helpers
// ==============================
const modal        = document.getElementById('subscribeModal');
const closeBtn     = document.getElementById('closeModalBtn');
const backBtn      = document.getElementById('modalBackBtn');

const stepSignup   = document.getElementById('step-signup');
const stepPayment  = document.getElementById('step-payment');

const signupForm   = document.getElementById('signupForm');
const paymentForm  = document.getElementById('paymentForm');

const signupErrBox = document.getElementById('signupError');
const payErrBox    = document.getElementById('subError');

function openModal () {
  if (!modal) return;
  showStep('signup');
  modal.hidden = false;
  document.body.classList.add('modal-open');
}
function closeModal () {
  modal.hidden = true;
  document.body.classList.remove('modal-open');
}
function showStep (which) {
  const isSignup = which === 'signup';
  stepSignup.hidden  = !isSignup;
  stepPayment.hidden =  isSignup;
  if (backBtn) backBtn.hidden = isSignup;

  if (signupErrBox) signupErrBox.textContent = '';
  if (payErrBox)    payErrBox.textContent    = '';

  if (!isSignup) {
    const emailEl = document.getElementById('email');
    const nameEl  = document.getElementById('fullName');
    if (emailEl && userData.email)    emailEl.value = userData.email;
    if (nameEl  && userData.fullName) nameEl.value  = userData.fullName;
    [nameEl].forEach(el => el && toggleFloatClass(el));
    mountCard();
  }
}

// Openers
document.querySelectorAll('.sub-btn, .ppv__cta').forEach(btn => {
  btn.addEventListener('click', () => {
    const amount   = Number(btn.dataset.amount ?? DEFAULT_PRICE.amount);
    const currency = (btn.dataset.currency || DEFAULT_PRICE.currency).toLowerCase();
    const label    = btn.dataset.label || DEFAULT_PRICE.label;
    activePrice = { amount, currency, label };
    openModal();
  });
});
closeBtn?.addEventListener('click', closeModal);
backBtn?.addEventListener('click', () => showStep('signup'));

// ==============================
// STEP 1: Sign up (name + email)
// ==============================
document.getElementById('continueSignupBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  const fullNameEl = document.getElementById('signupFullName');
  const emailEl    = document.getElementById('signupEmail');
  const fullName = fullNameEl?.value.trim() || '';
  const email    = emailEl?.value.trim() || '';
  if (!fullName || !email) {
    if (signupErrBox) signupErrBox.textContent = 'Please enter your name and email.';
    return;
  }
  userData.fullName = fullName;
  userData.email    = email;
  showStep('payment');
});

// ==============================
// STEP 2: Payment submit
// ==============================
paymentForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!stripe || !elements) {
    payErrBox && (payErrBox.textContent = 'Payments not ready yet.');
    return;
  }
  if (!card) mountCard();

  // collect billing fields
  userData.fullName        = document.getElementById('fullName')?.value.trim() || userData.fullName;
  userData.email           = document.getElementById('email')?.value.trim()     || userData.email;
  userData.address.line1   = document.getElementById('line1')?.value.trim()     || '';
  userData.address.city    = document.getElementById('city')?.value.trim()      || '';
  userData.address.state   = document.getElementById('state')?.value            || '';
  userData.address.postal  = document.getElementById('postal')?.value.trim()    || '';
  userData.address.country = document.getElementById('country')?.value.trim()   || 'US';

  if (!userData.fullName || !userData.email || !userData.address.line1 ||
      !userData.address.city || !userData.address.state || !userData.address.postal) {
    payErrBox && (payErrBox.textContent = 'Please complete all required fields.');
    return;
  }
  payErrBox && (payErrBox.textContent = '');

  // Button loading state + instant toast
  const btn = document.getElementById('confirmBtn');
  const originalText = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Processing…';
  }
  showToast('Submitting payment…');

  try {
    // 1) Create PaymentIntent (server)
    const res = await fetch(`${API_BASE}/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activePrice)
    });
    const data = await res.json();
    if (!res.ok || !data.clientSecret) throw new Error(data.error || 'Failed to create payment');

    // 2) Confirm card payment (Stripe)
    const result = await stripe.confirmCardPayment(data.clientSecret, {
      payment_method: {
        card,
        billing_details: {
          name: userData.fullName,
          email: userData.email,
          address: {
            line1: userData.address.line1,
            city: userData.address.city,
            state: userData.address.state,
            postal_code: userData.address.postal,
            country: userData.address.country
          }
        }
      }
    });

    if (result.error) throw new Error(result.error.message);

    // 3) Success
    showToast('Payment successful! 🎉', { bg: '#16a34a', ms: 200 });
    alert('Payment successful! 🎉');          // instant classic alert as well
    window.location.href = 'confirm.html';
  } catch (err) {
    showToast('Payment failed', { bg: '#dc2626', ms: 200 });
    payErrBox && (payErrBox.textContent = err.message || 'Payment failed. Please try again.');
    alert(`Payment failed: ${err.message || 'Please try again.'}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText || 'Start subscription';
    }
  }
});

// ==============================
// Floating label helpers (name fields if used)
// ==============================
function toggleFloatClass (input) {
  const wrapper = input.closest('.float');
  if (!wrapper) return;
  if (input.value.trim() !== '') wrapper.classList.add('has-value');
  else wrapper.classList.remove('has-value');
}
document.querySelectorAll('#subscribeModal .float > input').forEach(inp => {
  toggleFloatClass(inp);
  inp.addEventListener('input', () => toggleFloatClass(inp));
  inp.addEventListener('blur',  () => toggleFloatClass(inp));
});

// ==============================
// Bio toggle: show/hide More info button
// ==============================
(function wireBioToggles () {
  document.querySelectorAll('.bio-block').forEach(block => {
    const morePanel   = block.querySelector('#bio-more, .bio-more');
    const expandBtn   = block.querySelector('.bio-toggle[data-toggle="expand"]');
    const collapseBtn = block.querySelector('.bio-toggle[data-toggle="collapse"]');
    if (!morePanel || (!expandBtn && !collapseBtn)) return;

    function applyState(expanded) {
      morePanel.hidden = !expanded;
      if (expandBtn) {
        expandBtn.style.display = expanded ? 'none' : 'inline';
        expandBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      }
      if (collapseBtn) {
        collapseBtn.style.display = expanded ? 'inline' : 'none';
        collapseBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      }
    }
    applyState(!morePanel.hidden);
    expandBtn?.addEventListener('click', () => applyState(true));
    collapseBtn?.addEventListener('click', () => applyState(false));
  });
})();

// ==============================
// Tabs: Posts | Media
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

      if (!showPosts) buildMixedMediaGrid();
    });
  }
});

// ==============================
// Mixed Media Grid
// ==============================
function buildMixedMediaGrid () {
  const grid = document.getElementById('grid-all');
  if (!grid || grid.dataset.built === '1') return;

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

  for (let i = 0; i < max; i++) {
    if (v < totalVideos) {
      const vid = tplVideo.content.firstElementChild.cloneNode(true);
      const durEl = vid.querySelector('.media-dur');
      if (durEl) durEl.textContent = randomDuration(durMin, durMax);
      frag.appendChild(vid); v++;
    }
    if (p < totalPhotos) {
      const pho = tplPhoto.content.firstElementChild.cloneNode(true);
      frag.appendChild(pho); p++;
    }
  }

  grid.appendChild(frag);
  grid.dataset.built = '1';
}

// ==============================
// Utilities
// ==============================
function randomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomDuration (minM = 1, maxM = 28) {
  const m = randomInt(minM, maxM);
  const s = randomInt(0, 59);
  return `${m}:${String(s).padStart(2, '0')}`;
}

















