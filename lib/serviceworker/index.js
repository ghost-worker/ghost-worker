'use strict';

import Utils from '../utils.js';
import HAPIRouter from './router';



self.addEventListener('message', function (event) {
    console.log('Handling message event:', event);

    let msgPackage = Utils.clone(event.data);
    switch (msgPackage.command) {
        // This command returns a list of the URLs corresponding to the Request objects
        // that serve as keys for the current cache.
        case 'getRouteData':
            if(msgPackage.url){
                msgPackage.result = getRouteData(msgPackage.url);
            }else{
                msgPackage.error = 'No url passed';
            }
            break;
        case 'getSiteData':
            msgPackage.result = data.site;
            break;
        default:
            // This will be handled by the outer .catch().
            msgPackage.error = 'Unknown command: ' + msgPackage.command;
    }
    event.ports[0].postMessage( Utils.clone(msgPackage) );

    // use event.waitUntil(promise); if you call promise
});



// Temp
let GhostWorkerSW = {}
GhostWorkerSW.version = 0.1;




self.addEventListener('fetch', function(event) {

    var requestURL = new URL(Utils.urlRemoveBackslash( event.request.url) );
    var routeData = getRouteData( requestURL );

    if( Utils.endsWith(requestURL.pathname, '-json') || Utils.endsWith(requestURL.pathname, '-template')){

        event.respondWith(
          caches.match(event.request)
            .then(function(response) {
              if (response) {
                return response;
              }
              // create a response - no cache
              return response
            }
          )
        );


    } else if(routeData && event.request.headers.get('X-Ghost-Worker-Content') !== 'raw'){
      //console.log('fetch:',event.request.url);



      // templates
      var templateRequest = new Request(Utils.urlReplacePath(event.request.url, routeData.templatePath), {});
      event.respondWith(

        caches.match(templateRequest)
          .then(function(response) {

            //console.log(getCacheName(response));

            // if found response with template and instructions to add JSON
            if (response) {
              return injectCommand(response, 'GhostWorkerDOM.addJSON();');
            } else {

              // use real request object
              return fetch(event.request)
                .then(function (response) {
                  // with first response add instructions to create template and JSON
                  return injectCommand(response, 'GhostWorkerDOM.create();');
                })
                .catch(function(reason){
                    console.log('sw fetch fail', reason);
                })
            }
          }
        )
      )


      }else{
      // everthing else
       // console.log('url:', requestURL.pathname, 'method:', event.request.method.toLowerCase());
        event.respondWith(
          caches.match(event.request)
            .then(function(response) {
              if (response) {
                //console.log(getCacheName(response));
                return response;
              }
              return fetchAndCache(event.request, {})
            }
          )
        );
      }


  });



function injectCommand( response, command ){
    var clonedResponse = response.clone();

    if(clonedResponse.status >= 200 && clonedResponse.status < 400){
        var options = {
            status:     clonedResponse.status,
            statusText: clonedResponse.statusText,
            headers:    {
                'X-GhostWorker': 'Template',
                'Content-Type': 'text/html'
            }
        };
        //var myHeaders = new Headers();
        //myHeaders.append('Content-Type', 'text/xml');
        //myHeaders.get('Content-Type') // should return 'text/xml'

        // test status before modification
        return clonedResponse.text().then(function(body){
            return new Response(body + '<script class="ghostworker-script">' + command + '</script>', options);
        });
    }else{
        return response
    }
}



function matchRoute( path ){
    return (path.indexOf('/code/') === 0);
}



// fetch and then cache successful responses
function fetchAndCache(request, options) {
  options = options || {};

  return fetch(request.clone())
    .then(function(response) {

        var requestURL = new URL(request.url);
        //console.log('url:', requestURL.pathname, 'method:', request.method.toLowerCase(), 'status:', response.status);

        // has to a GET with 200 status and not a `raw` request to be caches
        if (request.method === 'GET' &&
            response.status > 199 &&
            response.status < 400 &&
            request.headers.get('X-Ghost-Worker-Content') !== 'raw') {

        caches.open('ghostworker-' + getCacheName(response) + '-v' + GhostWorkerSW.version).then(function(cache) {
            cache.put(request, response)
        });
        }

        return response.clone();
    })
    .catch(function(reason){
        console.log('sw fetch fail', reason);
    })
}


