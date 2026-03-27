// Code adapted from PWP6
const STORAGE_KEY = "user-information";
const bcrypt = dcodeIO.bcrypt;

// Initialise encryption library
const SECRET_KEY = "learner-hours";
const simpleCrypto = new SimpleCrypto(SECRET_KEY)

// Create constants for the form
const registerForm = document.getElementById("registrationForm");
const loginForm = document.getElementById("loginForm")

// -----------------------------
// Display correct UI based on if there is already an account
// -----------------------------
if (getCredentials().length !== 0) {
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
} else {
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
}

// -----------------------------
// Listen to registration form submissions
// -----------------------------
registerForm.addEventListener("submit", async (event) => { 
    event.preventDefault(); // Prevent form submission 
    
    // Show a loading screen since the operation may take some time
    showLoading();
    
    // Clear previous error messages 
    clearErrors(); 

    // Get form field values 
    const username = document.getElementById("username").value; 
    const password = document.getElementById("password").value; 
    const phone = document.getElementById("phone").value;
    const reenteredPassword = document.getElementById("reenter-password").value; 

    // Track if the form is valid 
    let isValid = true; 

    // Validate Username 
    if (username === "") {  // If username is blank 
        showError("usernameError", "Username is required"); 
        isValid = false; 
    } 

    // Validate Password (min 12 characters, at least one letter, one number and one special character) 
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+-=])[A-Za-z\d!@#$%^&*()_+-=]{12,}$/; 

    if (!passwordPattern.test(password)) { 
        showError("passwordError", "Password must be at least 12 characters long, contain letters, numbers and special characters such as !@#$%^&*()_+-="); 
        isValid = false; 
    } 

    // Check if reentered password matches to verify data
    if (reenteredPassword !== password) {
        showError("reenterPasswordError", "The reentered password does not match the password above")
        isValid = false;
    }

    // Validate Phone Number (must be exactly 10 digits) 
    const phonePattern = /^\d{10}$/; 

    if (!phonePattern.test(phone)) { 
        showError("phoneError", "Phone number must be exactly 10 digits"); 
        isValid = false; 
    } 

    // Check if there is already an account on the device
    if (getCredentials().length !== 0) {
        showError("formError", "There is already an account on this device")
        isValid = false;
    }

    // If the form is valid, submit it or show a success message 
    if (isValid) { 
        const credentials = getCredentials();

        // Hash the password before storing it
        const passwordHash = await bcrypt.hashSync(password, 12);

        // Add the new user data to the user info array
        // It is stored as an array to allow length checking easier
        credentials.push({username, passwordHash, phone});

        // Store the array back in the storage.
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));

        // Store session expiry into sessionStorage as an encrypted value
        // to help prevent tampering. Ideally the secret key is 
        // kept secret on a backend server, but cannot be done within the
        // constraints of this project
        const plainData = generateExpiryTime();
        const cipherData = simpleCrypto.encrypt(plainData);
        window.sessionStorage.setItem("session-info", JSON.stringify(cipherData));

        // Redirect the user to the main page and reset UI
        window.location.replace("index.html");
    } 
    hideLoading();
});

// -----------------------------
// Listen to login form submissions
// -----------------------------
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent form submission
    showLoading(); // Show a loading screen since the operation may take some time

    clearErrors(); // Clear any error messages

    // Get form field values
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;

    // Track if the form is valid
    let isValid = true;

    // Validate username
    if (username === "") {
        showError("login-usernameError", "Username is required");
        isValid = false;
    }

    // Validate password
    if (password === "") {
        showError("login-passwordError", "Password is required")
        isValid = false;
    }

    // Check if the username matches with the stored credentials
    if (username !== getCredentials()[0].username) {
        showError("login-usernameError", "Incorrect username")
        isValid = false;
    }

    // Check if the password matches with the stored credentials
    if (!await bcrypt.compare(password, getCredentials()[0].passwordHash)) {
        showError("login-passwordError", "Incorrect password")
        isValid = false;
    }

    // If everything is valid and correct, 
    if (isValid) {
        // Store session expiry into sessionStorage as an encrypted value to help prevent tampering.
        const plainData = generateExpiryTime();
        const cipherData = simpleCrypto.encrypt(plainData);
        window.sessionStorage.setItem("session-info", JSON.stringify(cipherData));

        // Redirect the user to the main page
        window.location.replace("index.html")
    }
    hideLoading();
});


// -----------------------------
// Define other functions
// -----------------------------
function showLoading() {
    document.getElementById("loading-screen").classList.remove("hidden");
}

function hideLoading() {
    document.getElementById("loading-screen").classList.add("hidden");
}

function generateExpiryTime() {
    let currentDate = new Date();

    // Get the current minutes of the date
    let currentMinutes = currentDate.getMinutes();

    // Add 30 minutes
    currentDate.setMinutes(currentMinutes + 30);

    return currentDate;
}

function getSessionExpiry() {
    // Get the user data from localStorage
    const data = window.sessionStorage.getItem("session-info");

    // If no data was stored, default to an empty string
    // otherwise, return the stored data as parsed JSON
    const expiry = data ? JSON.parse(data) : "";

    return expiry;
}

function getCredentials() {
    // Get the user data from localStorage
    const data = window.localStorage.getItem(STORAGE_KEY);

    // If no data was stored, default to an empty array
    // otherwise, return the stored data as parsed JSON
    const credentials = data ? JSON.parse(data) : [];

    return credentials;
}

// Function to clear all error messages 
function clearErrors() { 
    const errorElements = document.querySelectorAll(".error"); 
    errorElements.forEach(element => element.textContent = ""); 
}

// Function to show error message 
function showError(elementId, message) { 
    document.getElementById(elementId).textContent = message; 
} 