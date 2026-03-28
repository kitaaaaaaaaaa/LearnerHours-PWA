// Create constants for the form and the form controls
const newSessionFormEl = document.getElementsByTagName("form")[0];

const dateInputEl = document.getElementById("date");
const startTimeInputEl = document.getElementById("start-time");
const endTimeInputEl = document.getElementById("end-time");

const stateTerritoryInputEl = document.getElementById("state-territory");
const startSuburbInputEl = document.getElementById("start-suburb");
const endSuburbInputEl = document.getElementById("end-suburb");

// Create constants for storing sessions
const STORAGE_KEY = "learner-hours";
const pastSessionContainer = document.getElementById("past-sessions");

// Create constants for search elements
const searchForm = document.getElementById("search-filter-form");

// Initialise encryption library
const SECRET_KEY = "b3dc7ab9b72ccf9c933dedf29d0ea11bcab54f635ed819ebc2c9ad986170a609";
const simpleCrypto = new SimpleCrypto(SECRET_KEY)

// -----------------------------
// Check if the session is expired
// -----------------------------
checkSessionExpired();

async function checkSessionExpired() {
    try {
        // Decrypt session expiry
        const expiry = await simpleCrypto.decrypt(getSessionExpiry())

        // Check if session is expired or if there is no session information
        if (new Date().toISOString() > expiry || expiry === "") {
            // Delete the session information
            window.sessionStorage.removeItem("session-info")

            // Redirect user to the login page
            window.location.replace("register.html")
        }
    } catch (error) {
        // If decryption fails redirect the user to the login/register page
        window.location.replace("register.html")
    }
}

// Check if the session is expired every 10 minutes
setInterval(checkSessionExpired, 10 * 60 * 1000)

function getSessionExpiry() {
    // Get the user data from localStorage
    const data = window.sessionStorage.getItem("session-info");

    // If no data was stored, default to an empty string
    // otherwise, return the stored data as parsed JSON
    const expiry = data ? JSON.parse(data) : "";

    return expiry;
}

// -----------------------------
// Create autocomplete options for suburb input
// -----------------------------
let allSuburbs = [];
const suburbsEl = document.getElementById("suburbs-list");

fetch('au-suburbs.json') // Get a list of all valid suburbs
    .then(response => response.json()) // Parse the text as JSON
    .then(data => {
        allSuburbs = data.map(item => `${item.suburb} ${item.postcode} ${item.state}`); // Format it into an array
        updateSuggestedSuburbs(stateTerritoryInputEl.value, suburbsEl); // Run the function when the page starts
    });

// Update suggestions if dropdown changes
stateTerritoryInputEl.addEventListener("change", () => {
    updateSuggestedSuburbs(stateTerritoryInputEl.value, suburbsEl)
});

// Function to update the suggested list of suburbs
// given an input state or territory and a datalist
function updateSuggestedSuburbs(value, datalist) {
    // Filter the array based on the given value
    filteredSuburbs = allSuburbs.filter(item => item.includes(value));

    datalist.replaceChildren(); // Remove existing datalist elements

    // Create datalist elements for each suburb in the JSON file
    filteredSuburbs.forEach(element => {
        const option = document.createElement("option");
        option.value = element;
        datalist.appendChild(option);
    });
}

// Update suggestions on the search element if it changes
const searchSuburbInput = document.getElementById("search-suburb");
const searchDateInput = document.getElementById("search-date")
const searchSuburbsDatalist = document.getElementById("search-suburbs-list")

searchSuburbInput.addEventListener("input", () => {
    // Convert to lowercase to make search more lenient
    const lowercaseSuburbs = allSuburbs.map(suburb => suburb.toLowerCase());
    // Filter out the suburbs
    const filteredSuburbs = lowercaseSuburbs.filter(item => item.includes(searchSuburbInput.value.toLowerCase()));
    // Loop back through JSON file, and if a suburb matches one of the filtered suburbs, add it
    const displaySuburbs = allSuburbs.filter(suburb => filteredSuburbs.includes(suburb.toLowerCase()));

    searchSuburbsDatalist.replaceChildren(); // Remove existing datalist elements

    // Create datalist elements for each suburb in the JSON file
    displaySuburbs.forEach(element => {
        const option = document.createElement("option");
        option.value = element;
        searchSuburbsDatalist.appendChild(option);
    });
});

