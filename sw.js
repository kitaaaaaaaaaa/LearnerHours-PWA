 // create version number
const VERSION = "v1";

// use the version number to create cache name
const CACHE_NAME = `learner-hours-${VERSION}`;

// list of app resources
const APP_STATIC_RESOURCES = [
    "/",
    "/index.html",
    "/style.css",
    "/app.js",
    "/LearnerHours.json",
    "/icons/icon2.jpg",
    "/NSW_suburbs.json"
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
    // As a single page app, direct app to always go to cached home page.
    if (event.request.mode === "navigate") {  // Looking for a web page
        event.respondWith(caches.match("/"));
        return;
    }

    // For all other requests, go to the cache first, and then the network.
    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(event.request.url);
            if (cachedResponse) {
                // Return the cached response if it's available.
                return cachedResponse;
            }
            // If resource isn't in the cache, return a 404.
            return new Response(null, { status: 404 });
        })(),
    );
});