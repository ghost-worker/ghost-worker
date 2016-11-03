'use strict';

function getDataFromSW(requestOptions) {

    return new Promise(function (resolve, reject) {
        let messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = function (event) {
            if (event.data.error) {
                reject(event.data.error);
            } else {
                resolve(event.data);
            }
        };
        navigator.serviceWorker.controller.postMessage(requestOptions, [messageChannel.port2]);
    });
}


function getRouteData(url) {

    return getDataFromSW({ 'command': 'getRouteData', 'url': url })
        .then(function (response) {
            return response.result;
        }).catch(function (reason) {
            console.log(reason);
        });
}


function getSiteData() {

    return getDataFromSW({ 'command': 'getSiteData' })
        .then(function (response) {
            return response.result;
        }).catch(function (reason) {
            console.log(reason);
        });
}


function getVersion() {

    return getDataFromSW({ 'command': 'getVersion' })
        .then(function (response) {
            return response.result;
        }).catch(function (reason) {
            console.log(reason);
        });
}


module.exports = {
    getRouteData,
    getSiteData,
    getVersion
};