// -----------------------------
// Handle showing/hiding the popup to ADD a new session
// -----------------------------
const popupEl = document.getElementById("add-session-popup");
const popupBtn = document.getElementById("add-session-btn");
const cancelPopupBtn = document.getElementById('cancel-add-session')

// Function to show the add session popup
function showSessionPopup() {
    updateSuggestedSuburbs(stateTerritoryInputEl.value, suburbsEl);
    popupEl.classList.remove("hidden");
}

// Function to hide the add session popup
function hideSessionPopup() {
    newSessionFormEl.reset();
    popupEl.classList.add("hidden")
    hideAllErrors();
}

// Add event listeners to the relevant buttons
popupBtn.addEventListener("click", showSessionPopup);
cancelPopupBtn.addEventListener("click", hideSessionPopup);

// -----------------------------
// Listen to form submissions.
// -----------------------------
newSessionFormEl.addEventListener("change", (event) => {
    // Hide errors if the user starts to change their inputs
    hideAllErrors();
});

newSessionFormEl.addEventListener("submit", (event) => {
    // Track if the form is invalid
    let invalid = false;

    // Prevent the form from submitting to the server
    // since everything is client-side.
    event.preventDefault();

    // Get the start and end dates from the form.
    // Sanitise user input as an additional security step to prevent malicious code from being stored
    const date = DOMPurify.sanitize(dateInputEl.value);
    const startTime = DOMPurify.sanitize(startTimeInputEl.value);
    const endTime = DOMPurify.sanitize(endTimeInputEl.value);
    const stateTerritory = DOMPurify.sanitize(stateTerritoryInputEl.value);
    const startSuburb = DOMPurify.sanitize(startSuburbInputEl.value);
    const endSuburb = DOMPurify.sanitize(endSuburbInputEl.value);

    // Hide all errors if they persist from a previous form submission
    hideAllErrors();

    // Check if the date is invalid
    if (checkDateInvalid(date, "date-error")) {
        // If the date is invalid, exit.
        invalid = true;
    }

    // Check if the times are invalid
    if (checkTimesInvalid("", startTime, endTime, date, "start-time-error", "end-time-error")) {
        // If the times are invalid, exit.
        invalid = true;
    }

    // Check if the start and end suburbs are invalid
    if (checkSuburbsInvalid(startSuburb, endSuburb, "start-suburb-error", "end-suburb-error")) {
        // If the suburbs are invalid, exit.
        invalid = true;
    }

    // Check if there is a duplicate entry
    const currentSession = { date, startTime, endTime, stateTerritory, startSuburb, endSuburb };
    if (checkDuplicateSession(currentSession)) {
        showError("end-suburb-error", "A duplicate entry already exists");
        invalid = true;
    }

    // If validation fails, do not store the session
    if (invalid) {
        return;
    }

    // Store the new session in our client-side storage.
    let sessionId = generateUniqueId();
    storeNewSession(sessionId, date, startTime, endTime, stateTerritory, startSuburb, endSuburb);

    // Reset and hide the form
    newSessionFormEl.reset();
    hideSessionPopup();
    hideAllErrors();

    // Refresh the UI.
    refreshUI();

    // Show a confirmation message
    showConfirmation("✅Entry successfully saved", "Your new entry has been saved to your personal database");
});

// -----------------------------
// Define functions for data validation
// -----------------------------

