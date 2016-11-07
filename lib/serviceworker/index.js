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
            console.log('sw fetch fail', reason);
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
    slugify: function slugify(str) {
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
    getRouteData: function getRouteData(url) {

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
    isValidCache: function isValidCache(cacheName) {
        return cacheName.indexOf('ghostworker-') === 0 && Utils.endsWith(cacheName, 'v' + this.version);
    },

    // external interface for adding site level options
    addSiteOptions: function addSiteOptions(options) {

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
    },


    // external interface for adding section level options
    addSectionOptions: function addSectionOptions(options) {

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
    }

};

self.addEventListener('activate', function (event) {

    // delete any caches that have the wrong version number
    var self = internals;
    event.waitUntil(caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (key) {
            if (!self.isValidCache(key)) {
                console.log('delete', key);
                return caches.delete(key);
            } else {
                console.log('keep', key);
            }
        }));
    }).then(function () {
        console.log('GhostWorker activated cache: v' + self.version);
    }));
});

self.addEventListener('message', function (event) {
    //console.log('Handling message event:', event);

    var self = internals;
    var msgPackage = Utils.clone(event.data);
    msgPackage.result = {};
    switch (msgPackage.command) {
        // This command returns a list of the URLs corresponding to the Request objects
        // that serve as keys for the current cache.
        case 'getRouteData':
            if (msgPackage.url) {
                (function () {
                    var routeData = self.getRouteData(msgPackage.url);
                    // find base template by name
                    if (routeData.baseTemplate) {
                        self.baseTemplates.forEach(function (baseTemplate) {
                            if (baseTemplate.name && baseTemplate.name === routeData.baseTemplate) {
                                msgPackage.result.baseTemplate = baseTemplate;
                            }
                        });
                    }
                    //else use first base template
                    if (!msgPackage.result.baseTemplate) {
                        self.baseTemplates[0];
                    }
                    msgPackage.result.routeData = routeData;
                    msgPackage.result.version = self.version;
                })();
            } else {
                msgPackage.error = 'No url passed';
            }
            break;
        case 'getSiteData':
            msgPackage.result.baseTemplates = self.baseTemplates;
            msgPackage.result.version = self.version;
            break;
        case 'getVersion':
            msgPackage.result = self.version;
            break;
        default:
            // This will be handled by the outer .catch().
            msgPackage.error = 'Unknown command: ' + msgPackage.command;
    }
    event.ports[0].postMessage(Utils.clone(msgPackage));

    // use event.waitUntil(promise); if you call promise
});




self.addEventListener('fetch', function (event) {

    var self = internals;
    var requestURL = new URL(Utils.urlRemoveBackslash(event.request.url));
    var routeData = self.getRouteData(requestURL);

    if (Utils.endsWith(requestURL.pathname, '-json') || Utils.endsWith(requestURL.pathname, '-template')) {

        event.respondWith(caches.match(event.request).then(function (response) {
            if (response) {
                return response;
            }
            return response;
        }));
    } else if (routeData && event.request.headers.get('X-GhostWorker-Content') !== 'raw') {

        // templates
        var templateRequest = new Request(Utils.urlReplacePath(event.request.url, routeData.template.templatePath), {});
        event.respondWith(caches.match(templateRequest).then(function (response) {

            // if found response with template and instructions to add JSON
            if (response) {
                return self.injectCommand(response, 'GhostWorkerDOM.addJSON();');
            } else {

                // use real request object
                return fetch(event.request).then(function (response) {
                    // with first response add instructions to create template and JSON
                    return self.injectCommand(response, 'GhostWorkerDOM.create();');
                }).catch(function (reason) {
                    console.log('sw fetch fail', reason);
                });
            }
        }));
    } else {
        // everthing else
        event.respondWith(caches.match(event.request).then(function (response) {
            if (response) {
                return response;
            }
            return self.fetchAndCache(event.request, {});
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