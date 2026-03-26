// Code adapted from PWP6
const STORAGE_KEY = "user-information";
const bcrypt = require('bcrypt');

document.getElementById("registrationForm").addEventListener("submit", (event) => { 
    event.preventDefault(); // Prevent form submission 

    
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
        // DISPLAY AN ERROR MESSAGE HERE
        isValid = false;
    }

    // If the form is valid, submit it or show a success message 
    if (isValid) { 
        alert("Registration successful!"); 
        
        // Hash the password before storing it
        // const passwordHash = bcrypt.hashSync(password, 12)

        // Add the new user data to the user info array
        // sessions.push({username, passwordHash, phone});

        // Store the array back in the storage.
        // window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } 
});

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