// Function to check if there is a duplicate session upon creation
function checkDuplicateSession(currentSession, sessionId) {
    const sessions = getAllStoredSessions();
    let duplicate = false; // Track if there is a duplicate function

    sessions.forEach((session) => {
        let tempSession = session;

        // If every property is the exact same,
        // and the session id is different, it is a duplicate session
        if (
            tempSession.sessionId !== sessionId &&
            tempSession.date === currentSession.date &&
            tempSession.startTime === currentSession.startTime &&
            tempSession.endTime === currentSession.endTime &&
            tempSession.stateTerritory === currentSession.stateTerritory &&
            tempSession.startSuburb === currentSession.startSuburb &&
            tempSession.endSuburb === currentSession.endSuburb
        ) {
            duplicate = true;
        }
    });

    return duplicate;
}

// Function to check if the date is invalid
function checkDateInvalid(date, errorElementId) {
    // Check that date is not null and is in the past
    const today = new Date().toLocaleDateString("en-AU");

    if (!date || date > today) {
        newSessionFormEl.reset();
        showError(errorElementId, "Date must be in the past");
        // As date is invalid, we return true
        return true;
    }
    // Otherwise...
    return false;
}

// Function to check if the times are invalid
function checkTimesInvalid(sessionId, startTime, endTime, date, startTimeErrorElementId, endTimeErrorElementId) {
    let invalid = false;

    // Check that end time is after start time, and neither is null
    if (!startTime || !endTime || startTime > endTime) {
        showError(startTimeErrorElementId, "Start time must be before end time");
        invalid = true;
    } else if (!startTime) {
        showError(startTimeErrorElementId, "Start time is required");
        invalid = true;
    } else if (!endTime) {
        showError(endTimeErrorElementId, "End time is required");
        invalid = true;
    } else if (timeDifference(startTime, endTime) > "04:00") {
        // Check if the session is longer than 4 hours to promote safe driving
        showError(endTimeErrorElementId, "Session cannot be longer than 4 hours");
        invalid = true;
    }

    // Check if the start time and end time is in the past
    const currentTime = new Date().toLocaleTimeString("en-AU", { hour12: false, hour: "2-digit", minute: "2-digit" })
    if (startTime > currentTime) {
        showError(startTimeErrorElementId, "Start time must be in the past")
        invalid = true;
    } else if (endTime > currentTime) {
        showError(endTimeErrorElementId, "End time must be in the past")
        invalid = true;
    }

    // Check that the start and end times doesn't fall within an existing session
    const sessions = getAllStoredSessions()
    sessions.forEach((session) => {
        if (session.date === date && session.sessionId !== sessionId) {
            if (startTime > session.startTime && startTime < session.endTime) {
                showError(startTimeErrorElementId, "Start time conflicts with existing session");
                invalid = true;
            } else if (endTime < session.endTime && endTime > session.startTime) {
                showError(endTimeErrorElementId, "End time conflicts with existing session");
                invalid = true;
            }
        }
    });

    // If the times are invalid, reset the form and return true
    if (invalid) {
        newSessionFormEl.reset();
        return true;
    }
    return false;
}

// Function to check if the suburbs are valid
function checkSuburbsInvalid(startSuburb, endSuburb, startSuburbErrorElementId, endSuburbErrorElementId) {
    // Check that the inputted suburbs are part of the list of suburbs, and neither is null
    if (!endSuburb || !allSuburbs.includes(endSuburb)) {
        newSessionFormEl.reset()
        showError(endSuburbErrorElementId, "Invalid end suburb");
        return true;
    } else if (!startSuburb || !allSuburbs.includes(startSuburb)) {
        newSessionFormEl.reset()
        showError(startSuburbErrorElementId, "Invalid start suburb");
        return true;
    }
    // Otherwise...
    return false;
}

// -----------------------------
// Define other functions
// -----------------------------

// Function to show a loading screen
function showLoading() {
    document.getElementById("loading-screen").classList.remove("hidden");
}

// Function to hide a loading screen
function hideLoading() {
    document.getElementById("loading-screen").classList.add("hidden");
}

