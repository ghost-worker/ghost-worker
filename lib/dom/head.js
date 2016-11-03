'use strict';

let siteWideLinkTags = ['stylesheet','manifest'];
let siteWideMetaTags = ['viewport','handheldfriendly','mobileoptimized','apple-mobile-web-app-capable','apple-mobile-web-app-status-bar-style'];


function remove( headNode ){

    return {
        link: removeElements( headNode, 'link', 'rel',  siteWideLinkTags ),
        meta: removeElements( headNode, 'meta', 'name', siteWideMetaTags ),
    };
}

function removeElements( headNode, selector, checkAttr, keepList ){

    let out = [];
    let nodeList = headNode.querySelectorAll(selector);
    for (var node of nodeList) {
        if(isOnKeepList( node, checkAttr, keepList ) === false){
            out.push( elementAttributes( node ) );
            headNode.removeChild(node);
        }
    }
    return out;
}


function elementAttributes( node ){

    let out = {};
    let attrs = node.attributes;
    for(var i = attrs.length - 1; i >= 0; i--) {
        out[attrs[i].name] = attrs[i].value;
    }
    return out;
}


function isOnKeepList( node, checkAttr, keepList ){

    let keep = false;
    if(node.hasAttribute(checkAttr)){
        let value = node.getAttribute(checkAttr).toLowerCase();
        if(value.indexOf(' ') > -1){
            value = value.split(' ');
        }else{
            value = [value];
        }
        keepList.forEach(function(item){
            if(value.indexOf(item) > -1){
                keep = true;
            }
        })
    }
    return keep;
}


function patch( headNode, patch ){

    ['link','patch'].forEach(function(tagName){
        if(patch[tagName]){
            patch[tagName].forEach(function(attributes){
                addNode( headNode, tagName, attributes )
            });
        }
    });
}


function addNode( parentNode, tagName, attributes ){

    let newNode = document.createElement(tagName);
    for(let key in attributes){
        if(attributes.hasOwnProperty(key)){
            newNode.setAttribute( key, attributes[key]);
        }
    }
    parentNode.appendChild(newNode);
}


module.exports = {
    remove,
    patch,
    siteWideLinkTags,
    siteWideMetaTags
};