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
            // Appel de linesIcon pour mettre à jour le badge à chaque nouvelle URL ajoutée
            linesIcon(urls);
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


const finalRowsCount = linesIcon(urls);

function linesIcon(urls) {
  const urlList = {};
  let finalRowsCount = 0;
  
  urls.forEach(fileUrl => {
    const serviceName = mapServiceName(fileUrl);
    const gcdValue = extractGcdValue(fileUrl);
    const gcdStatus = getGcdStatus(gcdValue);
    let serviceId;
    const catValue = extractCatValue(fileUrl);
    const typeValue = extractTypeValue(fileUrl);
    
    if (serviceName !== 'Unknown') { // Vérifie si le service name n'est pas "Unknown"
      if (serviceName === 'DV & CM' || serviceName === 'Piggyback') {
        serviceId = extractSrcValue(fileUrl);
      } else if (serviceName === 'Google Analytics') {
        serviceId = extractGaId(fileUrl);
      } else if (serviceName === 'Google Ads') {
        serviceId = extractAwId(fileUrl);
      }
      
      // Création d'une clé unique basée sur gcdValue, serviceId, catValue et typeValue
      const key = `${gcdValue}_${serviceId}_${catValue}_${typeValue}`;
      
      // Vérification si la clé existe déjà dans urlList
      if (!urlList[key]) {
        urlList[key] = {
          gcdValue: gcdValue,
          gcdStatus: gcdStatus,
          serviceID: serviceId,
          catValue: catValue,
          typeValue: typeValue,
        };
        finalRowsCount++; // Incrémenter finalRowsCount après avoir ajouté un nouvel élément
      }
    }
  });

  // Mise à jour du badge avec le nombre de lignes finales
  chrome.action.setBadgeText({text: `${finalRowsCount}`});
  chrome.action.setBadgeBackgroundColor({ color: [230, 126, 34, 230] });

  // Retourner le nombre de lignes finales
  return finalRowsCount;
}





function extractCatValue(url) {
  // Replace semicolons with ampersands
  url = url.replace(/;/g, '&');
  const params = new URLSearchParams(url);
  return params.get('cat');
}

function extractTypeValue(url) {
  // Replace semicolons with ampersands
  url = url.replace(/;/g, '&');
  const params = new URLSearchParams(url);
  return params.get('type');
}

function extractGaId(url) {
    // Recherche de la partie de l'URL qui contient le paramètre 'tid'
    const tidIndex = url.indexOf('tid=');
    if (tidIndex === -1) {
        // Si le paramètre 'tid' n'est pas trouvé, renvoyer une chaîne vide
        return '';
    }

    // Extraire la sous-chaîne à partir de 'tid=' jusqu'au prochain caractère '&' ou la fin de la chaîne
    const tidSubstring = url.substring(tidIndex + 4);
    const nextAmpersandIndex = tidSubstring.indexOf('&');
    const tid = nextAmpersandIndex !== -1 ? tidSubstring.substring(0, nextAmpersandIndex) : tidSubstring;

    return tid;
}


function extractAwId(url) {
    // Diviser l'URL en parties en utilisant le caractère "/"
    const parts = url.split("/");
    let awId = '';

    // Parcourir les parties pour trouver l'identifiant AW
    for (let i = 0; i < parts.length; i++) {
        // Si la partie actuelle commence par des chiffres et se compose uniquement de chiffres, c'est probablement l'identifiant AW
        if (/^\d+$/.test(parts[i])) {
            awId = parts[i];
            break; // Sortir de la boucle dès que l'identifiant est trouvé
        }
    }

    // Ajouter la chaîne "AW-" devant l'identifiant extrait
    return awId !== '' ? "AW-" + awId : '';
}

function extractSrcValue(url) {
    // Diviser l'URL en utilisant "src=" comme séparateur
    const parts = url.split('src=');
    
    // Si la division a généré plus d'une partie, la valeur de src est la deuxième partie
    if (parts.length > 1) {
        // Si la deuxième partie contient un autre séparateur, on le divise à nouveau
        const srcValue = parts[1].split(/[&;]/)[0];
        // Retourne la valeur de src, après avoir enlevé d'éventuels caractères spéciaux
        return decodeURIComponent(srcValue);
    }
    
    // Si "src=" n'a pas été trouvé, essayons avec "src/"
    const partsWithSlash = url.split('src/');
    
    // Si la division avec "src/" a généré plus d'une partie, la valeur de src est la deuxième partie
    if (partsWithSlash.length > 1) {
        // Si la deuxième partie contient un autre séparateur, on le divise à nouveau
        const srcValue = partsWithSlash[1].split(/[&;]/)[0];
        // Retourne la valeur de src, après avoir enlevé d'éventuels caractères spéciaux
        return decodeURIComponent(srcValue);
    }
    
    // Si ni "src=" ni "src/" n'ont été trouvés, retourne null
    return null;
}

function extractGcdValue(url) {
  // Replace semicolons with ampersands
  url = url.replace(/;/g, '&');
  const params = new URLSearchParams(url);
  return params.get('gcd');
}


function mapServiceName(url) {
  if (url.includes('analytics') || url.includes('audience')) {
    return "Google Analytics";
  } else if (url.includes('fls') || url.includes('ad.doubleclick')) {
    const match = url.match(/[?&;]~oref=([^&;]*)/);
    if (match) {
      const orefValue = decodeURIComponent(match[1]).toLowerCase();
      if (orefValue.includes("adform") || orefValue.includes("doubleclick")) {
        return "Piggyback";
      }
    }
    return "DV & CM";
  } else if (url.includes('gads') || url.includes('pagead')) {
    return "Google Ads";
  } else {
    return "Unknown";
  }
}

function getGcdStatus(gcdValue) {
  if (gcdValue === null) { 
    return "Absence de GCD";
  } else if (gcdValue.includes('u') || gcdValue.includes('v') || gcdValue.includes('t')){
    return "Granted par défaut !";
  } else if (/^\d{2}(r|n|m|q)\dl\d(r|n|m|q)\d(r|n|m|q)\d/i.test(gcdValue)) {
    return "CMv2 Activé sans GA";
  } else if (gcdValue.includes('p')) {
    return "Pas d'update !";
  } else if (gcdValue.includes('l')) {
    return "CMv2 non paramétré";
  } else if (gcdValue.includes('r') || gcdValue.includes('n') || gcdValue.includes('m') || gcdValue.includes('q')) {
    return "CMv2 Activé";
  }
}

