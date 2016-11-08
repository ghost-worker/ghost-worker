'use strict';

import Utils from '../utils.js';
import HAPIRouter from './router';


var internals = {

    version: '0.1',
    baseTemplates: [],
    routes: [],
    router: new HAPIRouter.Router(),
    routeKey: 1,
    routeMap: {},

    injectCommand: function injectCommand(response, command) {
        var clonedResponse = response.clone();

        if (clonedResponse.status >= 200 && clonedResponse.status < 400) {
            var options = {
                status: clonedResponse.status,
                statusText: clonedResponse.statusText,
                headers: {
                    'X-GhostWorker': 'Template',
                    'Content-Type': 'text/html'
                }
            };

            // test status before modification
            return clonedResponse.text().then(function (body) {
                return new Response(body + '<script class="ghostworker-script">' + command + '</script>', options);
            });
        } else {
            return response;
        }
    },

    // fetch and then cache successful responses
    // only if 2xx status code is returned and not if its has header X-GhostWorker-Content === raw
    fetchAndCache: function fetchAndCache(request, options) {

        var self = this;
        options = options || {};
        return fetch(request.clone()).then(function (response) {
            var requestURL = new URL(request.url);
            // has to a GET with 200 status and not a `raw` request to be caches
            if (request.method === 'GET' && response.status > 199 && response.status < 400 && request.headers.get('X-GhostWorker-Content') !== 'raw') {
                caches.open('ghostworker-' + self.getCacheName(response) + '-v' + self.version).then(function (cache) {
                    cache.put(request, response);
                });
            }
            return response.clone();
        }).catch(function (reason) {
            console.log('GhostWorker sw fetch fail', reason);

           // if (cxt.offline && event.request.headers.get('Accept').indexOf('text/html') !== -1) {
           //     return caches.match(new Request(cxt.offline));
           // }

        });
    },


    // gets the correct cache based on Content-Type of request
    getCacheName: function getCacheName(response) {

        var cacheType = 'other';
        if (response && response.headers) {
            var name;

            (function () {
                var contentType = response.headers.get('Content-Type');
                if (contentType.indexOf(';') > -1) {
                    contentType = contentType.split(';')[0].trim();
                }

                if (contentType && contentType.indexOf('/') > -1) {
                    var parts = contentType.split('/');
                    switch (parts[0]) {
                        case 'image':
                            cacheType = 'image';
                            break;
                        case 'audio':
                            cacheType = 'audio';
                            break;
                        case 'video':
                            cacheType = 'video';
                            break;
                        case 'application':
                            cacheType = 'application';
                            break;
                        case 'text':
                            cacheType = 'text';
                            break;
                    }

                    var contentMimeTypes = {
                        html: ['text/html', 'application/xhtml+xml'],
                        css: ['text/css'],
                        js: ['application/javascript', 'text/javascript', 'application/json'],
                        font: ['application/vnd.ms-fontobject', 'application/font-woff', 'application/font-woff2', 'application/x-font-truetype', 'application/x-font-opentype']
                    };

                    if (cacheType === 'application' || cacheType === 'text') {
                        for (name in contentMimeTypes) {
                            if (contentMimeTypes.hasOwnProperty(name)) {
                                contentMimeTypes[name].forEach(function (mimeType) {
                                    if (mimeType === contentType) {
                                        cacheType = name;
                                    }
                                });
                            }
                        }
                    }
                }
            })();
        }

        return cacheType;
    },

    // creates a simple slug of text for use in urls
    slugify: function (str) {
        str = str.replace(/^\s+|\s+$/g, ''); // trim
        str = str.toLowerCase();

        // remove accents, swap ñ for n, etc
        var from = "ãàáäâẽèéëêìíïîõòóöôùúüûñç·/_,:;";
        var to = "aaaaaeeeeeiiiiooooouuuunc------";
        for (var i = 0, l = from.length; i < l; i++) {
            str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
        }

        str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

        return str;
    },


    // gets route data based on paths in routing table and pathMatchFunction
    getRouteData: function (url) {

        var targetUrl = new URL(url);
        var targetRoute = this.router.route('get', targetUrl.pathname);
        if (targetRoute) {
            // use key to get array of matches from routeMap
            var matchingRoutes = this.routeMap[targetRoute.route];

            if (matchingRoutes.length > 1) {
                var out = null;
                matchingRoutes.forEach(function (route) {
                    if (route.pathMatchFunction && route.pathMatchFunction(targetUrl.pathname, targetRoute)) {
                        out = route;
                    }
                });
                return out;
            }
            if (matchingRoutes.length === 1) {
                return matchingRoutes[0];
            }
        }
        return null;
    },

    // checks version number of cache to make sure it still valid
    isValidCache: function (cacheName) {
        return cacheName.indexOf('ghostworker-') === 0 && Utils.endsWith(cacheName, 'v' + this.version);
    },

    // external interface for adding site level options
    addSiteOptions: function (options) {

        var self = internals;
        if (options.version) {
            self.version = options.version;
        }
        if (Array.isArray(options.template) === false) {
            options.template = [options.template];
        }
        options.template.forEach(function (template) {
            if (template.elements.indexOf('title') === -1) {
                template.elements.unshift('title');
            }
            if (!template.templatePath) {
                if (template.name) {
                    template.templatePath = '/-base-' + self.slugify(template.name) + '-template';
                } else {
                    template.templatePath = '/-base-template';
                }
            }
            self.baseTemplates.push(template);
        });

        self.preCache = options.preCache
        if(!self.preCache){
            self.preCache = [];
        }
        ['offline', 'notFound', 'error'].forEach(function(item){
            if(options[item]){
                self.appendArray(self.preCache, options[item]);
                self[item] = options[item];
            }
        })
    },


    appendArray: function (arr, item){
        if(Array.isArray(arr) && item){
            if (arr.indexOf(item) === -1) {
                arr.push(item);
            }
        }
        return arr;
    },


    // external interface for adding section level options
    addSectionOptions: function (options) {

        var self = internals;
        var route = options.template;

        if (!options.template.templatePath && options.name) {
            options.template.templatePath = '/-' + self.slugify(options.name) + '-template';
        }
        options.template.slug = self.slugify(options.name);
        options.template.elements = options.template.elements || [];
        if (options.template.elements.indexOf('title') === -1) {
            options.template.elements.unshift('title');
        }


        if (!Array.isArray(options.path)) {
            options.path = [options.path];
        }
        options.path.forEach(function (path) {
            var path = Utils.removeLastBackslash(path);
            if (!self.router.route('get', path)) {
                // add route with key so we can match more than one object
                self.router.add({ method: 'get', path: path }, self.routeKey);
                self.routeMap[self.routeKey] = [options];
                self.routeKey++;
            } else {
                self.routeMap[self.router.route('get', path).route].push(options);
            }
        });
    },

    hasPreCache: function(){
        var self = internals;
        var cacheName = 'ghostworker-precache-v' + self.version;
        return caches.has(cacheName);
    },


    hasPreCache2: function(){
        let has = false;
        return caches.keys()
            .then(function(keyList) {
                keyList.forEach(function(key) {
                    if (key.indexOf('ghostworker-precache-v') === 0) {
                        has = true;
                    }
                });
                return Promise.resolve(has);
            })
    },




    loadPreCache: function(){
        var self = internals;
        var cacheName = 'ghostworker-precache-v' + self.version;

        return self.hasPreCache2()
            .then( function(has){
                // only load if precache is not already built
                if(has === false){
                    // return when loaded
                    return caches.open('ghostworker-precache-v' + self.version)
                        .then( cache => {
                            return cache.addAll(self.preCache);
                        })
                        .catch(function(reason) {
                            console.log(reason);
                        });

                }else{
                    return Promise.resolve();
                }
            })
            .catch(function(reason) {
                console.log(reason);
            });
    }


};

