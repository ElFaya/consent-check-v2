console.log('popup.js');
// onLoad popup
document.addEventListener("DOMContentLoaded", function(){
    // send message to: background.js
    // pullData
    chrome.runtime.sendMessage({action: "pullData"});
});

/*
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("analyseButton").addEventListener("click", function() {
    console.log("Button clicked");
	let urls = [];
	let mappedData = [];
    chrome.runtime.sendMessage({ action: "ResetTable" });
  });
});*/

/*
// listen message from: background.js
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse){
    // pushData
    if(message.action === "pushData"){
        // found urls
        if(message.data.length){
            // popup title
            document.write('<h2>'+ message.data.length +' URL FOUND</h2>');
            document.write('<hr />');
            // loop urls
            message.data.map(function(url, i){
                document.write(i+1 + ': ' + truncateString(url, 50) + '<br />');
            });
        // no url found
        }else{
            document.write('<h2>NO URL FOUND.</h2>');
        }
    }
});
*/

let urls = [];

/*function truncateString(str, maxLength){ 
    if(str.length > maxLength){
        return str.substring(0, maxLength - 3) + '...'; 
    } 
    return str; 
} */


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "pushData") {
    console.log("Récupération des urls dans popup.js");
    let urls = message.data;
	console.log('popup.js alimenté' , urls);
	const mappedData = mapUrlsAndGcdValues(urls);
	console.log('extractedServiceAndGcd', mappedData);
	const filteredWrongSetup = mappedData.filter(entry => (
    (["CMv2 non paramétré", "CMv2 mal paramétré", "Granted par défaut !", "Pas d'update !"].includes(entry.gcdStatus)) &&
    (entry.serviceName === 'Google Analytics' || entry.serviceName === 'DV & CM' || entry.serviceName === 'Google Ads')));
	const filteredNullGcd = mappedData.filter(entry => (entry.gcdValue === null) && (entry.serviceName === 'Google Analytics' || entry.serviceName === 'DV & CM' || entry.serviceName === 'Google Ads'));
	console.log('filteredWrongSetup', filteredWrongSetup)
	console.log('filteredNullGcd', mapFloodlightValue(filteredNullGcd.map(entry => entry.url)));
	createTable(mappedData);
	
  }
});


// Fonction pour obtenir l'icône de statut GCD en fonction du statut
function getGcdStatusIcon(gcdStatus) {
  switch (gcdStatus) {
    case "Absence de GCD":
      return "images/ko-icon.png";
    case "CMv2 Activé":
    case "CMv2 Activé sans GA":
      return "images/ok-icon.png";
    case "CMv2 non paramétré":
      return "images/ko-icon.png";
    case "CMv2 mal paramétré":
    case "Granted par défaut !":
    case "Pas d'update !":
      return "images/almost-icon.png";
    default:
      return "images/unknown-icon.png";
  }
}

// Fonction pour obtenir le status GCD en fonction de sa valeur
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

// Fonction pour obtenir l'icône en fonction du service
function getServiceIcon(serviceName) {
  switch(serviceName) {
    case "Google Analytics":
      return "images/ga-icon.png";
    case "DV & CM":
	case "Piggyback":
      return "images/dv-icon.png";
    case "Google Ads":
      return "images/gads-icon.png";
    default:
      return "images/unknown-icon.png";
  }
}

// Fonction pour mapper le nom du service en fonction de l'URL
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

// Fonction pour extraire le paramètre gcd d'une URL
function extractGcdValue(url) {
  // Replace semicolons with ampersands
  url = url.replace(/;/g, '&');
  const params = new URLSearchParams(url);
  return params.get('gcd');
}
// Fonction principale pour mapper les noms de service et récupérer les valeurs de gcd pour chaque URL
function mapUrlsAndGcdValues(urls) {
  const mappedData = {};
  
  urls.forEach(url => {
    const serviceName = mapServiceName(url);
    const gcdValue = extractGcdValue(url);
    const gcdStatus = getGcdStatus(gcdValue);
    let serviceId;
    const catValue = extractCatValue(url);
    const typeValue = extractTypeValue(url);
    
    if (serviceName === 'DV & CM' || serviceName === 'Piggyback') {
      serviceId = extractSrcValue(url);
    } else if (serviceName === 'Google Analytics') {
      serviceId = extractGaId(url);
    } else if (serviceName === 'Google Ads') {
      serviceId = extractAwId(url);
    }
    
    // Création d'une clé unique basée sur gcdValue, serviceId, catValue et typeValue
    const key = `${gcdValue}_${serviceId}_${catValue}_${typeValue}`;
    
    // Vérification si la clé existe déjà dans mappedData
    if (!mappedData[key]) {
      mappedData[key] = {
        url: url,
        serviceName: serviceName,
        gcdValue: gcdValue,
        gcdStatus: gcdStatus,
        serviceID: serviceId,
        catValue: catValue,
        typeValue: typeValue
      };
    }
  });

  // Transformation de l'objet en tableau avant de le retourner
  return Object.values(mappedData);
}

