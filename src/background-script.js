var refwdformatter = {
  
  editing: false,

  kCurrentLegacyMigration: 1,  // Migration flag. 0: not-migrated, 1: already-migrated
  kPrefDefaults: {
    replytext_on: true,
    replyhtml_on: true
  },
  loadPrefs: async function () {

    const results = await browser.storage.local.get("preferences");
  
    const currentMigration =
      results.preferences && results.preferences.migratedLegacy
        ? results.preferences.migratedLegacy
        : 0;
  
    if (currentMigration >= refwdformatter.kCurrentLegacyMigration) {
      return results.preferences;
    }
  
    let prefs = results.preferences || {};
  
    if (currentMigration < 1) {
      for (const prefName of Object.getOwnPropertyNames(refwdformatter.kPrefDefaults)) {
        prefs[prefName] = refwdformatter.kPrefDefaults[prefName];
      }
    }

    prefs.migratedLegacy = refwdformatter.kCurrentLegacyMigration;
    await browser.storage.local.set({ "preferences": prefs });
    return prefs;
  },

  format: async function (tab) {

    if (refwdformatter.editing) {
      return;
    }
    refwdformatter.editing = true;
    //console.log(tab);

    const prefs = await refwdformatter.loadPrefs();
    var ret = prefs.replytext_on
    var reh = prefs.replyhtml_on;

    let notCompose = false;
    let details;
    try { details = await browser.compose.getComposeDetails(tab.id);} catch(error) { notCompose = true; }
    if (notCompose) {
      refwdformatter.editing = false;
      return;
    };

    let indexCite = details.body.indexOf("class=\"moz-cite-prefix\"");
    if (indexCite === -1) { // fallback in case SmartTemplates is used:
      indexCite = details.body.indexOf("id=\"smartTemplate4-quoteHeader\"");
    }
    if (indexCite === -1) { // fallback in case EnhancedReplyHeaders is used:
      indexCite = details.body.indexOf("class=\"ehr-email-headers-table\"");
    }

    let indexFwd = details.body.indexOf("class=\"moz-forward-container\"");
    if (indexCite === -1) {
      //console.log("Not-Reply Type");
      refwdformatter.editing = false;
      return;
    }
    if (indexFwd !== -1) {
      if (indexFwd < indexCite) {
          //console.log("Forward Type");
          refwdformatter.editing = false;
          return;
        }
    }

    let isPlainText = details.isPlainText;
    let isHtml = !isPlainText;

    if (ret || reh) {

      let htmlbody = details.body;//b.innerHTML;
      //console.log(details);

      //https://eur01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fwww.kernel.org%2Fdoc%2FDocumentation%2Fdevicetree%2Fbindings%2Fpci%2Fpci-iommu.txt&data=05%7C02%7CMykyta_Poturai%40epam.com%7Cf9d6204a8ab946b9f36f08dd6563f203%7Cb41b72d04e9f4c268a69f949f367c91d%7C1%7C0%7C638778202132702429%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=C6nyqgwkewqgSR65siicN6BqgdvSOtTKiCKguD1lB%2BQ%3D&reserved=0
      // Main Logic
      if (htmlbody !== "<br>") {
      
        if (ret && isPlainText) {
      
          let textbody = details.plainTextBody;
      
          while (true) {
            // Find first SafeLinks URL
            let safeLinksIndex = textbody.search(/https:\/\/[a-zA-Z0-9.-]+\.safelinks\.protection\.outlook\.com\/\?url=/);
            if (safeLinksIndex !== -1) {
              let safeLinksUrl = textbody.substring(safeLinksIndex);
              let safeLinksEnd = safeLinksUrl.search(/[\s\n]/); // Search for space or newline
              if (safeLinksEnd === -1) {
                safeLinksEnd = safeLinksUrl.length;
              }
              safeLinksUrl = safeLinksUrl.substring(0, safeLinksEnd);
              // Extract original URL with URL parsing
              let url = new URL(safeLinksUrl);
              let originalUrl = url.searchParams.get("url");
              // Replace SafeLinks URL with original URL
              // If there is space before the SafeLinks URL, add it to the replacement
              textbody = textbody.replace(safeLinksUrl, originalUrl);
              console.log("Replaced: " + safeLinksUrl + " with " + originalUrl);
            } else {
              break;
            }
          }
      
          browser.compose.setComposeDetails(tab.id, { plainTextBody: textbody });
      
        } 
      }

    }
    window.setTimeout(function () {
      refwdformatter.editing = false;
    }, 700);
  },

  onDelayLoad: function (tab) {
    //console.log("onDelayLoad"); // for test
    window.setTimeout(function () {
      refwdformatter.format(tab);
    }, 700);
  },


  onLoad: function () {
    browser.tabs.onCreated.addListener(refwdformatter.onDelayLoad);
  }

};

window.addEventListener("load", refwdformatter.onLoad, true);