self.addEventListener('activate', function (event) {

    // delete any caches that have the wrong version number
    var cxt = internals;
    event.waitUntil(caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (key) {
            if (!cxt.isValidCache(key)) {
                console.log('GhostWorker delete cache:', key);
                return caches.delete(key);
            } else {
                console.log('GhostWorker keep cache:', key);
            }
        }));
    }).then(function () {
        console.log('GhostWorker activated cache: v' + cxt.version);
    }));
});


self.addEventListener('install', event => {

    var cxt = internals;
    event.waitUntil(cxt.loadPreCache()
        .then( () => self.skipWaiting() )
    );
});


self.addEventListener('message', function (event) {
    //console.log('Handling message event:', event);

    var cxt = internals;
    var msgPackage = Utils.clone(event.data);
    msgPackage.result = {};
    switch (msgPackage.command) {
        // This command returns a list of the URLs corresponding to the Request objects
        // that serve as keys for the current cache.
        case 'getRouteData':
            if (msgPackage.url) {
                (function () {
                    var routeData = cxt.getRouteData(msgPackage.url);
                    // find base template by name
                    if (routeData.baseTemplate) {
                        cxt.baseTemplates.forEach(function (baseTemplate) {
                            if (baseTemplate.name && baseTemplate.name === routeData.baseTemplate) {
                                msgPackage.result.baseTemplate = baseTemplate;
                            }
                        });
                    }
                    //else use first base template
                    if (!msgPackage.result.baseTemplate) {
                        cxt.baseTemplates[0];
                    }
                    msgPackage.result.routeData = routeData;
                    msgPackage.result.version = cxt.version;
                })();
            } else {
                msgPackage.error = 'No url passed';
            }
            break;
        case 'getSiteData':
            msgPackage.result.baseTemplates = cxt.baseTemplates;
            msgPackage.result.version = cxt.version;
            break;
        case 'getVersion':
            msgPackage.result = cxt.version;
            break;
        default:
            // This will be handled by the outer .catch().
            msgPackage.error = 'Unknown command: ' + msgPackage.command;
    }
    event.ports[0].postMessage(Utils.clone(msgPackage));

    // use event.waitUntil(promise); if you call promise
});




