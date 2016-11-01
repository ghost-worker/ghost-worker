'use strict';

import Utils from '../utils.js';
import Messaging from './messaging.js';
import PatchDOM from 'morphdom';




// The module pattern
var GhostWorkerDOM = function () {

    var m = {};
    m.version = null;
    m.cacheName = 'ghostworker';
    m.contentEvent = new Event('GhostWorkerLoaded');
    m.contentDOMLoadedEvent = new Event('GhostWorkerDOMContentLoaded');

    m.getVersion = function () {

        var self = this;
        return Messaging.getVersion().then(function (version) {
            self.version = version;
            return version;
        });
    };

    m.create = function () {

        var self = this;
        var url = document.location.href;
        //this.createJSON(document, url);

        Messaging.getSiteData().then(function (siteData) {

            if (siteData) {
                self.createJSON(document, url, siteData);
                self.match(Utils.urlReplacePath(url, siteData.templatePath), '-template').then(function (response) {
                    // create base template first
                    if (response.error) {
                        self.createTemplate(document, url, siteData, siteData);
                    }
                    // then build route template
                    self.createTemplate(document, url, null, siteData);
                });
            } else {
                this.createTemplate(document, url, null, siteData);
            }
            // fire off as we have all the HTML loaded before we create templates
            document.dispatchEvent(self.contentDOMLoadedEvent);
        });
    };

    m.hasTemplate = function (url) {

        var self = this;

        return Messaging.getRouteData(url).then(function (routeData) {
            var request = self.newRequest(Utils.urlReplacePath(url, routeData.templatePath), {});
            return window.caches.match(request);
        }).then(function (response) {
            return response ? true : false;
        });
    };

    // creates JSON from full DOM
    m.createJSON = function (doc, url, siteData) {

        // create json object
        var self = this;
        var out = {};
        out.replacements = [];
        //var routeData = Messaging.getRouteData( url );

        return Messaging.getRouteData(url).then(function (routeData) {

            routeData.elements.forEach(function (selector) {
                var nodeList = doc.querySelectorAll(selector);
                var item = {
                    selector: selector,
                    content: []
                };
                if (nodeList) {
                    for (var i = 0; i < nodeList.length; ++i) {
                        item.content.push(nodeList[i].outerHTML);
                    }
                }
                out.replacements.push(item);
            });

            out.metaTags = self.loopMetaTags(siteData, routeData, doc, false);
            out.linkTags = self.loopLinkTags(siteData, routeData, doc, false);

            var headers = new Headers();
            headers.append('X-Ghost-Worker-Cache-Date', new Date().toISOString());
            self.jsonRequest = self.newRequest(Utils.urlJoinPath(url, '-json'), { 'headers': headers });
            self.jsonResponse = self.newResponse(JSON.stringify(out), 'application/json');
            self.put(self.cacheName + '-' + routeData.slug + '-v' + routeData.version, self.jsonRequest, self.jsonResponse);

            return out;
        }).catch(function (reason) {
            console.log('createJSON' + reason);
        });

        //return out;
    };

    // creates template from full DOM
    m.createTemplate = function (doc, url, routeData, siteData) {

        // create html template
        var self = this;
        var out = {};
        out.replacements = [];

        // check if routeData is object if so resolve directly if not go get it
        return (routeData ? Promise.resolve(routeData) : Messaging.getRouteData(url)).then(function (routeData) {

            var newDoc = document.documentElement.cloneNode(true);
            self.removeGhostworkerScript(newDoc);
            self.clearElements(newDoc, routeData.elements);
            // remove meta and link values from page that need updating with data
            self.loopMetaTags(siteData, routeData, newDoc, true);
            self.loopLinkTags(siteData, routeData, newDoc, true);

            var headers = new Headers();
            headers.append('X-Ghost-Worker-Cache-Date', new Date().toISOString());
            self.templateRequest = self.newRequest(Utils.urlReplacePath(url, routeData.templatePath), { 'headers': headers });
            self.templateResponse = self.newResponse(newDoc.outerHTML, 'text/html');
            self.put(self.cacheName + '-template-v' + routeData.version, self.templateRequest, self.templateResponse);
            return newDoc.outerHTML;
        }).catch(function (reason) {
            console.log('createTemplate' + reason);
        });
    };

    m.clearElements = function (document, elements) {
        if (elements) {
            elements.forEach(function (selector) {
                var nodeList = document.querySelectorAll(selector);
                if (nodeList) {
                    for (var i = 0; i < nodeList.length; ++i) {
                        // leave as innerHTML so we can target element with selector later
                        nodeList[i].innerHTML = '';
                    }
                }
            });
        }
    };

    // <meta> tag data collection and value blanking
    m.loopMetaTags = function (siteData, routeData, doc, removeValues) {
        var out = null;
        var metaNames = siteData.metaTags || [];
        if (routeData && routeData.metaTags) {
            metaNames.concat(routeData.metaTags);
        }
        var nodeList = doc.querySelectorAll('meta');
        if (nodeList) {
            for (var i = 0; i < nodeList.length; ++i) {
                if (nodeList[i].name && nodeList[i].content) {
                    var name = nodeList[i].name;
                    if (metaNames.indexOf(name) > -1) {

                        out = out || {};
                        out[name] = nodeList[i].content;

                        if (removeValues === true) {
                            nodeList[i].content = '';
                        }
                    }
                }
            }
        }
        return out;
    };

    // <link> tag data collection and value blanking
    m.loopLinkTags = function (siteData, routeData, doc, removeValues) {
        var out = null;
        var links = siteData.linkTags || [];
        if (routeData && routeData.linkTag) {
            links.concat(routeData.linkTag);
        }
        // link[{attr:value}]
        links.forEach(function (link) {
            var selector = 'link';
            for (var attrKey in link) {
                if (attrKey.hasOwnProperty(link)) {
                    selector += '[' + attrKey + '="' + link[attrKey] + '"]';
                }
            }
            var node = doc.querySelector(selector);
            if (node && node.href) {

                var letNewlink = Utils.clone(link);
                letNewlink.href = node.href;
                out = out || [];
                out.push(letNewlink);

                if (removeValues === true) {
                    node.href = '';
                }
            }
        });

        return out;
    };

    m.removeGhostworkerScript = function (doc) {
        var nodeList = doc.querySelectorAll('.ghostworker-script');
        if (nodeList) {
            for (var i = 0; i < nodeList.length; ++i) {
                nodeList[i].parentNode.removeChild(nodeList[i]);
            }
        }
    };

    m.newRequest = function (url, options) {
        return new Request(url, options);
    };

    m.newResponse = function (bodyString, type) {
        var options = {
            status: 200,
            statusText: "OK",
            headers: { 'Content-Type': type } // text/html or application/json
        };
        return new Response(bodyString, options);
    };

    m.put = function (cacheName, request, response) {
        caches.open(cacheName).then(function (cache) {
            if (request && response) {
                cache.put(request, response);
            }
        });
    };

    m.match = function (url, options) {
        var request = this.newRequest(url, options);
        return caches.match(request).then(function (response) {
            return response;
        });
    };

    // call to add JSON to page
    m.addJSON = function (url, redrawLevel) {

        var self = this;
        url = url || document.location.href;

        var routeData = Messaging.getRouteData(url);

        Promise.all([Messaging.getSiteData(), Messaging.getRouteData(url)]).then(function (results) {
            var siteData = results[0];
            var routeData = results[1];

            // add header so the template logic is not fired in service worker
            var headers = new Headers();
            headers.append('X-Ghost-Worker-Content', 'raw');
            headers.append('X-Ghost-Worker-RouteData', JSON.stringify(routeData));

            var request = new Request(url, { headers: headers });

            // find JSON in cache
            // *********************************************************************************************************** //
            self.match(new Request(Utils.urlJoinPath(url, '-json')), '-json').then(function (json) {

                // has a site template info

                // does current template match new template
                if (siteData && redrawLevel === 'site') {
                    // default to site template
                    self.clearElements(document, siteData.elements);
                    // remove meta and link values from page that need updating with data
                    self.loopMetaTags(siteData, routeData, document, true);
                    self.loopLinkTags(siteData, routeData, document, true);

                    // load template from cache
                    var templateRequest = self.newRequest(Utils.urlReplacePath(url, routeData.templatePath), {});
                    // *********************************************************************************************************** //
                    self.match(templateRequest, '-template').then(function (templateJSON) {
                        if (!templateJSON) {
                            console.log('addJSON no template found');
                        } else {
                            self.injectTemplateJSON(templateJSON).then(function (done) {
                                if (!json.error) {
                                    self.injectJSON(json, true);
                                }
                            });
                        }
                    });
                } else {
                    if (!json.error) {
                        self.injectJSON(json, true);
                    }
                }

                // get it from network inject either to add or update content
                // *********************************************************************************************************** //
                self.createJSONFromNetwork(request, siteData).then(function (json) {
                    if (json && !json.error) {
                        self.injectJSON(json, false);
                    } else {
                        console.log('createJSONFromNetwork');
                    }
                }).catch(function (reason) {
                    console.log('createJSONFromNetwork' + reason);
                });
            });
        }).catch(function (reason) {
            console.log(reason);
        });
    };

    // get JSON form network - downloads HTML and creates JSON structure
    m.createJSONFromNetwork = function (request, siteData) {

        var self = this;
        return fetch(request).then(function (response) {

            if (request.method === 'GET' && response.status > 199 && response.status < 400) {

                return response.text().then(function (body) {
                    var parser = new DOMParser();
                    return parser.parseFromString(body, "text/html");
                }).then(function (doc) {
                    return self.createJSON(doc, request.url, siteData);
                });
            } else {
                return { error: 'response issue' };
            }
        }).catch(function (reason) {
            console.log('createJSONFromNetwork', reason);
        });
    };

    // get  -json or -template responses from cache
    m.match = function (request, suffix) {

        return window.caches.match(request).then(function (response) {

            if (response) {
                var clonedResponse = response.clone();
                if (clonedResponse && clonedResponse.status >= 200 && clonedResponse.status < 400) {
                    return response.text().then(function (body) {
                        return suffix === '-json' ? JSON.parse(body) : { 'template': body };
                    });
                }
                return { error: 'response issue' };
            } else {
                return { error: 'no match' };
            }
        });
    };

    m.injectTemplateJSON = function (json) {

        var parser = new DOMParser();
        var doc = parser.parseFromString(json.template, "text/html");

        // copy elements between documents to recreate a route template
        return Messaging.getSiteData().then(function (siteDate) {
            if (siteDate && siteDate.elements) {
                siteDate.elements.forEach(function (selector) {
                    var destination = document.querySelector(selector);
                    var source = doc.querySelector(selector);
                    destination.parentNode.replaceChild(source, destination);
                });
            }
            return true;
        });
    };

    m.injectJSON = function (json, firstDraw) {
        var self = this;

        // elements
        json.replacements.forEach(function (replacement, idx) {
            var nodeList = document.querySelectorAll(replacement.selector);
            if (nodeList) {
                for (var i = 0; i < nodeList.length; ++i) {
                    if (replacement.content[i]) {
                        //nodeList[i].outerHTML = replacement.content[i];

                        // on update this should patch direct from one DOM node to another rather than using JSON html
                        PatchDOM(nodeList[i], replacement.content[i]);

                        // fire after last modification of DOM from injecting JSON
                        if (idx === json.replacements.length - 1 && i === nodeList.length - 1) {
                            document.dispatchEvent(self.contentDOMLoadedEvent);
                        }
                    }
                }
            }
        });

        // meta
        if (json.metaTags) {
            for (name in json.metaTags) {
                var selector = 'meta[name="' + name + '"]';
                var node = document.querySelector(selector);
                if (node && node.content) {
                    node.content = json.metaTags[name];
                }
            }
        }

        // link
        if (json.linkTags) {
            json.linkTags.forEach(function (link) {
                var selector = 'link';
                for (var attr in link) {
                    if (link.hasOwnProperty(attr)) {
                        if (attr !== 'href') {
                            selector += '[' + attr + '="' + link[attr] + '"]';
                        }
                    }
                }
                var node = document.querySelector(selector);
                if (node && node.href && link.href) {
                    node.href = link.href;
                }
            });
        }

        this.captureLinks();
    };

    m.captureLinks = function () {
        var nodeList = document.querySelectorAll('a');
        if (nodeList) {
            for (var i = 0; i < nodeList.length; ++i) {

                // browser should not allow binding twice
                //nodeList[i].removeEventListener('click', this.clickEvent ,true);
                nodeList[i].addEventListener('click', this.clickEvent, true);
            }
        }
    };

    m.clickEvent = function (e) {
        console.log('link fired');

        var documentUrl = new URL(document.location.href);
        var targetUrl = new URL(e.currentTarget.href);

        e.preventDefault();

        Promise.all([Messaging.getRouteData(documentUrl.toString()), Messaging.getRouteData(targetUrl.toString())]).then(function (results) {
            console.log(JSON.stringify(results));

            var documentRouteData = results[0];
            var targetRouteData = results[1];

            // both current and target URLs are part of routing system
            if (documentRouteData && targetRouteData) {

                // they are from the same section - match on section template name
                if (targetRouteData.templatePath === documentRouteData.templatePath) {

                    console.log('uses same template - load just json');
                    GhostWorkerDOM.addJSON(targetUrl.toString(), 'route');
                    history.pushState({}, '', targetUrl.toString());
                } else {

                    // route is in system but uses a different route template
                    GhostWorkerDOM.hasTemplate(targetUrl.toString()).then(function (hasTemplate) {
                        if (hasTemplate === true) {
                            GhostWorkerDOM.addJSON(targetUrl.toString(), 'site');
                            history.pushState({}, '', targetUrl.toString());
                        } else {
                            console.log('let HTTP request pass through');
                            document.location.href = targetUrl.toString();
                        }
                    });
                }
            } else {
                document.location.href = targetUrl.toString();
            }
        }).catch(function (reason) {
            console.log(reason);
        });
    };

    return m;
}();


export default GhostWorkerDOM


