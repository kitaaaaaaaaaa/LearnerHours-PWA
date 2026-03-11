// create constants for the form and the form controls
const newSessionFormEl = document.getElementsByTagName("form")[0];

const dateInputEl = document.getElementById("date");
const startTimeInputEl = document.getElementById("start-time");
const endTimeInputEl = document.getElementById("end-time"); 

const stateTerritoryEl = document.getElementById("state-territory");
const startSuburbInputEl = document.getElementById("start-suburb");
const endSuburbInputEl = document.getElementById("end-suburb");

const STORAGE_KEY = "learner-hours";
const pastSessionContainer = document.getElementById("past-sessions");

let allSuburbs = []
const suburbsEl = document.getElementById("suburbs");

// -----------------------------
// Create autocomplete options for location input
// -----------------------------
fetch('au-suburbs.json') // Get a list of all valid suburbs
.then(response => response.json())
.then(data => {
    allSuburbs = data.map(item => `${item.suburb} ${item.postcode} ${item.state}`); // Format it into an array
    updateSuggestedSuburbs() // Run the function when the page starts
});

// Update suggestions if dropdown changes
stateTerritoryEl.addEventListener("change", updateSuggestedSuburbs)

function updateSuggestedSuburbs() {
    filteredSuburbs = allSuburbs.filter(item => item.includes(stateTerritoryEl.value));

    suburbsEl.replaceChildren(); // Remove existing datalist elements

    // Create datalist elements for each suburb in the JSON file
    filteredSuburbs.forEach(element => {
        const option = document.createElement("option");
        option.value = element;
        suburbsEl.appendChild(option);
    });
}

// -----------------------------
// Handle showing/hiding the popup to add a new session
// -----------------------------
const popupEl = document.getElementById("add-session-popup");
const popupBtn = document.getElementById("add-session-btn");
const cancelPopupBtn = document.getElementById('cancel-add-session')

function showSessionPopup() {
    newSessionFormEl.reset();
    popupEl.classList.remove("hidden");
}

function hideSessionPopup() {
    popupEl.classList.add("hidden")
}

popupBtn.addEventListener("click", showSessionPopup);
cancelPopupBtn.addEventListener("click", hideSessionPopup);

// -----------------------------
// Listen to form submissions.
// -----------------------------
newSessionFormEl.addEventListener("submit", (event) => {
    // console.log('You have clicked on the button.'); 

    // Prevent the form from submitting to the server
    // since everything is client-side.
    event.preventDefault();

    // Get the start and end dates from the form.
    const date = dateInputEl.value;
    const startTime = startTimeInputEl.value;
    const endTime = endTimeInputEl.value;
    const startSuburb = startSuburbInputEl.value;
    const endSuburb = endSuburbInputEl.value;

    // Check if the date is invalid
    if (checkDateInvalid(date)) {
        // If the date is invalid, exit.
        return;
    }

    // Check if the times are invalid
    if (checkTimesInvalid(startTime, endTime)) {
        // If the times are invalid, exit.
        return;
    }

    // Check if the start and end suburbs are invalid
    if (checkSuburbsInvalid(startSuburb, endSuburb)) {
        // If the suburbs are invalid, exit.
        return;
    }

    // Store the new session in our client-side storage.
    storeNewSession(date, startTime, endTime, startSuburb, endSuburb);

    // Refresh the UI.
    renderPastSessions();
    renderTotalHoursLogged();

    // Reset the form.
    newSessionFormEl.reset();
    hideSessionPopup();
});

// -----------------------------
// Define functions for data validation
// -----------------------------
function checkDateInvalid(date) {
    // Check that date is not null.
    if (!date) {
    newSessionFormEl.reset();
    // as date is invalid, we return true
    alert("The date is invalid.");
    return true;
    }
    // else
    return false;
    }

