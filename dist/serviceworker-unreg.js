'use strict';

// This service worker code should be used. To fully remove service worker and cache

// register our service-worker
navigator.serviceWorker.getRegistrations().then(function (registrations) {
  for (let registration of registrations) {
    registration.unregister()
  }
});

// remove all caches
if(window.caches){
  caches.keys()
    .then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
            return caches.delete(cacheName);
        })
      );
    })
}