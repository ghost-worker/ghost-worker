'use strict';

import Utils from '../utils.js';
import HAPIRouter from './router';


var internals = {

    version: 0.1,
    site: {},
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
    fetchAndCache: function fetchAndCache(request, options) {

        var self = this;
        options = options || {};
        return fetch(request.clone()).then(function (response) {
            var requestURL = new URL(request.url);
            // has to a GET with 200 status and not a `raw` request to be caches
            if (request.method === 'GET' && response.status > 199 && response.status < 400 && request.headers.get('X-Ghost-Worker-Content') !== 'raw') {
                caches.open('ghostworker-' + self.getCacheName(response) + '-v' + self.version).then(function (cache) {
                    cache.put(request, response);
                });
            }
            return response.clone();
        }).catch(function (reason) {
            console.log('sw fetch fail', reason);
        });
    },

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

    getRouteData: function getRouteData(url) {

        var targetUrl = new URL(url);
        var targetRoute = this.router.route('get', targetUrl.pathname);
        if (targetRoute) {
            // use key to get array of matches from routeMap
            var matchingRoutes = this.routeMap[targetRoute.route];

            if (matchingRoutes.length > 1) {
                var out = null;
                matchingRoutes.forEach(function (route) {
                    if (route.matchFunction && route.matchFunction(targetUrl.pathname, targetRoute)) {
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

    addSiteOptions: function addSiteOptions(options) {

        var self = internals;
        if (options.version) {
            self.version = options.version;
        }
        if (options.template) {
            self.site = options.template;
            if (self.site.elements.indexOf('title') === -1) {
                self.site.elements.unshift('title');
            }
        }
    },

    addSectionOptions: function addSectionOptions(options) {

        var self = internals;
        if (options.template) {
            var route = options.template;

            if (!route.templatePath && route.name) {
                route.templatePath = '/-' + self.slugify(route.name) + '-template';
            }
            route.slug = self.slugify(route.name);

            if (!Array.isArray(route.match)) {
                route.match = [route.match];
            }
            // check title is always included
            route.elements = route.elements || [];

            // auto add title element
            if (route.elements.indexOf('title') === -1) {
                route.elements.unshift('title');
            }

            route.match.forEach(function (match) {
                var match = Utils.removeLastBackslash(match);
                if (!self.router.route('get', match)) {
                    // add route with key so we can match more than one object
                    self.router.add({ method: 'get', path: match }, self.routeKey);
                    self.routeMap[self.routeKey] = [route];
                    self.routeKey++;
                } else {
                    self.routeMap[self.router.route('get', match).route].push(route);
                }
            });
        }
    }

};

self.addEventListener('message', function (event) {
    //console.log('Handling message event:', event);

    var self = internals;
    var msgPackage = Utils.clone(event.data);
    switch (msgPackage.command) {
        // This command returns a list of the URLs corresponding to the Request objects
        // that serve as keys for the current cache.
        case 'getRouteData':
            if (msgPackage.url) {
                msgPackage.result = self.getRouteData(msgPackage.url);
                msgPackage.result.version = self.version;
            } else {
                msgPackage.error = 'No url passed';
            }
            break;
        case 'getSiteData':
            msgPackage.result = self.site;
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
    } else if (routeData && event.request.headers.get('X-Ghost-Worker-Content') !== 'raw') {

        // templates
        var templateRequest = new Request(Utils.urlReplacePath(event.request.url, routeData.templatePath), {});
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


export default {
    version: internals.version,
    site: internals.addSiteOptions,
    section: internals.addSectionOptions
}


