(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {}

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

  if (typeof Object.assign != 'function') {
    (function () {
      Object.assign = function (target) {
        'use strict';
        // We must check against these specific cases.

        if (target === undefined || target === null) {
          throw new TypeError('Cannot convert undefined or null to object');
        }

        var output = Object(target);
        for (var index = 1; index < arguments.length; index++) {
          var source = arguments[index];
          if (source !== undefined && source !== null) {
            for (var nextKey in source) {
              if (source.hasOwnProperty(nextKey)) {
                output[nextKey] = source[nextKey];
              }
            }
          }
        }
        return output;
      };
    })();
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

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();

var router = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
        (typeof exports === 'undefined' ? 'undefined' : _typeof(exports)) === 'object' && typeof module !== 'undefined' ? module.exports = factory() : typeof define === 'function' && define.amd ? define(factory) : global.HAPIRouter = factory();
    })(commonjsGlobal, function () {
        'use strict';

        function interopDefault(ex) {
            return ex && (typeof ex === 'undefined' ? 'undefined' : _typeof(ex)) === 'object' && 'default' in ex ? ex['default'] : ex;
        }

        function createCommonjsModule(fn, module) {
            return module = { exports: {} }, fn(module, module.exports), module.exports;
        }

        var hoek = createCommonjsModule(function (module) {
            'use strict';
            // basic replacement for HAPI.js Hoek module


            module.exports = {

                applyToDefaults: function applyToDefaults(obj, src) {
                    for (var key in src) {
                        if (src.hasOwnProperty(key)) obj[key] = src[key];
                    }
                    return obj;
                },

                escapeRegex: function escapeRegex(string) {

                    // Escape ^$.*+-?=!:|\/()[]{},
                    return string.replace(/[\^\$\.\*\+\-\?\=\!\:\|\\\/\(\)\[\]\{\}\,]/g, '\\$&');
                },

                assert: function assert(condition, message) {
                    if (!condition) {
                        throw new Error(message);
                    }
                }
            };
        });

        var hoek$1 = interopDefault(hoek);
        var applyToDefaults = hoek.applyToDefaults;
        var escapeRegex = hoek.escapeRegex;
        var assert = hoek.assert;

        var require$$0 = Object.freeze({
            default: hoek$1,
            applyToDefaults: applyToDefaults,
            escapeRegex: escapeRegex,
            assert: assert
        });

        var boom = createCommonjsModule(function (module) {
            'use strict';
            // basic replacement for HAPI.js Boom module


            module.exports = {

                notFound: function notFound() {

                    return null;
                },

                badRequest: function badRequest() {

                    return null;
                }
            };
        });

        var boom$1 = interopDefault(boom);
        var notFound = boom.notFound;
        var badRequest = boom.badRequest;

        var require$$2 = Object.freeze({
            default: boom$1,
            notFound: notFound,
            badRequest: badRequest
        });

        var regex = createCommonjsModule(function (module, exports) {
            'use strict';

            // Load modules


            // Declare internals

            var internals = {};

            exports.generate = function () {

                /*
                    /path/{param}/path/{param?}
                    /path/{param*2}/path
                    /path/{param*2}
                    /path/x{param}x
                    /{param*}
                */

                var empty = '(?:^\\/$)';

                var legalChars = '[\\w\\!\\$&\'\\(\\)\\*\\+\\,;\\=\\:@\\-\\.~]';
                var encoded = '%[A-F0-9]{2}';

                var literalChar = '(?:' + legalChars + '|' + encoded + ')';
                var literal = literalChar + '+';
                var literalOptional = literalChar + '*';

                var midParam = '(?:\\{\\w+(?:\\*[1-9]\\d*)?\\})'; // {p}, {p*2}
                var endParam = '(?:\\/(?:\\{\\w+(?:(?:\\*(?:[1-9]\\d*)?)|(?:\\?))?\\})?)?'; // {p}, {p*2}, {p*}, {p?}

                var partialParam = '(?:\\{\\w+\\??\\})'; // {p}, {p?}
                var mixedParam = '(?:(?:' + literal + partialParam + ')+' + literalOptional + ')|(?:' + partialParam + '(?:' + literal + partialParam + ')+' + literalOptional + ')|(?:' + partialParam + literal + ')';

                var segmentContent = '(?:' + literal + '|' + midParam + '|' + mixedParam + ')';
                var segment = '\\/' + segmentContent;
                var segments = '(?:' + segment + ')*';

                var path = '(?:^' + segments + endParam + '$)';

                //                1:literal               2:name   3:*  4:count  5:?
                var parseParam = '(' + literal + ')|(?:\\{(\\w+)(?:(\\*)(\\d+)?)?(\\?)?\\})';

                var expressions = {
                    parseParam: new RegExp(parseParam, 'g'),
                    validatePath: new RegExp(empty + '|' + path),
                    validatePathEncoded: /%(?:2[146-9A-E]|3[\dABD]|4[\dA-F]|5[\dAF]|6[1-9A-F]|7[\dAE])/g
                };

                return expressions;
            };
        });

        var regex$1 = interopDefault(regex);
        var generate = regex.generate;

        var require$$1 = Object.freeze({
            default: regex$1,
            generate: generate
        });

        var segment = createCommonjsModule(function (module, exports) {
            'use strict';

            // Load modules

            var Hoek = interopDefault(require$$0);

            // Declare internals

            var internals = {};

            exports = module.exports = internals.Segment = function () {

                this._edge = null; // { segment, record }
                this._fulls = null; // { path: { segment, record }
                this._literals = null; // { literal: { segment, <node> } }
                this._param = null; // <node>
                this._mixed = null; // [{ segment, <node> }]
                this._wildcard = null; // { segment, record }
            };

            internals.Segment.prototype.add = function (segments, record) {

                /*
                    { literal: 'x' }        -> x
                    { empty: false }        -> {p}
                    { wildcard: true }      -> {p*}
                    { mixed: /regex/ }      -> a{p}b
                */

                var current = segments[0];
                var remaining = segments.slice(1);
                var isEdge = !remaining.length;

                var literals = [];
                var isLiteral = true;
                for (var i = 0; i < segments.length && isLiteral; ++i) {
                    isLiteral = segments[i].literal !== undefined;
                    literals.push(segments[i].literal);
                }

                if (isLiteral) {
                    this._fulls = this._fulls || {};
                    var literal = '/' + literals.join('/');
                    if (!record.settings.isCaseSensitive) {
                        literal = literal.toLowerCase();
                    }

                    Hoek.assert(!this._fulls[literal], 'New route', record.path, 'conflicts with existing', this._fulls[literal] && this._fulls[literal].record.path);
                    this._fulls[literal] = { segment: current, record: record };
                } else if (current.literal !== undefined) {
                    // Can be empty string

                    // Literal

                    this._literals = this._literals || {};
                    var currentLiteral = record.settings.isCaseSensitive ? current.literal : current.literal.toLowerCase();
                    this._literals[currentLiteral] = this._literals[currentLiteral] || new internals.Segment();
                    this._literals[currentLiteral].add(remaining, record);
                } else if (current.wildcard) {

                    // Wildcard

                    Hoek.assert(!this._wildcard, 'New route', record.path, 'conflicts with existing', this._wildcard && this._wildcard.record.path);
                    Hoek.assert(!this._param || !this._param._wildcard, 'New route', record.path, 'conflicts with existing', this._param && this._param._wildcard && this._param._wildcard.record.path);
                    this._wildcard = { segment: current, record: record };
                } else if (current.mixed) {

                    // Mixed

                    this._mixed = this._mixed || [];

                    var mixed = this._mixedLookup(current);
                    if (!mixed) {
                        mixed = { segment: current, node: new internals.Segment() };
                        this._mixed.push(mixed);
                        this._mixed.sort(internals.mixed);
                    }

                    if (isEdge) {
                        Hoek.assert(!mixed.node._edge, 'New route', record.path, 'conflicts with existing', mixed.node._edge && mixed.node._edge.record.path);
                        mixed.node._edge = { segment: current, record: record };
                    } else {
                        mixed.node.add(remaining, record);
                    }
                } else {

                    // Parameter

                    this._param = this._param || new internals.Segment();

                    if (isEdge) {
                        Hoek.assert(!this._param._edge, 'New route', record.path, 'conflicts with existing', this._param._edge && this._param._edge.record.path);
                        this._param._edge = { segment: current, record: record };
                    } else {
                        Hoek.assert(!this._wildcard || !remaining[0].wildcard, 'New route', record.path, 'conflicts with existing', this._wildcard && this._wildcard.record.path);
                        this._param.add(remaining, record);
                    }
                }
            };

            internals.Segment.prototype._mixedLookup = function (segment) {

                for (var i = 0; i < this._mixed.length; ++i) {
                    if (internals.mixed({ segment: segment }, this._mixed[i]) === 0) {
                        return this._mixed[i];
                    }
                }

                return null;
            };

            internals.mixed = function (a, b) {

                var aFirst = -1;
                var bFirst = 1;

                var as = a.segment;
                var bs = b.segment;

                if (as.length !== bs.length) {
                    return as.length > bs.length ? aFirst : bFirst;
                }

                if (as.first !== bs.first) {
                    return as.first ? bFirst : aFirst;
                }

                for (var i = 0; i < as.segments.length; ++i) {
                    var am = as.segments[i];
                    var bm = bs.segments[i];

                    if (am === bm) {
                        continue;
                    }

                    if (am.length === bm.length) {
                        return am > bm ? bFirst : aFirst;
                    }

                    return am.length < bm.length ? bFirst : aFirst;
                }

                return 0;
            };

            internals.Segment.prototype.lookup = function (path, segments, options) {

                var match = null;

                // Literal edge

                if (this._fulls) {
                    match = this._fulls[options.isCaseSensitive ? path : path.toLowerCase()];
                    if (match) {
                        return { record: match.record, array: [] };
                    }
                }

                // Literal node

                var current = segments[0];
                var nextPath = path.slice(current.length + 1);
                var remainder = segments.length > 1 ? segments.slice(1) : null;

                if (this._literals) {
                    var literal = options.isCaseSensitive ? current : current.toLowerCase();
                    match = this._literals.hasOwnProperty(literal) && this._literals[literal];
                    if (match) {
                        var record = internals.deeper(match, nextPath, remainder, [], options);
                        if (record) {
                            return record;
                        }
                    }
                }

                // Mixed

                if (this._mixed) {
                    for (var i = 0; i < this._mixed.length; ++i) {
                        match = this._mixed[i];
                        var params = current.match(match.segment.mixed);
                        if (params) {
                            var array = [];
                            for (var j = 1; j < params.length; ++j) {
                                array.push(params[j]);
                            }

                            var _record = internals.deeper(match.node, nextPath, remainder, array, options);
                            if (_record) {
                                return _record;
                            }
                        }
                    }
                }

                // Param

                if (this._param) {
                    if (current || this._param._edge && this._param._edge.segment.empty) {

                        var _record2 = internals.deeper(this._param, nextPath, remainder, [current], options);
                        if (_record2) {
                            return _record2;
                        }
                    }
                }

                // Wildcard

                if (this._wildcard) {
                    return { record: this._wildcard.record, array: [path.slice(1)] };
                }

                return null;
            };

            internals.deeper = function (match, path, segments, array, options) {

                if (!segments) {
                    if (match._edge) {
                        return { record: match._edge.record, array: array };
                    }

                    if (match._wildcard) {
                        return { record: match._wildcard.record, array: array };
                    }
                } else {
                    var result = match.lookup(path, segments, options);
                    if (result) {
                        return { record: result.record, array: array.concat(result.array) };
                    }
                }

                return null;
            };
        });

        var segment$1 = interopDefault(segment);

        var require$$0$1 = Object.freeze({
            default: segment$1
        });

        var index = createCommonjsModule(function (module, exports) {
            'use strict';

            // Load modules

            var Hoek = interopDefault(require$$0);
            var Boom = interopDefault(require$$2);
            var Regex = interopDefault(require$$1);
            var Segment = interopDefault(require$$0$1);

            // Declare internals

            var internals = {
                pathRegex: Regex.generate(),
                defaults: {
                    isCaseSensitive: true
                }
            };

            exports.Router = internals.Router = function (options) {

                this.settings = Hoek.applyToDefaults(internals.defaults, options || {});

                this.routes = {}; // Key: HTTP method or * for catch-all, value: sorted array of routes
                this.ids = {}; // Key: route id, value: record
                this.vhosts = null; // {} where Key: hostname, value: see this.routes

                this.specials = {
                    badRequest: null,
                    notFound: null,
                    options: null
                };
            };

            internals.Router.prototype.add = function (config, route) {

                var method = config.method.toLowerCase();

                var vhost = config.vhost || '*';
                if (vhost !== '*') {
                    this.vhosts = this.vhosts || {};
                    this.vhosts[vhost] = this.vhosts[vhost] || {};
                }

                var table = vhost === '*' ? this.routes : this.vhosts[vhost];
                table[method] = table[method] || { routes: [], router: new Segment() };

                var analysis = config.analysis || this.analyze(config.path);
                var record = {
                    path: config.path,
                    route: route || config.path,
                    segments: analysis.segments,
                    params: analysis.params,
                    fingerprint: analysis.fingerprint,
                    settings: this.settings
                };

                // Add route

                table[method].router.add(analysis.segments, record);
                table[method].routes.push(record);
                table[method].routes.sort(internals.sort);

                var last = record.segments[record.segments.length - 1];
                if (last.empty) {
                    table[method].router.add(analysis.segments.slice(0, -1), record);
                }

                if (config.id) {
                    Hoek.assert(!this.ids[config.id], 'Route id', config.id, 'for path', config.path, 'conflicts with existing path', this.ids[config.id] && this.ids[config.id].path);
                    this.ids[config.id] = record;
                }

                return record;
            };

            internals.Router.prototype.special = function (type, route) {

                Hoek.assert(Object.keys(this.specials).indexOf(type) !== -1, 'Unknown special route type:', type);

                this.specials[type] = { route: route };
            };

            internals.Router.prototype.route = function (method, path, hostname) {

                var segments = path.split('/').slice(1);

                var vhost = this.vhosts && hostname && this.vhosts[hostname];
                var route = vhost && this._lookup(path, segments, vhost, method) || this._lookup(path, segments, this.routes, method) || method === 'head' && vhost && this._lookup(path, segments, vhost, 'get') || method === 'head' && this._lookup(path, segments, this.routes, 'get') || method === 'options' && this.specials.options || vhost && this._lookup(path, segments, vhost, '*') || this._lookup(path, segments, this.routes, '*') || this.specials.notFound || Boom.notFound();

                return route;
            };

            internals.Router.prototype._lookup = function (path, segments, table, method) {

                var set = table[method];
                if (!set) {
                    return null;
                }

                var match = set.router.lookup(path, segments, this.settings);
                if (!match) {
                    return null;
                }

                var assignments = {};
                var array = [];
                for (var i = 0; i < match.array.length; ++i) {
                    var name = match.record.params[i];
                    var value = match.array[i];
                    if (value) {
                        value = internals.decode(value);
                        if (value.isBoom) {
                            return this.specials.badRequest || value;
                        }

                        if (assignments[name] !== undefined) {
                            assignments[name] = assignments[name] + '/' + value;
                        } else {
                            assignments[name] = value;
                        }

                        if (i + 1 === match.array.length || name !== match.record.params[i + 1]) {

                            array.push(assignments[name]);
                        }
                    }
                }

                return { params: assignments, paramsArray: array, route: match.record.route };
            };

            internals.decode = function (value) {

                try {
                    return decodeURIComponent(value);
                } catch (err) {
                    return Boom.badRequest('Invalid request path');
                }
            };

            internals.Router.prototype.normalize = function (path) {

                if (path && path.indexOf('%') !== -1) {

                    // Uppercase %encoded values

                    var uppercase = path.replace(/%[0-9a-fA-F][0-9a-fA-F]/g, function (encoded) {
                        return encoded.toUpperCase();
                    });

                    // Decode non-reserved path characters: a-z A-Z 0-9 _!$&'()*+,;=:@-.~
                    // ! (%21) $ (%24) & (%26) ' (%27) ( (%28) ) (%29) * (%2A) + (%2B) , (%2C) - (%2D) . (%2E)
                    // 0-9 (%30-39) : (%3A) ; (%3B) = (%3D)
                    // @ (%40) A-Z (%41-5A) _ (%5F) a-z (%61-7A) ~ (%7E)

                    var decoded = uppercase.replace(/%(?:2[146-9A-E]|3[\dABD]|4[\dA-F]|5[\dAF]|6[1-9A-F]|7[\dAE])/g, function (encoded) {
                        return String.fromCharCode(parseInt(encoded.substring(1), 16));
                    });

                    path = decoded;
                }

                return path;
            };

            internals.Router.prototype.analyze = function (path) {

                Hoek.assert(internals.pathRegex.validatePath.test(path), 'Invalid path:', path);
                Hoek.assert(!internals.pathRegex.validatePathEncoded.test(path), 'Path cannot contain encoded non-reserved path characters:', path);

                var pathParts = path.split('/');
                var segments = [];
                var params = [];
                var fingers = [];

                for (var i = 1; i < pathParts.length; ++i) {
                    // Skip first empty segment
                    var segment = pathParts[i];

                    // Literal

                    if (segment.indexOf('{') === -1) {
                        segment = this.settings.isCaseSensitive ? segment : segment.toLowerCase();
                        fingers.push(segment);
                        segments.push({ literal: segment });
                        continue;
                    }

                    // Parameter

                    var parts = internals.parseParams(segment);
                    if (parts.length === 1) {

                        // Simple parameter

                        var item = parts[0];
                        Hoek.assert(params.indexOf(item.name) === -1, 'Cannot repeat the same parameter name:', item.name, 'in:', path);
                        params.push(item.name);

                        if (item.wilcard) {
                            if (item.count) {
                                for (var j = 0; j < item.count; ++j) {
                                    fingers.push('?');
                                    segments.push({});
                                    if (j) {
                                        params.push(item.name);
                                    }
                                }
                            } else {
                                fingers.push('#');
                                segments.push({ wildcard: true });
                            }
                        } else {
                            fingers.push('?');
                            segments.push({ empty: item.empty });
                        }
                    } else {

                        // Mixed parameter

                        var seg = {
                            length: parts.length,
                            first: typeof parts[0] !== 'string',
                            segments: []
                        };

                        var finger = '';
                        var regex = '^';
                        for (var _j = 0; _j < parts.length; ++_j) {
                            var part = parts[_j];
                            if (typeof part === 'string') {
                                finger = finger + part;
                                regex = regex + Hoek.escapeRegex(part);
                                seg.segments.push(part);
                            } else {
                                Hoek.assert(params.indexOf(part.name) === -1, 'Cannot repeat the same parameter name:', part.name, 'in:', path);
                                params.push(part.name);

                                finger = finger + '?';
                                regex = regex + '(.' + (part.empty ? '*' : '+') + ')';
                            }
                        }

                        seg.mixed = new RegExp(regex + '$', !this.settings.isCaseSensitive ? 'i' : '');
                        fingers.push(finger);
                        segments.push(seg);
                    }
                }

                return {
                    segments: segments,
                    fingerprint: '/' + fingers.join('/'),
                    params: params
                };
            };

            internals.parseParams = function (segment) {

                var parts = [];
                segment.replace(internals.pathRegex.parseParam, function (match, literal, name, wilcard, count, empty) {

                    if (literal) {
                        parts.push(literal);
                    } else {
                        parts.push({
                            name: name,
                            wilcard: !!wilcard,
                            count: count && parseInt(count, 10),
                            empty: !!empty
                        });
                    }

                    return '';
                });

                return parts;
            };

            internals.Router.prototype.table = function (host) {

                var result = [];
                var collect = function collect(table) {

                    if (!table) {
                        return;
                    }

                    Object.keys(table).forEach(function (method) {

                        table[method].routes.forEach(function (record) {

                            result.push(record.route);
                        });
                    });
                };

                if (this.vhosts) {
                    var vhosts = host ? [].concat(host) : Object.keys(this.vhosts);
                    for (var i = 0; i < vhosts.length; ++i) {
                        collect(this.vhosts[vhosts[i]]);
                    }
                }

                collect(this.routes);

                return result;
            };

            internals.sort = function (a, b) {

                var aFirst = -1;
                var bFirst = 1;

                var as = a.segments;
                var bs = b.segments;

                if (as.length !== bs.length) {
                    return as.length > bs.length ? bFirst : aFirst;
                }

                for (var i = 0;; ++i) {
                    if (as[i].literal) {
                        if (bs[i].literal) {
                            if (as[i].literal === bs[i].literal) {
                                continue;
                            }

                            return as[i].literal > bs[i].literal ? bFirst : aFirst;
                        }
                        return aFirst;
                    } else if (bs[i].literal) {
                        return bFirst;
                    }

                    return as[i].wildcard ? bFirst : aFirst;
                }
            };
        });

        var CallRouter = interopDefault(index);

        // pulls in node module and export with rollup

        function urltoPath(url) {

            if (!url || url.trim() === '') {
                throw new Error('No url provided');
            }
            return new URL(url).pathname;
        }

        function normalisePath(path, options) {

            checkStructure(path, 'path');
            var url = new URL('http://example.org' + path);
            if (endsWith(url.pathname, '/')) {
                url.pathname = url.pathname.slice(0, -1);
            }
            return url.pathname;
        }

        function normaliseRoute(route) {

            checkStructure(route, 'route');
            if (endsWith(route, '/')) {
                route = route.slice(0, -1);
            }
            return route;
        }

        function checkStructure(str, name) {

            if (!str || str.trim() === '') {
                throw new Error('No ' + name + ' provided');
            }
            if (str.indexOf('/') !== 0) {
                throw new Error('The ' + name + ' does not start with a backslash');
            }
        }

        function endsWith(str, match, position) {
            if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > str.length) {
                position = str.length;
            }
            position -= match.length;
            var lastIndex = str.lastIndexOf(match, position);
            return lastIndex !== -1 && lastIndex === position;
        }

        CallRouter.urltoPath = urltoPath;
        CallRouter.normaliseRoute = normaliseRoute;
        CallRouter.normalisePath = normalisePath;

        return CallRouter;
    });
    });

var HAPIRouter = interopDefault(router);

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

})));
//# sourceMappingURL=ghostworker-sw.js.map