function getCacheName(response){

   let cacheType = 'other';
   if(response && response.headers){
      let contentType = response.headers.get('Content-Type');
      if(contentType.indexOf(';') > -1){
        contentType = contentType.split(';')[0].trim();
      }


      if(contentType && contentType.indexOf('/') > -1){
        const parts = contentType.split('/')
          switch (parts[0]) {
            case 'image':
              cacheType = 'image'
              break
            case 'audio':
              cacheType = 'audio'
              break
            case 'video':
              cacheType = 'video'
              break
            case 'application':
              cacheType = 'application'
              break
            case 'text':
              cacheType = 'text'
              break
          }

          let contentMimeTypes = {
            html: ['text/html', 'application/xhtml+xml'],
            css: ['text/css'],
            js: ['application/javascript', 'text/javascript', 'application/json'],
            font: ['application/vnd.ms-fontobject', 'application/font-woff', 'application/font-woff2', 'application/x-font-truetype', 'application/x-font-opentype']
          }

          if (cacheType === 'application' || cacheType === 'text') {
              for (var name in contentMimeTypes) {
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
   }

   return cacheType;
}



function getRouteData( url ){
    //if(sendMessage){
    //    sendMessage(JSON.stringify({ 'command': 'getRouteData', 'url': url }));
    //}

    let targetUrl = new URL( url );
    let targetRoute = router.route('get', targetUrl.pathname);

    if(targetRoute){
        // use key to get array of matches from routeMap
        var matchingRoutes = routeMap[targetRoute.route];

        if(matchingRoutes.length > 1){
            var out = null;
            matchingRoutes.forEach( function(route) {
                if(route.matchFunction && route.matchFunction(targetUrl.pathname, targetRoute)){
                    out = route;
                }
            })
            return out;
        }
        if(matchingRoutes.length === 1){
            return matchingRoutes[0];
        }
    }
    return null;
}







var data = {
    site: {},
    routes: []
}


data.site = {
    templatePath: '/-template',
    elements: [
        '.contents'
    ],
    metaTags: [
        'description',
        'twitter:url',
        'twitter:title',
        'twitter:description',
    ],
    linkTags: [
        {'rel': 'canonical'}
    ]
}


data.routes.push({
    name: 'About',
    match: '/about',
    elements: [
        'article h1',
        '.hresume'
    ]
});


data.routes.push({
    name: 'Projects',
    match: '/projects',
    elements: [
        'article h1',
        '.e-content'
    ]
});


data.routes.push({
    name: 'Articles listings',
    match: ['/articles','/articles/{item}'],
    matchFunction: function(path, routeData){
        return path.indexOf('-') === -1
    },
    elements: [
        '.page-title',
        'article.h-as-post',
        '.h-paging',
        '.page-created time'
    ]
});


data.routes.push({
    name: 'Articles',
    match: '/articles/{item}',
    matchFunction: function(path, routeData){
        return path.indexOf('-') > -1
    },
    elements: [
        '.p-name',
        '.e-content',
        '.dateline',
        '.tag-list'
    ]
});


data.routes.push({
    name: 'Note listings',
    addAttributes: [{
        selector: 'ul.content-menu li:nth-child(2)',
        class: 'active'
    }],
    match: ['/notes','/notes/{item}'],
    matchFunction: function(path, routeData){
        return path.indexOf('-') === -1
    },
    elements: [
        '.page-title',
        'article.h-as-note',
        '.h-paging',
        '.page-created time'
    ]
});


data.routes.push({
    name: 'Notes',
    addAttributes: [{
        selector: 'ul.content-menu li:nth-child(2)',
        class: 'active'
    }],
    match: '/notes/{item}',
    matchFunction: function(path, routeData){
        return path.indexOf('-') > -1
    },
    elements: [
        '.reply-to',
        'h1.e-content',
        '.detail-link',
        '.reply-to',
        '.likes',
        '.syndications'
    ]
});



data.routes.push({
    name: 'Code listings',
    templatePath: '/code/-list-template',
    match: '/code/',
    elements: [
        '.page-title',
        'article.h-as-note',
        'h-paging',
        '.page-created time'
    ]
});


data.routes.push({
    name: 'Code',
    templatePath: '/code/-detail-template',
    match: '/code/{item}',
    elements: [
        'h1',
        '#summary',
        '#example'
    ]
});







const router = new HAPIRouter.Router();
let routeKey = 1;
let routeMap = {}


// auto add title element
if(data.site.elements.indexOf('title') === -1){
    data.site.elements.unshift('title');
}

data.routes.forEach( (route) => {

    if(!route.templatePath && route.name){
        route.templatePath = '/-' + slugify(route.name) + '-template';
    }

    if(!Array.isArray(route.match)){
        route.match = [route.match];
    }
    // check title is always included
    route.elements = route.elements || [];

    // auto add title element
    if(route.elements.indexOf('title') === -1){
        route.elements.unshift('title');
    }

    route.match.forEach( function(match) {
        var match = Utils.removeLastBackslash( match );
        if(!router.route('get', match)){
            // add route with key so we can match more than one object
            router.add({ method: 'get', path: match }, routeKey);
            routeMap[routeKey] = [route];
            routeKey ++;
        }else{
            routeMap[router.route('get', match).route].push( route );
        }
    });
});


function slugify(str) {
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
};





/*
    removeAttributes: [{
        selector: 'ul.content-menu',
        class: 'active'
    },{
        selector: 'ul.meta-menu',
        class: 'active'
    }],
    */