(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.GhostWorkerDOM = factory());
}(this, (function () { 'use strict';

function interopDefault(ex) {
	return ex && typeof ex === 'object' && 'default' in ex ? ex['default'] : ex;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var utils = createCommonjsModule(function (module) {
    'use strict';

    function removeLastBackslash(path) {
        return endsWith(path, '/') ? path.slice(0, -1) : path;
    }

    function urlJoinPath(url, path) {
        url = new URL(url);
        url.pathname = url.pathname + path;
        return url.toString();
    }

    function urlReplacePath(url, path) {
        url = new URL(url);
        url.pathname = path;
        return url.toString();
    }

    function urlRemoveBackslash(url) {
        url = new URL(url);
        if (endsWith(url.pathname, '/')) {
            url.pathname = url.pathname.slice(0, -1);
        }
        return url.toString();
    }

    function endsWith(str, match, position) {
        if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > str.length) {
            position = str.length;
        }
        position -= match.length;
        var lastIndex = str.lastIndexOf(match, position);
        return lastIndex !== -1 && lastIndex === position;
    }

    function clone(obj) {
        // very simple clone, be careful
        return JSON.parse(JSON.stringify(obj));
    }

    // handles fetch errs
    function handleErrors(response) {
        if (!response.ok) {
            throw Error(response.statusText);
        }
        return response;
    }

    module.exports = {
        removeLastBackslash: removeLastBackslash,
        urlJoinPath: urlJoinPath,
        urlReplacePath: urlReplacePath,
        urlRemoveBackslash: urlRemoveBackslash,
        endsWith: endsWith,
        clone: clone,
        handleErrors: handleErrors
    };
});

var Utils = interopDefault(utils);

var messaging = createCommonjsModule(function (module) {
    'use strict';

    function getDataFromSW(requestOptions) {
        // This wraps the message posting/response in a promise, which will resolve if the response doesn't
        // contain an error, and reject with the error if it does. If you'd prefer, it's possible to call
        // controller.postMessage() and set up the onmessage handler independently of a promise, but this is
        // a convenient wrapper.
        return new Promise(function (resolve, reject) {
            var messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = function (event) {
                if (event.data.error) {
                    reject(event.data.error);
                } else {
                    resolve(event.data);
                }
            };

            // This sends the message data as well as transferring messageChannel.port2 to the service worker.
            // The service worker can then use the transferred port to reply via postMessage(), which
            // will in turn trigger the onmessage handler on messageChannel.port1.
            // See https://html.spec.whatwg.org/multipage/workers.html#dom-worker-postmessage
            navigator.serviceWorker.controller.postMessage(requestOptions, [messageChannel.port2]);
        });
    }

    function getRouteData(url) {

        return getDataFromSW({ 'command': 'getRouteData', 'url': url }).then(function (response) {
            return response.result;
        }).catch(function (reason) {
            console.log(reason);
        });
    }

    function getSiteData() {

        return getDataFromSW({ 'command': 'getSiteData' }).then(function (response) {
            return response.result;
        }).catch(function (reason) {
            console.log(reason);
        });
    }

    module.exports = {
        getRouteData: getRouteData,
        getSiteData: getSiteData
    };
});

var Messaging = interopDefault(messaging);

var index = createCommonjsModule(function (module) {
'use strict';
// Create a range object for efficently rendering strings to elements.
var range;

var doc = typeof document !== 'undefined' && document;

var testEl = doc ?
    doc.body || doc.createElement('div') :
    {};

var NS_XHTML = 'http://www.w3.org/1999/xhtml';

var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

// Fixes <https://github.com/patrick-steele-idem/morphdom/issues/32>
// (IE7+ support) <=IE7 does not support el.hasAttribute(name)
var hasAttributeNS;

if (testEl.hasAttributeNS) {
    hasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttributeNS(namespaceURI, name);
    };
} else if (testEl.hasAttribute) {
    hasAttributeNS = function(el, namespaceURI, name) {
        return el.hasAttribute(name);
    };
} else {
    hasAttributeNS = function(el, namespaceURI, name) {
        return !!el.getAttributeNode(name);
    };
}

function toElement(str) {
    if (!range && doc.createRange) {
        range = doc.createRange();
        range.selectNode(doc.body);
    }

    var fragment;
    if (range && range.createContextualFragment) {
        fragment = range.createContextualFragment(str);
    } else {
        fragment = doc.createElement('body');
        fragment.innerHTML = str;
    }
    return fragment.childNodes[0];
}

function syncBooleanAttrProp(fromEl, toEl, name) {
    if (fromEl[name] !== toEl[name]) {
        fromEl[name] = toEl[name];
        if (fromEl[name]) {
            fromEl.setAttribute(name, '');
        } else {
            fromEl.removeAttribute(name, '');
        }
    }
}

var specialElHandlers = {
    /**
     * Needed for IE. Apparently IE doesn't think that "selected" is an
     * attribute when reading over the attributes using selectEl.attributes
     */
    OPTION: function(fromEl, toEl) {
        syncBooleanAttrProp(fromEl, toEl, 'selected');
    },
    /**
     * The "value" attribute is special for the <input> element since it sets
     * the initial value. Changing the "value" attribute without changing the
     * "value" property will have no effect since it is only used to the set the
     * initial value.  Similar for the "checked" attribute, and "disabled".
     */
    INPUT: function(fromEl, toEl) {
        syncBooleanAttrProp(fromEl, toEl, 'checked');
        syncBooleanAttrProp(fromEl, toEl, 'disabled');

        if (fromEl.value !== toEl.value) {
            fromEl.value = toEl.value;
        }

        if (!hasAttributeNS(toEl, null, 'value')) {
            fromEl.removeAttribute('value');
        }
    },

    TEXTAREA: function(fromEl, toEl) {
        var newValue = toEl.value;
        if (fromEl.value !== newValue) {
            fromEl.value = newValue;
        }

        if (fromEl.firstChild) {
            fromEl.firstChild.nodeValue = newValue;
        }
    }
};

function noop() {}

/**
 * Returns true if two node's names are the same.
 *
 * NOTE: We don't bother checking `namespaceURI` because you will never find two HTML elements with the same
 *       nodeName and different namespace URIs.
 *
 * @param {Element} a
 * @param {Element} b The target element
 * @return {boolean}
 */
function compareNodeNames(fromEl, toEl) {
    var fromNodeName = fromEl.nodeName;
    var toNodeName = toEl.nodeName;

    if (fromNodeName === toNodeName) {
        return true;
    }

    if (toEl.actualize &&
        fromNodeName.charCodeAt(0) < 91 && /* from tag name is upper case */
        toNodeName.charCodeAt(0) > 90 /* target tag name is lower case */) {
        // If the target element is a virtual DOM node then we may need to normalize the tag name
        // before comparing. Normal HTML elements that are in the "http://www.w3.org/1999/xhtml"
        // are converted to upper case
        return fromNodeName === toNodeName.toUpperCase();
    } else {
        return false;
    }
}

/**
 * Create an element, optionally with a known namespace URI.
 *
 * @param {string} name the element name, e.g. 'div' or 'svg'
 * @param {string} [namespaceURI] the element's namespace URI, i.e. the value of
 * its `xmlns` attribute or its inferred namespace.
 *
 * @return {Element}
 */
function createElementNS(name, namespaceURI) {
    return !namespaceURI || namespaceURI === NS_XHTML ?
        doc.createElement(name) :
        doc.createElementNS(namespaceURI, name);
}

/**
 * Loop over all of the attributes on the target node and make sure the original
 * DOM node has the same attributes. If an attribute found on the original node
 * is not on the new node then remove it from the original node.
 *
 * @param  {Element} fromNode
 * @param  {Element} toNode
 */
function morphAttrs(fromNode, toNode) {
    var attrs = toNode.attributes;
    var i;
    var attr;
    var attrName;
    var attrNamespaceURI;
    var attrValue;
    var fromValue;

    if (toNode.assignAttributes) {
        toNode.assignAttributes(fromNode);
    } else {
        for (i = attrs.length - 1; i >= 0; --i) {
            attr = attrs[i];
            attrName = attr.name;
            attrNamespaceURI = attr.namespaceURI;
            attrValue = attr.value;

            if (attrNamespaceURI) {
                attrName = attr.localName || attrName;
                fromValue = fromNode.getAttributeNS(attrNamespaceURI, attrName);

                if (fromValue !== attrValue) {
                    fromNode.setAttributeNS(attrNamespaceURI, attrName, attrValue);
                }
            } else {
                fromValue = fromNode.getAttribute(attrName);

                if (fromValue !== attrValue) {
                    fromNode.setAttribute(attrName, attrValue);
                }
            }
        }
    }

    // Remove any extra attributes found on the original DOM element that
    // weren't found on the target element.
    attrs = fromNode.attributes;

    for (i = attrs.length - 1; i >= 0; --i) {
        attr = attrs[i];
        if (attr.specified !== false) {
            attrName = attr.name;
            attrNamespaceURI = attr.namespaceURI;

            if (attrNamespaceURI) {
                attrName = attr.localName || attrName;

                if (!hasAttributeNS(toNode, attrNamespaceURI, attrName)) {
                    fromNode.removeAttributeNS(attrNamespaceURI, attrName);
                }
            } else {
                if (!hasAttributeNS(toNode, null, attrName)) {
                    fromNode.removeAttribute(attrName);
                }
            }
        }
    }
}

/**
 * Copies the children of one DOM element to another DOM element
 */
function moveChildren(fromEl, toEl) {
    var curChild = fromEl.firstChild;
    while (curChild) {
        var nextChild = curChild.nextSibling;
        toEl.appendChild(curChild);
        curChild = nextChild;
    }
    return toEl;
}

function defaultGetNodeKey(node) {
    return node.id;
}

function morphdom(fromNode, toNode, options) {
    if (!options) {
        options = {};
    }

    if (typeof toNode === 'string') {
        if (fromNode.nodeName === '#document' || fromNode.nodeName === 'HTML') {
            var toNodeHtml = toNode;
            toNode = doc.createElement('html');
            toNode.innerHTML = toNodeHtml;
        } else {
            toNode = toElement(toNode);
        }
    }

    var getNodeKey = options.getNodeKey || defaultGetNodeKey;
    var onBeforeNodeAdded = options.onBeforeNodeAdded || noop;
    var onNodeAdded = options.onNodeAdded || noop;
    var onBeforeElUpdated = options.onBeforeElUpdated || noop;
    var onElUpdated = options.onElUpdated || noop;
    var onBeforeNodeDiscarded = options.onBeforeNodeDiscarded || noop;
    var onNodeDiscarded = options.onNodeDiscarded || noop;
    var onBeforeElChildrenUpdated = options.onBeforeElChildrenUpdated || noop;
    var childrenOnly = options.childrenOnly === true;

    // This object is used as a lookup to quickly find all keyed elements in the original DOM tree.
    var fromNodesLookup = {};
    var keyedRemovalList;

    function addKeyedRemoval(key) {
        if (keyedRemovalList) {
            keyedRemovalList.push(key);
        } else {
            keyedRemovalList = [key];
        }
    }

    function walkDiscardedChildNodes(node, skipKeyedNodes) {
        if (node.nodeType === ELEMENT_NODE) {
            var curChild = node.firstChild;
            while (curChild) {

                var key = undefined;

                if (skipKeyedNodes && (key = getNodeKey(curChild))) {
                    // If we are skipping keyed nodes then we add the key
                    // to a list so that it can be handled at the very end.
                    addKeyedRemoval(key);
                } else {
                    // Only report the node as discarded if it is not keyed. We do this because
                    // at the end we loop through all keyed elements that were unmatched
                    // and then discard them in one final pass.
                    onNodeDiscarded(curChild);
                    if (curChild.firstChild) {
                        walkDiscardedChildNodes(curChild, skipKeyedNodes);
                    }
                }

                curChild = curChild.nextSibling;
            }
        }
    }

    /**
     * Removes a DOM node out of the original DOM
     *
     * @param  {Node} node The node to remove
     * @param  {Node} parentNode The nodes parent
     * @param  {Boolean} skipKeyedNodes If true then elements with keys will be skipped and not discarded.
     * @return {undefined}
     */
    function removeNode(node, parentNode, skipKeyedNodes) {
        if (onBeforeNodeDiscarded(node) === false) {
            return;
        }

        if (parentNode) {
            parentNode.removeChild(node);
        }

        onNodeDiscarded(node);
        walkDiscardedChildNodes(node, skipKeyedNodes);
    }

    // // TreeWalker implementation is no faster, but keeping this around in case this changes in the future
    // function indexTree(root) {
    //     var treeWalker = document.createTreeWalker(
    //         root,
    //         NodeFilter.SHOW_ELEMENT);
    //
    //     var el;
    //     while((el = treeWalker.nextNode())) {
    //         var key = getNodeKey(el);
    //         if (key) {
    //             fromNodesLookup[key] = el;
    //         }
    //     }
    // }

    // // NodeIterator implementation is no faster, but keeping this around in case this changes in the future
    //
    // function indexTree(node) {
    //     var nodeIterator = document.createNodeIterator(node, NodeFilter.SHOW_ELEMENT);
    //     var el;
    //     while((el = nodeIterator.nextNode())) {
    //         var key = getNodeKey(el);
    //         if (key) {
    //             fromNodesLookup[key] = el;
    //         }
    //     }
    // }

    function indexTree(node) {
        if (node.nodeType === ELEMENT_NODE) {
            var curChild = node.firstChild;
            while (curChild) {
                var key = getNodeKey(curChild);
                if (key) {
                    fromNodesLookup[key] = curChild;
                }

                // Walk recursively
                indexTree(curChild);

                curChild = curChild.nextSibling;
            }
        }
    }

    indexTree(fromNode);

    function handleNodeAdded(el) {
        onNodeAdded(el);

        var curChild = el.firstChild;
        while (curChild) {
            var nextSibling = curChild.nextSibling;

            var key = getNodeKey(curChild);
            if (key) {
                var unmatchedFromEl = fromNodesLookup[key];
                if (unmatchedFromEl && compareNodeNames(curChild, unmatchedFromEl)) {
                    curChild.parentNode.replaceChild(unmatchedFromEl, curChild);
                    morphEl(unmatchedFromEl, curChild);
                }
            }

            handleNodeAdded(curChild);
            curChild = nextSibling;
        }
    }

    function morphEl(fromEl, toEl, childrenOnly) {
        var toElKey = getNodeKey(toEl);
        var curFromNodeKey;

        if (toElKey) {
            // If an element with an ID is being morphed then it is will be in the final
            // DOM so clear it out of the saved elements collection
            delete fromNodesLookup[toElKey];
        }

        if (toNode.isSameNode && toNode.isSameNode(fromNode)) {
            return;
        }

        if (!childrenOnly) {
            if (onBeforeElUpdated(fromEl, toEl) === false) {
                return;
            }

            morphAttrs(fromEl, toEl);
            onElUpdated(fromEl);

            if (onBeforeElChildrenUpdated(fromEl, toEl) === false) {
                return;
            }
        }

        if (fromEl.nodeName !== 'TEXTAREA') {
            var curToNodeChild = toEl.firstChild;
            var curFromNodeChild = fromEl.firstChild;
            var curToNodeKey;

            var fromNextSibling;
            var toNextSibling;
            var matchingFromEl;

            outer: while (curToNodeChild) {
                toNextSibling = curToNodeChild.nextSibling;
                curToNodeKey = getNodeKey(curToNodeChild);

                while (curFromNodeChild) {
                    fromNextSibling = curFromNodeChild.nextSibling;

                    if (curToNodeChild.isSameNode && curToNodeChild.isSameNode(curFromNodeChild)) {
                        curToNodeChild = toNextSibling;
                        curFromNodeChild = fromNextSibling;
                        continue outer;
                    }

                    curFromNodeKey = getNodeKey(curFromNodeChild);

                    var curFromNodeType = curFromNodeChild.nodeType;

                    var isCompatible = undefined;

                    if (curFromNodeType === curToNodeChild.nodeType) {
                        if (curFromNodeType === ELEMENT_NODE) {
                            // Both nodes being compared are Element nodes

                            if (curToNodeKey) {
                                // The target node has a key so we want to match it up with the correct element
                                // in the original DOM tree
                                if (curToNodeKey !== curFromNodeKey) {
                                    // The current element in the original DOM tree does not have a matching key so
                                    // let's check our lookup to see if there is a matching element in the original
                                    // DOM tree
                                    if ((matchingFromEl = fromNodesLookup[curToNodeKey])) {
                                        if (curFromNodeChild.nextSibling === matchingFromEl) {
                                            // Special case for single element removals. To avoid removing the original
                                            // DOM node out of the tree (since that can break CSS transitions, etc.),
                                            // we will instead discard the current node and wait until the next
                                            // iteration to properly match up the keyed target element with its matching
                                            // element in the original tree
                                            isCompatible = false;
                                        } else {
                                            // We found a matching keyed element somewhere in the original DOM tree.
                                            // Let's moving the original DOM node into the current position and morph
                                            // it.

                                            // NOTE: We use insertBefore instead of replaceChild because we want to go through
                                            // the `removeNode()` function for the node that is being discarded so that
                                            // all lifecycle hooks are correctly invoked
                                            fromEl.insertBefore(matchingFromEl, curFromNodeChild);

                                            if (curFromNodeKey) {
                                                // Since the node is keyed it might be matched up later so we defer
                                                // the actual removal to later
                                                addKeyedRemoval(curFromNodeKey);
                                            } else {
                                                // NOTE: we skip nested keyed nodes from being removed since there is
                                                //       still a chance they will be matched up later
                                                removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);

                                            }
                                            fromNextSibling = curFromNodeChild.nextSibling;
                                            curFromNodeChild = matchingFromEl;
                                        }
                                    } else {
                                        // The nodes are not compatible since the "to" node has a key and there
                                        // is no matching keyed node in the source tree
                                        isCompatible = false;
                                    }
                                }
                            } else if (curFromNodeKey) {
                                // The original has a key
                                isCompatible = false;
                            }

                            isCompatible = isCompatible !== false && compareNodeNames(curFromNodeChild, curToNodeChild);
                            if (isCompatible) {
                                // We found compatible DOM elements so transform
                                // the current "from" node to match the current
                                // target DOM node.
                                morphEl(curFromNodeChild, curToNodeChild);
                            }

                        } else if (curFromNodeType === TEXT_NODE || curFromNodeType == COMMENT_NODE) {
                            // Both nodes being compared are Text or Comment nodes
                            isCompatible = true;
                            // Simply update nodeValue on the original node to
                            // change the text value
                            curFromNodeChild.nodeValue = curToNodeChild.nodeValue;
                        }
                    }

                    if (isCompatible) {
                        // Advance both the "to" child and the "from" child since we found a match
                        curToNodeChild = toNextSibling;
                        curFromNodeChild = fromNextSibling;
                        continue outer;
                    }

                    // No compatible match so remove the old node from the DOM and continue trying to find a
                    // match in the original DOM. However, we only do this if the from node is not keyed
                    // since it is possible that a keyed node might match up with a node somewhere else in the
                    // target tree and we don't want to discard it just yet since it still might find a
                    // home in the final DOM tree. After everything is done we will remove any keyed nodes
                    // that didn't find a home
                    if (curFromNodeKey) {
                        // Since the node is keyed it might be matched up later so we defer
                        // the actual removal to later
                        addKeyedRemoval(curFromNodeKey);
                    } else {
                        // NOTE: we skip nested keyed nodes from being removed since there is
                        //       still a chance they will be matched up later
                        removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                    }

                    curFromNodeChild = fromNextSibling;
                }

                // If we got this far then we did not find a candidate match for
                // our "to node" and we exhausted all of the children "from"
                // nodes. Therefore, we will just append the current "to" node
                // to the end
                if (curToNodeKey && (matchingFromEl = fromNodesLookup[curToNodeKey]) && compareNodeNames(matchingFromEl, curToNodeChild)) {
                    fromEl.appendChild(matchingFromEl);
                    morphEl(matchingFromEl, curToNodeChild);
                } else {
                    var onBeforeNodeAddedResult = onBeforeNodeAdded(curToNodeChild);
                    if (onBeforeNodeAddedResult !== false) {
                        if (onBeforeNodeAddedResult) {
                            curToNodeChild = onBeforeNodeAddedResult;
                        }

                        if (curToNodeChild.actualize) {
                            curToNodeChild = curToNodeChild.actualize(fromEl.ownerDocument || doc);
                        }
                        fromEl.appendChild(curToNodeChild);
                        handleNodeAdded(curToNodeChild);
                    }
                }

                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
            }

            // We have processed all of the "to nodes". If curFromNodeChild is
            // non-null then we still have some from nodes left over that need
            // to be removed
            while (curFromNodeChild) {
                fromNextSibling = curFromNodeChild.nextSibling;
                if ((curFromNodeKey = getNodeKey(curFromNodeChild))) {
                    // Since the node is keyed it might be matched up later so we defer
                    // the actual removal to later
                    addKeyedRemoval(curFromNodeKey);
                } else {
                    // NOTE: we skip nested keyed nodes from being removed since there is
                    //       still a chance they will be matched up later
                    removeNode(curFromNodeChild, fromEl, true /* skip keyed nodes */);
                }
                curFromNodeChild = fromNextSibling;
            }
        }

        var specialElHandler = specialElHandlers[fromEl.nodeName];
        if (specialElHandler) {
            specialElHandler(fromEl, toEl);
        }
    } // END: morphEl(...)

    var morphedNode = fromNode;
    var morphedNodeType = morphedNode.nodeType;
    var toNodeType = toNode.nodeType;

    if (!childrenOnly) {
        // Handle the case where we are given two DOM nodes that are not
        // compatible (e.g. <div> --> <span> or <div> --> TEXT)
        if (morphedNodeType === ELEMENT_NODE) {
            if (toNodeType === ELEMENT_NODE) {
                if (!compareNodeNames(fromNode, toNode)) {
                    onNodeDiscarded(fromNode);
                    morphedNode = moveChildren(fromNode, createElementNS(toNode.nodeName, toNode.namespaceURI));
                }
            } else {
                // Going from an element node to a text node
                morphedNode = toNode;
            }
        } else if (morphedNodeType === TEXT_NODE || morphedNodeType === COMMENT_NODE) { // Text or comment node
            if (toNodeType === morphedNodeType) {
                morphedNode.nodeValue = toNode.nodeValue;
                return morphedNode;
            } else {
                // Text node to something else
                morphedNode = toNode;
            }
        }
    }

    if (morphedNode === toNode) {
        // The "to node" was not compatible with the "from node" so we had to
        // toss out the "from node" and use the "to node"
        onNodeDiscarded(fromNode);
    } else {
        morphEl(morphedNode, toNode, childrenOnly);

        // We now need to loop over any keyed nodes that might need to be
        // removed. We only do the removal if we know that the keyed node
        // never found a match. When a keyed node is matched up we remove
        // it out of fromNodesLookup and we use fromNodesLookup to determine
        // if a keyed node has been matched up or not
        if (keyedRemovalList) {
            for (var i=0, len=keyedRemovalList.length; i<len; i++) {
                var elToRemove = fromNodesLookup[keyedRemovalList[i]];
                if (elToRemove) {
                    removeNode(elToRemove, elToRemove.parentNode, false);
                }
            }
        }
    }

    if (!childrenOnly && morphedNode !== fromNode && fromNode.parentNode) {
        if (morphedNode.actualize) {
            morphedNode = morphedNode.actualize(fromNode.ownerDocument || doc);
        }
        // If we had to swap out the from node with a new node because the old
        // node was not compatible with the target node then we need to
        // replace the old DOM node in the original DOM tree. This is only
        // possible if the original DOM node was part of a DOM tree which
        // we know is the case if it has a parent node.
        fromNode.parentNode.replaceChild(morphedNode, fromNode);
    }

    return morphedNode;
}

module.exports = morphdom;
});

var PatchDOM = interopDefault(index);

// The module pattern
var GhostWorkerDOM = function () {

    var m = {};
    m.version = 0.1;
    m.cacheName = 'ghostworker';
    m.contentEvent = new Event('GhostWorkerLoaded');
    m.contentDOMLoadedEvent = new Event('GhostWorkerDOMContentLoaded');

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
            self.put(self.cacheName + '-content-v' + self.version, self.jsonRequest, self.jsonResponse);

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
            self.put(self.cacheName + '-template-v' + self.version, self.templateRequest, self.templateResponse);
            return newDoc.outerHTML;
        }).catch(function (reason) {
            console.log('createTemplate' + reason);
        });

        /*
        routeData = routeData || Messaging.getRouteData( url );
        var newDoc = document.documentElement.cloneNode(true);
        this.removeGhostworkerScript(newDoc);
        this.clearElements(newDoc, routeData.elements);
        // remove meta and link values from page that need updating with data
        this.loopMetaTags(siteData, routeData, newDoc, true);
        this.loopLinkTags(siteData, routeData, newDoc, true);
         var headers = new Headers();
        headers.append('X-Ghost-Worker-Cache-Date',  new Date().toISOString());
        this.templateRequest = this.newRequest( Utils.urlReplacePath(url, routeData.templatePath), {'headers': headers});
        this.templateResponse = this.newResponse(newDoc.outerHTML, 'text/html');
        this.put( this.cacheName + '-template-v' + this.version, this.templateRequest, this.templateResponse );
        return newDoc.outerHTML;
        */
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

        /*
        url = url || document.location.href;
        suffix = suffix || - '-json';
        var request;
        if(suffix === '-json'){
            request = this.newRequest(Utils.urlJoinPath(url, suffix), {});
        }else{
            request = this.newRequest(Utils.urlReplacePath(url, suffix), {});
        }
        */

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

return GhostWorkerDOM;

})));
//# sourceMappingURL=ghostworker-dom.js.map