self.addEventListener('fetch', function (event) {

    var cxt = internals;
    var requestURL = new URL(Utils.urlRemoveBackslash(event.request.url));
    var routeData = cxt.getRouteData(requestURL);

    if (Utils.endsWith(requestURL.pathname, '-json') || Utils.endsWith(requestURL.pathname, '-template')) {


        console.log('SW: -json or -template request:', requestURL.toString() );
        event.respondWith(caches.match(event.request).then(function (response) {
            if (response) {
                return response;
            }
            return response;
        }));
    } else if (routeData && event.request.headers.get('X-GhostWorker-Content') !== 'raw') {

        // make sure we have preloaded items
        cxt.loadPreCache();

        // templates
        var templateRequest = new Request(Utils.urlReplacePath(event.request.url, routeData.template.templatePath), {});
        event.respondWith(caches.match(templateRequest).then(function (response) {

            // if found response with template and instructions to add JSON
            if (response) {
                console.log('SW: inject command Add:', requestURL.toString() );
                return cxt.injectCommand(response, 'GhostWorkerDOM.addJSON();');
            } else {

                // use real request object
                return fetch(event.request).then(function (response) {
                    // with first response add instructions to create template and JSON
                    console.log('SW: inject command Create:', requestURL.toString() );
                    return cxt.injectCommand(response, 'GhostWorkerDOM.create();');
                }).catch(function (reason) {
                    console.log('GhostWorker sw fetch fail', reason);

                    if (cxt.offline && event.request.headers.get('Accept').indexOf('text/html') !== -1) {
                        var offlineRequest = new Request(Utils.urlReplacePath(event.request.url, cxt.offline), {});
                        return caches.match(offlineRequest)
                            .then(function(response){
                                return response
                            });
                    }
                });
            }
        }));
    } else {
        // everthing else

        // make sure we have preloaded items
        if (event.request.headers.get('Accept').indexOf('text/html') !== -1) {
            cxt.loadPreCache();
        }

        event.respondWith(caches.match(event.request).then(function (response) {
            if (response) {
                // only refetch html resources
               // if (event.request.headers.get('Accept').indexOf('text/html') !== -1) {
               //     cxt.fetchAndCache(event.request, {});
               // }
                return response;
            }else{
                return cxt.fetchAndCache(event.request, {});
            }
            //console.log('SW: add to general cache:', requestURL.toString() );
            //return cxt.fetchAndCache(event.request, {});
        }));
    }
});


var index = {
    version: internals.version,
    site: internals.addSiteOptions,
    section: internals.addSectionOptions
};

/*
self.addEventListener('install', listeners.installListener);
self.addEventListener('activate', listeners.activateListener);
self.addEventListener('fetch', listeners.fetchListener);
*/