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
	createTable(mappedData);
  }
});


// Fonction pour obtenir l'icône de statut GCD en fonction du statut
function getGcdStatusIcon(gcdStatus) {
  switch (gcdStatus) {
    case "Absence de GCD":
      return "images/ko-icon.png";
    case "CMv2 Activé":
      return "images/ok-icon.png";
    case "CMv2 non paramétré":
      return "images/almost-icon.png";
    case "CMv2 mal paramétré (granted par defaut)":
      return "images/almost-icon.png";
    default:
      return "images/unknown-icon.png";
  }
}

// Fonction pour obtenir le status GCD en fonction de sa valeur
function getGcdStatus(gcdValue) {
  if (gcdValue === null) { 
    return "Absence de GCD";
  } else if (gcdValue.includes('t')) {
    return "CMv2 mal paramétré (granted par defaut)";
  } else if (gcdValue.includes('l')) {
    return "CMv2 non paramétré";
  } else if (gcdValue.includes('e') || gcdValue.includes('r') || gcdValue.includes('n') || gcdValue.includes('v')) {
    return "CMv2 Activé";
  }
}

// Fonction pour obtenir l'icône en fonction du service
function getServiceIcon(serviceName) {
  switch(serviceName) {
    case "Google Analytics":
      return "images/ga-icon.png";
    case "DV & CM":
      return "images/dv-icon.png";
    case "Google Ads":
      return "images/gads-icon.png";
    default:
      return "images/unknown-icon.png";
  }
}

// Fonction pour mapper le nom du service en fonction de l'URL
function mapServiceName(url) {
  if (url.includes('analytics')) {
    return "Google Analytics";
  } else if (url.includes('audience')) {
    return "Google Analytics";
  } else if (url.includes('fls')) {
    return "DV & CM";
  } else if (url.includes('gads')) {
    return "Google Ads";
  } else if (url.includes('pagead')) {
    return "Google Ads";
  }
  return "Unknown";
}

// Fonction pour extraire le paramètre gcd d'une URL
function extractGcdValue(url) {
  const params = new URLSearchParams(url);
  return params.get('gcd');
}

// Fonction principale pour mapper les noms de service et récupérer les valeurs de gcd pour chaque URL
function mapUrlsAndGcdValues(urls) {
  const mappedData = [];

  urls.forEach(url => {
    const serviceName = mapServiceName(url);
    const gcdValue = extractGcdValue(url);
    const gcdStatus = getGcdStatus(gcdValue); // Obtention du statut GCD en fonction de sa valeur

    mappedData.push({
      url: url,
      serviceName: serviceName,
      gcdValue: gcdValue,
      gcdStatus: gcdStatus // Ajout du statut GCD dans les données mappées
    });
  });

  return mappedData;
}


// Fonction pour créer le tableau HTML avec les données mappées
function createTable(mappedData) {
  // Début de la construction du tableau HTML
  let htmlTable = '<table id= resultTable border="1"><tr><th>Icon</th><th>Service</th><th>GCD</th><th>Statut</th><th>Icone Statut</th></tr>';

   // Itération sur les données mappées
  mappedData.forEach(entry => {
	 if (entry.serviceName !== 'Unknown'){
		const serviceIcon = getServiceIcon(entry.serviceName);
		const gcdStatusIcon = getGcdStatusIcon(entry.gcdStatus); // Utilisation correcte comme un objet
		const gcdStatus = getGcdStatus(entry.gcdValue);

		// Construction de chaque ligne du tableau avec les données de l'entrée
		htmlTable += `<tr>
						<td><img src="${serviceIcon}" alt="Service Icon" class="icons"></td>
						<td>${entry.serviceName}</td>
						<td>${entry.gcdValue}</td>
						<td>${gcdStatus}</td>
						<td><img src="${gcdStatusIcon}" alt="GCD Status Icon" class="icons"></td>
					 </tr>`;
  }});

  // Fermeture du tableau HTML
  htmlTable += '</table>';

  // Écrire le tableau HTML dans le document
  document.getElementById("resultsContainer").innerHTML = htmlTable + '</table>';
}

// Exemple d'utilisation avec les données mappées
const mappedData = [];

document.getElementById('premium').addEventListener('click', function() {
    document.getElementById('premium').innerText = 'Coming Soon...';
});