// Function to store a new session in localStorage 
function storeNewSession(sessionId, date, startTime, endTime, stateTerritory, startSuburb, endSuburb) {
    // Get data from storage
    const sessions = getAllStoredSessions();

    // Add the new session object to the end of the array of session objects
    sessions.push({ sessionId, date, startTime, endTime, stateTerritory, startSuburb, endSuburb });

    // Sort the array so that sessions are ordered by date, from newest
    // to oldest
    sessions.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });

    try {
        // Turn the array into a string
        const string = JSON.stringify(sessions);

        // Encrypt the string before storing in local storage
        const cipherText = simpleCrypto.encrypt(string);

        // Store the updated array back in the storage
        window.localStorage.setItem(STORAGE_KEY, cipherText);
    } catch (error) {
        // If an error occurs, alert the user
        showConfirmation("❌Error", "Something went wrong while saving your data")

        // The data will be stored unencrypted instead, to prevent data loss
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
}

// Function to edit a session
function storeEditedSessionArray(sessionArray) {
    // Sort the array so that sessions are ordered by date, from newest
    // to oldest
    sessionArray.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });

    try {
        // Turn the array into a string
        const string = JSON.stringify(sessionArray);

        // Encrypt the string before storing in local storage
        const cipherText = simpleCrypto.encrypt(string);

        // Store the edited array back in the storage.
        window.localStorage.setItem(STORAGE_KEY, cipherText);
    } catch (error) {
        // If an error occurs, alert the user
        showConfirmation("❌Error", "Something went wrong while saving your data")

        // The data will be stored unencrypted instead, to prevent data loss
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionArray));
    }
}

// Function to retrieve sessions from localStorage
function getAllStoredSessions() {
    // Get the string of session data from localStorage
    const cipherText = window.localStorage.getItem(STORAGE_KEY);

    // If no sessions were stored, default to an empty array
    if (cipherText === '[]') {
        return [];
    }

    try {
        // Decrypt the data from localStorage
        const data = simpleCrypto.decrypt(cipherText);

        // Return the data, since it comes decrypted as a parsed JSON
        return data;
    } catch (error) {
        // If an error occurs, alert the user
        showConfirmation("❌Error", "Something went wrong while loading your data");
        return []; // Return an empty array
    }
}

// Function to delete a specific session
function deleteSession(sessionId) {
    const sessions = getAllStoredSessions();

    // Loop through the sessions to find and  delete the specified session
    sessions.forEach((session) => {
        if (sessionId === session.sessionId) {
            const index = sessions.indexOf(session);
            sessions.splice(index, 1);
        }
    })

    // Save the edited session array and refresh the UI
    storeEditedSessionArray(sessions);
    refreshUI();
}

// Function to refresh all elements of the UI
function refreshUI() {
    renderPastSessions(getAllStoredSessions());
    renderTotalHoursLogged();
    renderTotalTrips();
}

// Function to format a date
function formatDate(dateString) {
    // Convert the date string to a Date object.
    const date = new Date(dateString);

    // Format the date into a locale-specific string.
    return date.toLocaleDateString([], {dateStyle: "medium"});
}

// Function to format a time
function formatTime(timeString) {
    // Change from 24-hour to 12-hour format

    // Separate hour and minutes from timeString
    const [hour, minute] = timeString.split(':');

    // Convert hour from string to integer
    intHour = parseInt(hour);

    // Determine if AM or PM
    period = "AM";
    if (intHour > 12) {
        intHour -= 12;
        period = "PM";
    }

    // Display 0 hours as 12 AM
    if (intHour == 0) {
        intHour = 12;
    }

    // Format 12 hour time string
    const formattedTime = intHour + ":" + minute + " " + period;

    return formattedTime;
}

// Function to calculate time difference given times with format HH:MM
function timeDifference(startTime, endTime) {
    // Convert times into minutes
    const totalStartMinutes = HHMMToMinutes(startTime);
    const totalEndMinutes = HHMMToMinutes(endTime);

    // Calculate difference and reformat into HH:MM
    const difference = totalEndMinutes - totalStartMinutes;

    // Return HH:MM
    return minutesToHHMM(difference);
}

