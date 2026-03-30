 // create version number
const VERSION = "v2";

// use the version number to create cache name
const CACHE_NAME = `learner-hours-${VERSION}`;

// list of app resources
const APP_STATIC_RESOURCES = [
    "./",
    "index.html",
    "style.css",
    "app.js",
    "register.html",
    "register-style.css",
    "register.js",
    "LearnerHours.json",
    "icons/icon1.png",
    "icons/icon2.jpg", 
    "au-suburbs.json",
    "anim/loading.webm",
    "libs/bcrypt.min.js",
    "libs/purify.min.js",
    "libs/SimpleCrypto.min.js",
    "libs/all.min.css",
    "fonts/Figtree-VariableFont_wght.ttf",
    "webfonts/fa-regular-400.woff2",
    "webfonts/fa-solid-900.woff2"
]; 

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            // Open the specified cache.
            const cache = await caches.open(CACHE_NAME); 
            // Add all static files to the cache. 
            cache.addAll(APP_STATIC_RESOURCES); 
        })(), // Immediately invoke the async function.
    );
});

// delete old caches on activate
self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            // Get a list of all the caches
            const names = await caches.keys();
            // Go through the list
            await Promise.all(
            names.map((name) => {
                    // Check if it is not the current cache
                    if (name !== CACHE_NAME) {
                        // delete it
                        return caches.delete(name);
                    }
                }),
            );
            // Set the current service worker as the controller
            await clients.claim();
        })(),
    );
});

// On fetch, intercept server requests
// and respond with cached responses instead of going to network
self.addEventListener("fetch", (event) => {
    // Go to the cache first, and then the network.
    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(event.request);
            if (cachedResponse) {
                // Return the cached response if it's available.
                return cachedResponse;
            }
            // If resource isn't in the cache, use the network
            try {
                return await fetch(event.request);
            } catch (error) {
                return new Response(null, { status: 404 });
            }
        })(),
    );
});