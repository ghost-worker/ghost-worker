


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







const router = new HAPIRouter();
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
        var match = removeLastBackslash( match );
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



module.exports = {
    data,
    router
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