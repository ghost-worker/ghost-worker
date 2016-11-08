'use strict';

function removeLastBackslash( path ){
      if (path === '/') {
          return path;
      }
      return endsWith(path, '/') ? path.slice(0, -1) : path;
}


function urlJoinPath( url, path ){
    url = new URL( url );
    url.pathname = url.pathname + path
    return url.toString();
}


function urlReplacePath( url, path ){
    url = new URL( url );
    url.pathname = path
    return url.toString();
}


function urlRemoveBackslash( url ){
    url = new URL( url );
    if(endsWith(url.pathname, '/')){
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


function clone(obj){
    // very simple clone, be careful
    return JSON.parse(JSON.stringify(obj))
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
    removeLastBackslash,
    urlJoinPath,
    urlReplacePath,
    urlRemoveBackslash,
    endsWith,
    clone,
    handleErrors
};
