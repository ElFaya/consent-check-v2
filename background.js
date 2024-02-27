console.log('background.js');

let urls = [];

// Fonction pour filtrer les URLs
function filterUrls(fileUrl) {
    return !(
        fileUrl.includes("criteo") ||
        fileUrl.includes("pinterest") ||
        fileUrl.includes("outbrain") ||
        fileUrl.includes("quantserve") ||
        fileUrl.includes("facebook") ||
        fileUrl.includes("adnxs") ||
		fileUrl.includes("yahoo") ||
		fileUrl.includes("teads") ||
		fileUrl.endsWith(".js") ||
        fileUrl === "https://www.google-analytics.com/analytics.js" ||
		fileUrl === "https://googleads.g.doubleclick.net/pagead/id" ||
		fileUrl === "https://www.google-analytics.com/plugins/ua/ec.js" 
    ) && (fileUrl.includes("google") || fileUrl.includes("doubleclick"));
}

// Écoute des changements de l'onglet actif
chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
        console.log("Active tab URL:", tab.url);
        urls = []; // Réinitialise les URLs lorsque l'onglet actif change
    });
});

// Écoute des requêtes web dans l'onglet actif
chrome.webRequest.onBeforeRequest.addListener(
    function(file){
        var fileUrl = file.url;
        if (filterUrls(fileUrl)) {
            urls.push(fileUrl);
        }
    }, 
    {urls: ["<all_urls>"], tabId: -1}, // Écoute de toutes les URLs, mais uniquement dans l'onglet actif
    ["requestBody"]
);

// Écoute des messages en provenance de popup.js
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
    // Récupération des données
    if(message.action === "pullData") {
        // Envoi des URLs à popup.js
        chrome.runtime.sendMessage({action: "pushData", data: urls});
    }
});