// Function to add the duration of all sessions
function addSessionTimes() {
    const sessions = getAllStoredSessions();
    let totalSessionMinutes = 0;

    sessions.forEach((session) => {
        // Calculate the duration of each session
        duration = timeDifference(session.startTime, session.endTime);

        // Convert times into minutes
        const totalDurationMinutes = HHMMToMinutes(duration);
        totalSessionMinutes = totalSessionMinutes + totalDurationMinutes;
    })

    // Format the amount of minutes to HH:MM
    return minutesToHHMM(totalSessionMinutes);
}

// Function to convert format HH:MM to a number of minutes
function HHMMToMinutes(time) {
    hours = time.split(":")[0]
    minutes = time.split(":")[1]

    return Number(hours * 60) + Number(minutes);
}

// Function to convert a number of minutes to format HH:MM
function minutesToHHMM(minutes) {
    hours = Math.floor(minutes / 60); // Divide number of minutes by 60
    minutes = minutes % 60 // Find the remainder

    // Return a string formatted in HH:MM
    return String(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
}

// Function to render the total hours logged on the page
function renderTotalHoursLogged() {
    const totalHoursEl = document.getElementById("total-hours");
    totalHoursEl.textContent = addSessionTimes();
}

// Function to render the total number of trips on the page
function renderTotalTrips() {
    const sessions = getAllStoredSessions();
    const totalTripsEl = document.getElementById("total-trips");
    totalTripsEl.textContent = sessions.length;
}

// Function to show an error message on a form
function showError(elementId, message) {
    // Show the error message with given element id
    const errorElement = document.getElementById(elementId);
    errorElement.classList.remove("hidden");
    errorElement.textContent = message;
}

// Function to hide all error messages on a form
function hideAllErrors() {
    // Select all elements with the error class
    const errorElements = document.querySelectorAll(".error");
    // Hide all error elements and clear their text content
    errorElements.forEach(element => {
        element.classList.add("hidden");
        element.textContent = "";
    });
}

// Function to generate unique IDs for sessions
function generateUniqueId() {
    const sessions = getAllStoredSessions();
    // Generate a unique ID in a cryptographically secure manner
    let uniqueId = SimpleCrypto.generateRandom();

    // Check if the id already exists
    sessions.forEach((session) => {
        if (session.id === uniqueId) {
            uniqueId = generateUniqueId(); // Regenerate the id
        }
    })

    return uniqueId;
}

// Function to display a popup with a message on the screen
function showConfirmation(heading, description) {
    const confirmation = document.getElementById("confirmation")
    confirmation.textContent = ''; // Clear any existing messages

    // Show the confirmation box
    const container = document.getElementById("confirmation-message")
    container.classList.remove("hidden");

    // Create a heading
    const title = document.createElement("h3");
    title.textContent = heading;

    // Create a description
    const text = document.createElement("p");
    text.textContent = description;

    // Create a close button
    const closeButton = document.createElement("button");
    closeButton.id = "close-confirmation";
    closeButton.textContent = "Close";

    // Add them all to the HTML element
    confirmation.appendChild(title)
    confirmation.appendChild(text)
    confirmation.appendChild(closeButton)

    // Attach an event listener for the close button
    closeButton.addEventListener("click", () => {
        container.classList.add("hidden");
    });
}

// -----------------------------
// Allow the user to search for specific sessions
// -----------------------------
searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    // Sanitise the user inputs before working with them (even if it is not rendered to the DOM)
    // Just in case if users find an exploit
    const date = DOMPurify.sanitize(searchDateInput.value)
    const suburb = DOMPurify.sanitize(searchSuburbInput.value)

    // If search inputs are empty, render the sessions as normal
    if (date === '' && suburb === '') {
        showError("search-error", "Invalid search query");
        setTimeout(() => {
            document.getElementById("search-error").classList.add("hidden")
        }, 2 * 1000);
        refreshUI();
        return;
    }

    // Filter the sessions displayed according to the search inputs
    const sessions = getAllStoredSessions();

    filteredSessions = sessions.filter((session) => {
        return session.date === date;
    });

    filteredSessions = sessions.filter((session) => {
        return session.startSuburb === suburb || session.endSuburb === suburb;
    });

    // Refresh the UI
    renderPastSessions(filteredSessions);
    renderTotalHoursLogged();
    renderTotalTrips();

    // Reset the search form
    searchForm.reset();
})

