'use strict';

import Utils from '../utils.js';
import Messaging from './messaging.js';
import Head from './head.js';
import PatchDOM from 'morphdom';



// The module pattern
var GhostWorkerDOM = function () {

    var m = {};
    m.cacheName = 'ghostworker';
    m.contentEvent = new Event('GhostWorkerLoaded');
    m.contentDOMLoadedEvent = new Event('GhostWorkerDOMContentLoaded');

    m.create = function () {

        var self = this;
        var url = document.location.href;
        //this.createJSON(document, url);
        console.log('create template and json for: ' + url);

        Messaging.getRouteData(url).then(function (data) {

            if (data) {
                self.createJSON(document, url, data.version);
                // check for base template
                self.match(Utils.urlReplacePath(url, data.baseTemplate.templatePath), '-template').then(function (response) {
                    // create base template first
                    if (response.error) {
                        self.createTemplate(document, url, data.baseTemplate, data.version);
                    }
                    // then build route template
                    self.createTemplate(document, url, data.routeData.template, data.version);
                });
            } else {
                this.createTemplate(document, url, null, data.version);
            }
            // fire off as we have all the HTML loaded before we create templates
            document.dispatchEvent(self.contentDOMLoadedEvent);
        });
    };

    m.hasTemplate = function (url) {

        var self = this;

        return Messaging.getRouteData(url).then(function (data) {
            var request = self.newRequest(Utils.urlReplacePath(url, data.routeData.template.templatePath), {});
            return window.caches.match(request);
        }).then(function (response) {
            return response ? true : false;
        });
    };

    // creates JSON from full DOM
    m.createJSON = function (doc, url, version) {

        // create json object
        var self = this;
        var out = {};
        out.replacements = [];
        //var routeData = Messaging.getRouteData( url );

        return Messaging.getRouteData(url).then(function (data) {

            var template = data.routeData.template;
            template.elements.forEach(function (selector) {
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
            Object.assign(out, Head.remove(doc.querySelector('head')));

            var headers = new Headers();
            headers.append('X-Ghost-Worker-Cache-Date', new Date().toISOString());
            self.jsonRequest = self.newRequest(Utils.urlJoinPath(url, '-json'), { 'headers': headers });
            self.jsonResponse = self.newResponse(JSON.stringify(out), 'application/json');
            self.put(self.cacheName + '-' + template.slug + '-v' + version, self.jsonRequest, self.jsonResponse);

            return out;
        }).catch(function (reason) {
            console.log('createJSON failed: ' + reason);
        });

        //return out;
    };

    // creates template from full DOM
    m.createTemplate = function (doc, url, routeData, version) {

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
            Head.remove(newDoc.querySelector('head'));

            var headers = new Headers();
            headers.append('X-Ghost-Worker-Cache-Date', new Date().toISOString());
            self.templateRequest = self.newRequest(Utils.urlReplacePath(url, routeData.templatePath), { 'headers': headers });
            self.templateResponse = self.newResponse(newDoc.outerHTML, 'text/html');
            self.put(self.cacheName + '-template-v' + version, self.templateRequest, self.templateResponse);
            return newDoc.outerHTML;
        }).catch(function (reason) {
            console.log('createTemplate failed: ' + reason);
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
        console.log('load clientside template and json for: ' + url);

        // get route data
        Promise.all([
            Messaging.getSiteData(),
            Messaging.getRouteData(url)
        ]).then(function (results) {
            var siteData = results[0];
            var data = results[1];
            var template = data.routeData.template

            // add header so the template logic is not fired in service worker
            var headers = new Headers();
            headers.append('X-GhostWorker-Content', 'raw');
            headers.append('X-GhostWorker-RouteData', JSON.stringify(template));

            var request = new Request(url, { headers: headers });

            // find JSON in cache
            // *********************************************************************************************************** //
            self.match(new Request(Utils.urlJoinPath(url, '-json')), '-json').then(function (json) {

                // has a site template info

                // does current template match new template
                if (redrawLevel === 'site') {
                    // default to base template
                    self.clearElements(document, data.baseTemplate.elements);
                    Head.remove(document.querySelector('head'));

                    // load section template from cache
                    var templateRequest = self.newRequest(Utils.urlReplacePath(url, template.templatePath), {});
                    // *********************************************************************************************************** //
                    self.match(templateRequest, '-template').then(function (templateJSON) {
                        if (!templateJSON || templateJSON.error) {
                            console.log('addJSON no template found');
                        } else {
                            console.log('using a section template')
                            self.injectTemplateJSON(templateJSON, data.baseTemplate).then(function (done) {
                                if (!json.error) {
                                    self.injectJSON(json, true);
                                }
                            });
                        }
                    });
                } else {
                    if (!json.error) {
                        console.log('using a section template')
                        self.injectJSON(json, true);
                    }
                }

                // get it from network inject either to add or update content
                // *********************************************************************************************************** //
                self.createJSONFromNetwork(request, data.version).then(function (json) {
                    self.injectJSON(json, false);
                }).catch(function (reason) {
                    if(reason === 'fetch error'){
                        if(!json){
                             // fetch error and no catch version
                            document.location.href = '\offline'
                        }
                        // fetch error but we have a cahed version
                    }else{
                        if(Utils.endsWith(reason, '404')){
                            // 404 error
                            document.location.href = '\notfound'
                        }
                    }
                    // otherwise to not update or reload
                });


            });
        }).catch(function (reason) {
            console.log(reason);
        });
    };

    // get JSON form network - downloads HTML and creates JSON structure
    m.createJSONFromNetwork = function (request, version) {

        var self = this;
        return fetch(request).then(function (response) {

            if (request.method === 'GET' && response.status > 199 && response.status < 400) {
                return response.text().then(function (body) {
                    var parser = new DOMParser();
                    return parser.parseFromString(body, "text/html");
                }).then(function (doc) {
                    return self.createJSON(doc, request.url, version);
                });
            } else {
                return Promise.reject('response error' + response.status);
            }
        }).catch(function (reason) {
            console.log('createJSONFromNetwork', reason);
            return Promise.reject('fetch error');
            //document.location.href = '\offline'
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

    m.injectTemplateJSON = function (json, baseTemplate) {

        var parser = new DOMParser();
        var doc = parser.parseFromString(json.template, "text/html");

        baseTemplate.elements.forEach(function (selector) {
            var destination = document.querySelector(selector);
            var source = doc.querySelector(selector);
            if(destination && source){
                destination.parentNode.replaceChild(source, destination);
            }else{
                console.log('issue injecting section template into base template')
            }
        });
        return Promise.resolve();

        // copy elements between documents to recreate a route template


        /*
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
        */
    };

    m.injectJSON = function (json, firstDraw) {
        var self = this;

        // elements
        json.replacements.forEach(function (replacement, idx) {
            var nodeList = document.querySelectorAll(replacement.selector);
            if (nodeList) {
                for (var i = 0; i < nodeList.length; ++i) {
                    if (replacement.content[i]) {

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

        var patchInstructions = {
            link: json.link,
            meta: json.meta
        };
        Head.patch(document.querySelector('head'), patchInstructions);
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
        console.log('captured link fired');

        var documentUrl = new URL(document.location.href);
        var targetUrl = new URL(e.currentTarget.href);

        e.preventDefault();

        Promise.all([Messaging.getRouteData(documentUrl.toString()), Messaging.getRouteData(targetUrl.toString())]).then(function (results) {
            //console.log(JSON.stringify(results));

            var documentData = results[0];
            var targetData = results[1];

            // both current and target URLs are part of routing system
            if (documentData && targetData) {

                // they are from the same section - match on section template name
                if (documentData.routeData.template.templatePath === targetData.routeData.template.templatePath) {

                    console.log('uses same base template - load just json');
                    GhostWorkerDOM.addJSON(targetUrl.toString(), 'route');
                    history.pushState({}, '', targetUrl.toString());
                } else {

                    // route is in system but uses a different base template
                    GhostWorkerDOM.hasTemplate(targetUrl.toString()).then(function (hasTemplate) {
                        if (hasTemplate && documentData.baseTemplate.name === targetData.baseTemplate.name) {
                            // same base template just update base template elements
                            GhostWorkerDOM.addJSON(targetUrl.toString(), 'site');
                            history.pushState({}, '', targetUrl.toString());
                        } else {
                            // full page reload allowing whole dom to redraw and new context for js
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