function checkTimesInvalid(startTime, endTime) {
    // Check that end time is after start time, and neither is null.
    if (!startTime || !endTime || startTime > endTime) {
    newSessionFormEl.reset();
    // as times are invalid, we return true
    alert("The start/end times are invalid.");
    return true;
    }
    // else
    return false;
}

function checkSuburbsInvalid(startSuburb, endSuburb) {
    // Check that the inputted suburbs are part of the list of suburbs, and neither is null.
    if (!startSuburb || !endSuburb || !allSuburbs.includes(startSuburb) || !allSuburbs.includes(endSuburb)) {
        newSessionFormEl.reset()
        alert("The start/end suburbs are invalid.")
        return true;
    }
    // Else
    return false;
}

// -----------------------------
// Define other functions
// -----------------------------
function storeNewSession(date, startTime, endTime, startSuburb, endSuburb) {
    // Get data from storage. 
    const sessions = getAllStoredSessions();

    // Add the new session object to the end of the array of session objects.
    sessions.push({ date, startTime, endTime, startSuburb, endSuburb });

    // Sort the array so that sessions are ordered by date, from newest
    // to oldest.
    sessions.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });

    // Store the updated array back in the storage.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function getAllStoredSessions() {
    // Get the string of session data from localStorage
    const data = window.localStorage.getItem(STORAGE_KEY);

    // If no sessions were stored, default to an empty array
    // otherwise, return the stored data as parsed JSON
    const sessions = data ? JSON.parse(data) : [];

    return sessions;
}

function renderPastSessions() {
    // get the parsed string of sessions, or an empty array.
    const sessions = getAllStoredSessions();

    // exit if there are no sessions
    if (sessions.length === 0) {
        return;
    }

    // Clear the list of past sessions, since we're going to re-render it.
    pastSessionContainer.textContent = "";
    
    const pastSessionHeader = document.createElement("h2");
    pastSessionHeader.textContent = "Past Sessions";

    const pastSessionList = document.createElement("ul");

    // Loop over all sessions and render them.
    sessions.forEach((session) => {
        const sessionEl = document.createElement("li");
        sessionEl.textContent = `${formatDate(session.date)} from ${formatTime(
            session.startTime,
        )} to ${formatTime(session.endTime)} | ${session.startSuburb} to ${session.endSuburb}
        | Duration - ${timeDifference(session.startTime, session.endTime)}`;
        pastSessionList.appendChild(sessionEl);
    });

    pastSessionContainer.appendChild(pastSessionHeader);
    pastSessionContainer.appendChild(pastSessionList);
}

function formatDate(dateString) {

    // Convert the date string to a Date object.
    const date = new Date(dateString);

    // Format the date into a locale-specific string.
    return date.toLocaleDateString();

}

function formatTime(timeString) {
    // Change from 24-hour to 12-hour format

    // Separate hour and minutes from timeString
    const [hour, minute] = timeString.split(':');

    // Convert hour from string to integer
    intHour= parseInt(hour);

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

function addSessionTimes() {
    const sessions = getAllStoredSessions();
    let totalSessionMinutes = 0;

    sessions.forEach((session) => {
        duration = timeDifference(session.startTime, session.endTime);
        
        // Convert times into minutes
        const totalDurationMinutes = HHMMToMinutes(duration);
        totalSessionMinutes = totalSessionMinutes + totalDurationMinutes;
    })
    
    return minutesToHHMM(totalSessionMinutes);
}

function HHMMToMinutes(time) {
    hours = time.split(":")[0]
    minutes = time.split(":")[1]

    return Number(hours * 60) + Number(minutes);
}

function minutesToHHMM(minutes) {
    hours = Math.floor(minutes / 60);
    minutes = minutes % 60

    return String(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
}


// Render the total hours logged on the page
const totalHoursEl = document.getElementById("total-hours");

function renderTotalHoursLogged() {
    totalHoursEl.textContent = addSessionTimes() + " hours logged";
}


renderPastSessions();
renderTotalHoursLogged();