// -----------------------------
// Render the past sessions on the page
// -----------------------------
function renderPastSessions(sessions) {
    // Clear the list of past sessions, since we're going to re-render it
    pastSessionContainer.textContent = "";

    const pastSessionHeader = document.createElement("h2");
    pastSessionHeader.textContent = "Past Sessions";

    const pastSessionList = document.createElement("ul");

    // Exit if there are no sessions
    if (sessions.length === 0) {
        // Display a message to the user
        const noSessionsEl = document.createElement("div");
        noSessionsEl.id = "no-sessions-alert"
        noSessionsEl.textContent = "No sessions found"
        noSessionsEl.style.backgroundColor = "#ffffff";

        pastSessionContainer.appendChild(pastSessionHeader);
        pastSessionContainer.appendChild(noSessionsEl);
        return;
    }

    // Loop over all sessions and render them with additional elements for editing
    sessions.forEach((session) => {
        const sessionEl = document.createElement("li");

        // Create an edit button for each session
        const editEl = document.createElement("button");
        const editIcon = document.createElement("i")
        editIcon.classList.add("fa-regular")
        editIcon.classList.add("fa-pen-to-square")
        editEl.appendChild(editIcon)

        // Create a delete button for each session
        const deleteEl = document.createElement("button");
        const deleteIcon = document.createElement("i")
        deleteIcon.classList.add("fa-solid")
        deleteIcon.classList.add("fa-trash")
        deleteEl.appendChild(deleteIcon)

        // Attach an event listener for when users want to DELETE sessions
        deleteEl.addEventListener("click", () => {
            const confirmation = confirm("Are you sure you want to delete this session?");
            if (confirmation) {
                deleteSession(session.sessionId);
            }
        });

        // Attach an event listener for when users want to EDIT sessions
        editEl.addEventListener("click", () => {
            const editPopupEl = document.getElementById("edit-session-popup");
            const cancelEditPopupBtn = document.getElementById("cancel-edit-session");

            // Manage showing/hiding the popup
            editPopupEl.classList.remove("hidden");
            cancelEditPopupBtn.addEventListener("click", () => {
                editPopupEl.classList.add("hidden");
                editSessionFormEl.removeEventListener("submit", onEditSessionFormSubmit);
            });

            // Declare form elements to manipulate
            const editDateInputEl = document.getElementById("edit-date");
            const editStartTimeInputEl = document.getElementById("edit-start-time");
            const editEndTimeInputEl = document.getElementById("edit-end-time");
            const editStateTerritoryInputEl = document.getElementById("edit-state-territory");
            const editStartSuburbInputEl = document.getElementById("edit-start-suburb");
            const editEndSuburbInputEl = document.getElementById("edit-end-suburb");
            const editSuburbsEl = document.getElementById("edit-suburbs-list")

            // Populate form fields with the session data
            editDateInputEl.value = session.date;
            editStartTimeInputEl.value = session.startTime;
            editEndTimeInputEl.value = session.endTime;
            editStateTerritoryInputEl.value = session.stateTerritory;
            editStartSuburbInputEl.value = session.startSuburb;
            editEndSuburbInputEl.value = session.endSuburb;

            // Update suggestions if dropdown changes
            updateSuggestedSuburbs(editStateTerritoryInputEl.value, editSuburbsEl);
            editStateTerritoryInputEl.addEventListener("change", () => {
                updateSuggestedSuburbs(editStateTerritoryInputEl.value, editSuburbsEl);
            })

            // Listen to form submissions
            const editSessionFormEl = document.getElementById("edit-session-form");

            editSessionFormEl.addEventListener("submit", onEditSessionFormSubmit);

            // When the form is submitted...
            function onEditSessionFormSubmit(event) {
                event.preventDefault(); // Prevent the form from submitting to a server

                let invalid = false; // Track if the form is invalid

                // Get the user inputs from the form
                // Sanitise them as an additional security step to prevent malicious code from being stored
                const editedDate = DOMPurify.sanitize(editDateInputEl.value);
                const editedStartTime = DOMPurify.sanitize(editStartTimeInputEl.value);
                const editedEndTime = DOMPurify.sanitize(editEndTimeInputEl.value);
                const editedStateTerritory = DOMPurify.sanitize(editStateTerritoryInputEl.value);
                const editedStartSuburb = DOMPurify.sanitize(editStartSuburbInputEl.value);
                const editedEndSuburb = DOMPurify.sanitize(editEndSuburbInputEl.value);
                const sessionId = session.sessionId;

                // Hide any persisting errors from previous edits
                hideAllErrors();

                // Validate user inputs
                if (checkDateInvalid(editedDate, "edit-date-error")) {
                    invalid = true;
                };
                if (checkTimesInvalid(sessionId, editedStartTime, editedEndTime, editedDate, "edit-start-time-error", "edit-end-time-error")) {
                    invalid = true;
                };
                if (checkSuburbsInvalid(editedStartSuburb, editedEndSuburb, "edit-start-suburb-error", "edit-end-suburb-error")) {
                    invalid = true;
                };
                // Create a session object for easier comparison
                const sessionObject = { date: editedDate, startTime: editedStartTime, endTime: editedEndTime, stateTerritory: editedStateTerritory, startSuburb: editedStartSuburb, endSuburb: editedEndSuburb }
                if (checkDuplicateSession(sessionObject, sessionId)) {
                    invalid = true;
                    showError("edit-end-suburb-error", "A duplicate entry already exists");
                };

                // Exit if the form is invalid
                if (invalid) {
                    return;
                }

                // Store the edited session in client-side storage
                session.date = editedDate;
                session.startTime = editedStartTime;
                session.endTime = editedEndTime;
                session.stateTerritory = editedStateTerritory;
                session.startSuburb = editedStartSuburb;
                session.endSuburb = editedEndSuburb;

                storeEditedSessionArray(sessions);

                // Refresh the UI
                refreshUI();

                // Reset and hide the form
                editSessionFormEl.reset();
                editPopupEl.classList.add("hidden");
                hideAllErrors();
                editSessionFormEl.removeEventListener("submit", onEditSessionFormSubmit);

                // Show confirmation message
                showConfirmation("✅Entry successfully edited", "Your entry has been updated and is stored in your personal database");
            }
        });

        // Set the display format for the past sessions in main UI
        // Use textContent, which uses output encoding
        const displayDate = formatDate(session.date);
        const displayStartTime = formatTime(session.startTime);
        const displayEndTime = formatTime(session.endTime)
        const displayStartSuburb = session.startSuburb;
        const displayEndSuburb = session.endSuburb;
        const displayDuration = timeDifference(session.startTime, session.endTime);

        const details = document.createElement("span")
        details.classList.add("sessionDetails")

        details.textContent = `${displayDate} - ⏱️${displayDuration}
${displayStartTime} to ${displayEndTime}
${displayStartSuburb} ➔ ${displayEndSuburb}`;

        sessionEl.appendChild(details)
        sessionEl.appendChild(editEl);
        sessionEl.appendChild(deleteEl);
        pastSessionList.appendChild(sessionEl);
    });

    pastSessionContainer.appendChild(pastSessionHeader);
    pastSessionContainer.appendChild(pastSessionList);
}

refreshUI();