// Ajoutez cette fonction à votre fichier popup.js
function toggleExtraInfo(index) {
  const extraInfoRow = document.getElementById(`extraInfo${index}`);
  const button = document.getElementById(`toggleButton${index}`);
  if (extraInfoRow.style.display === 'none') {
    extraInfoRow.style.display = 'table-row';
    button.innerHTML = "-";
  } else {
    extraInfoRow.style.display = 'none';
    button.innerHTML = "+";
  }
}

// Modifiez la fonction createTable existante pour inclure le bouton "+" et appeler la fonction toggleExtraInfo
function createTable(mappedData) {
  // Début de la construction du tableau HTML
  let htmlTable = '<table id="resultTable" border="1"><tr><th></th><th></th><th>Service</th><th>GCD</th><th>Statut</th></tr>';

  // Itération sur les données mappées
  mappedData.forEach((entry, index) => {
    if (entry.serviceName !== 'Unknown') {
      const serviceIcon = getServiceIcon(entry.serviceName);
      const gcdStatusIcon = getGcdStatusIcon(entry.gcdStatus); // Utilisation correcte comme un objet
      const gcdStatus = getGcdStatus(entry.gcdValue);
      let extraInfo = '';

      // Construction de chaque ligne du tableau avec les données de l'entrée
      htmlTable += `<tr>
                      <td><button id="toggleButton${index}">+</button></td>
                      <td><img src="${serviceIcon}" alt="Service Icon" class="icons"></td>
                      <td>${entry.serviceName}</td>
                      <td>${entry.gcdValue}</td>
                      <td>${gcdStatus}</td>
                      <td><img src="${gcdStatusIcon}" alt="GCD Status Icon" class="resultIcon"></td>
                   </tr>`;

      // Ajouter la ligne supplémentaire
      htmlTable += `<tr id="extraInfo${index}" class="results" style="display: none;">
                      <td colspan="5">
                        <img src="images/arrow.png" alt="Arrow Icon" class="icons">`;

      // Vérifier si le nom du service est 'DV & CM' ou 'Piggyback'
      if (entry.serviceName === 'DV & CM' || entry.serviceName === 'Piggyback') {
        extraInfo += `<strong>Src=</strong>${entry.serviceID}`;
      } else {
        extraInfo += `<strong>Account ID=</strong>${entry.serviceID}`;
      }
      
      // Vérifier si Cat est différent de null avant de l'ajouter
      if (extractCatValue(entry.url) !== null) {
        extraInfo += ` | <strong>Cat=</strong>${extractCatValue(entry.url)}`;
      }
      
      // Vérifier si Type est différent de null avant de l'ajouter
      if (extractTypeValue(entry.url) !== null) {
        extraInfo += ` | <strong>Type=</strong>${extractTypeValue(entry.url)}`;
      }
      
      // Ajout des informations supplémentaires
      htmlTable += extraInfo;

      // Ajout de l'icône URL avec une infobulle contenant l'URL
      htmlTable += ` | <img src="images/url-icon.png" class="icons" title="${entry.url}">`;

      htmlTable += `</td></tr>`;
    }
  });

  // Fermeture du tableau HTML
  htmlTable += '</table>';

  // Écrire le tableau HTML dans le document
  document.getElementById("resultsContainer").innerHTML = htmlTable;

  // Ajouter des écouteurs d'événements aux boutons
  mappedData.forEach((entry, index) => {
    if (entry.serviceName !== 'Unknown') {
      const button = document.getElementById(`toggleButton${index}`);
      button.addEventListener('click', () => {
        toggleExtraInfo(index);
      });
    }
  });
}


// Exemple d'utilisation avec les données mappées
const mappedData = [];

document.getElementById('premium').addEventListener('click', function() {
    var protip = document.getElementById('protip');
    if (protip.style.display === "block") {
        protip.style.display = "none";
        document.getElementById('premium').innerText = 'Show tips';
    } else {
        protip.style.display = "block";
        document.getElementById('premium').innerText = 'Hide tips';
    }
});

document.getElementById('premium').addEventListener('click', function() {
    var containerParent = document.getElementById('containerParent');
    if (containerParent.style.display === "block") {
        containerParent.style.display = "none";
        document.getElementById('premium').innerText = 'Show tips';
    } else {
        containerParent.style.display = "block";
        document.getElementById('premium').innerText = 'Hide tips';
    }
});



/////////////////////test //

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


function mapFloodlightValue(urls) {
  const mappedFloodlight = [];

  urls.forEach(url => {
    const srcValue = extractSrcValue(url);
    const catValue = extractCatValue(url);
    const typeValue = extractTypeValue(url); 

    mappedFloodlight.push({
      url: url,
	  src: srcValue,
      service: mapServiceName(url), // Utilisez mapServiceName pour obtenir le nom du service correspondant
      cat: catValue,
      Type: typeValue,
      gcdStatus: getGcdStatus(extractGcdValue(url)), // Obtenez le statut GCD directement en utilisant extractGcdValue
      gcdValue: extractGcdValue(url) // Utilisez extractGcdValue pour obtenir la valeur GCD directement
    });
  });

  return mappedFloodlight;
}



