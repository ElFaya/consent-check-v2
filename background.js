console.log('background.js');
// vars
let urls = [];
// https://stackoverflow.com/questions/62748871/chrome-extension-read-web-request-body-content
chrome.webRequest.onBeforeRequest.addListener(
    function(file){
        var fileUrl = file.url;
        if((fileUrl.includes("google") || fileUrl.includes("doubleclick"))){
            // console.log("url:"+file.url);
            urls.push(file.url);
        }
    }, 
    {urls: ["<all_urls>"]}, 
    ["requestBody"]
);

console.log('test' , urls);


// listen message from: popup.js
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
    // pullData
    if(message.action === "pullData") {
        // send message to: popup.js
        // pushData
        chrome.runtime.sendMessage({action: "pushData", data: urls});
    }
});