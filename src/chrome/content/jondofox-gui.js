/******************************************************************************
 * Copyright (C) 2008-2012, JonDos GmbH
 * Author: Johannes Renner, Georg Koppen
 *
 * This code is available on a per window basis.
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

// Enable/disable debug messages here, do not forget
// to create 'browser.dom.window.dump.enabled' first!
var mDebug = true;

// Send data to the console if we're in debug mode
function log(msg) {
  if (mDebug) dump("JonDoFoxGUI :: " + msg + "\n");
}


// We need that here as our about-dialog would not work without it as 'Cc' and
// 'Ci' are just declared in browser.js and hence in the main window...
//
if (typeof(Cc) === 'undefined') {
  var Cc = Components.classes;
  var Ci = Components.interfaces;
};

if (!jondofox) var jondofox = {};
if (!jondofox.bloodyVikings) jondofox.bloodyVikings = {};

jondofox = {
  updateContextMenuEntry : function() {
    try {
      if (gContextMenu != null) {
        if (gContextMenu.onLink && isProxyActive()) {
	  // Hide temp email
          document.getElementById("bypass-proxy").hidden = false;
	  document.getElementById("tempEmailContext").hidden = true;
        } else if (gContextMenu.onTextInput) {
           // Hide proxy
          document.getElementById("bypass-proxy").hidden = true;
	  if (prefsHandler.
              getBoolPref("extensions.jondofox.temp.email.activated")) {
            document.getElementById("tempEmailContext").hidden = false;
	  } else {
            document.getElementById("tempEmailContext").hidden = true;
	  }
        } else {
	  // Hide both
          document.getElementById("bypass-proxy").hidden = true;
	  document.getElementById("tempEmailContext").hidden = true;
	}
      } else {
        log("gContextMenu is null!");
      }
    } catch (e) {
      log("showMenuItem(): " + e);
    }
  },

  withinJonDoBrowser: false
};

jondofox.bloodyVikings = {
  insertAddress: function(field, id) {
    if (!field)
      return;

    try {
      log("Trying to get an temp email-address...");
      Cu.import("resource://jondofox/bloodyVikingsUtils.jsm", this);
      Cu.import("resource://jondofox/bloodyVikingsServices.jsm", this);

      let serviceId = (id === undefined) ? prefsHandler.
        getStringPref("extensions.jondofox.temp.email.selected") : id;
      let service = this.BloodyVikings.Services.getService(serviceId);

      if (!service) {
        if (id === undefined) {
	  jdfUtils.showAlert(jdfUtils.
	    getString("jondofox.temp.email.invalidId.title"), jdfUtils.
	    getString("jondofox.temp.email.invalidID.message"));
          prefsHandler.
            setStringPref("extensions.jondofox.temp.email.selected", null);
        }
        return;
      }

      service.getAddress(
        gBrowser,
        function(address, inboxUrl, cookies) {
          if (field.localName.toLowerCase() === "textarea") {
            field.value = field.value.substr(0, field.selectionStart) +
	                  address + field.value.substr(field.selectionEnd);
          } else {
            field.value = address;
	  }
        },
        function(name, e) {
	  jdfUtils.showAlert(jdfUtils.
	    getString("jondofox.temp.email.incompatibility.title"), jdfUtils.
	    formatString("jondofox.temp.email.incompatibility.message",
	      [name, e.name, e.message]));
        }
      );
    } catch(e) {
      log("Error while fetching temporary a Email-Address: " + e);
    }
  },

  populateContextServicePopup: function(servicePopup) {
    if (!servicePopup.hasChildNodes()) {
      Cu.import("resource://jondofox/bloodyVikingsServices.jsm", this);

      for (let id in this.BloodyVikings.Services.serviceList) {
        let service = this.BloodyVikings.Services.getService(id);
        let item = document.createElement("menuitem");
        item.setAttribute("label", service.name);
        item.addEventListener("command",
          function() {
            jondofox.bloodyVikings.insertAddress(document.popupNode,
              service.name);
          },
          false);

        servicePopup.appendChild(item);
      }
    }
  }
};

///////////////////////////////////////////////////////////////////////////////
// Proxy stuff
///////////////////////////////////////////////////////////////////////////////

// Get the preferences handler
var prefsHandler = Cc['@jondos.de/preferences-handler;1'].
                                 getService().wrappedJSObject;
// Get the JDFManager
var jdfManager = Cc['@jondos.de/jondofox-manager;1'].
                                 getService().wrappedJSObject;

var reqObs = Cc['@jondos.de/request-observer;1'].
             getService().wrappedJSObject;

Components.utils.import("resource://jondofox/jdfUtils.jsm", this);

var iOService = Cc["@mozilla.org/network/io-service;1"]
                .getService(Ci.nsIIOService);

var customPrefix = "extensions.jondofox.custom.";

// Preferences that need to be observed for triggering GUI changes
var STATE_PREF = jdfManager.STATE_PREF;
var PROXY_PREF = 'network.proxy.type';
var CUSTOM_LABEL = 'extensions.jondofox.custom.label';
var EMPTY_PROXY = 'extensions.jondofox.custom.empty_proxy';
var VERSION_PREF = 'extensions.jondofox.last_version';
var MENU_PREF = 'extensions.jondofox.advanced_menu';

// Set the extension into a certain state,
// pass one of the jdfManager.STATE_XXXs
function setProxy(state) {
  log("Started helper function for setting proxy state to '" + state + "'");
  try {
    // Call the underlying method in JDFManager
    if (!jdfManager.setProxy(state)) {
      // If the state didn't change, call refresh() by hand
      log("NOT a state change, calling refresh() ..");
      // Maybe somone configured her proxy not to use a fake UA anymore. We
      // should therefore check the User Agent here as well.
      if (state === jdfManager.STATE_CUSTOM) {
          jdfManager.setUserAgent(false, state)
      }
      refresh();
    } else {
      // The state has changed --> set the user agent and clear cookies     
      jdfManager.closeAllTabsAndWindows();
      jdfManager.clearMemoryCache();
      jdfManager.setUserAgent(false, state);
      jdfManager.clearAllCookies();
      jdfManager.enforceCachePref();
      
      // Setting already_submitted object back to avoid tracking risks
      reqObs.sslObservatory.already_submitted = {};
	    
      if ("@maone.net/noscript-service;1" in Components.classes) {
           let ns =  Cc["@maone.net/noscript-service;1"].getService().wrappedJSObject;
           ns.eraseTemp();
      }

     // clear HTTP-Auth
      var authMgr = Cc["@mozilla.org/network/http-auth-manager;1"].getService(Ci.nsIHttpAuthManager);
      if(authMgr) {
         authMgr.clearAll();
      }
      // Clear all crypto auth tokens. 
      var authCrypto = Cc["@mozilla.org/security/sdr;1"].getService(Ci.nsISecretDecoderRing);
      if(authCrypto) {
           authCrypto.logoutAndTeardown();
      }
      // clear other crypto tokens
      var secMgr = Cc["@mozilla.org/security/crypto;1"].getService(Ci.nsIDOMCrypto);
      if(secMgr) {
         secMgr.logout();
      }
      // clear site permissions
      // var permMgr = Cc["@mozilla.org/permissionmanager;1"].getService(Ci.nsIPermissionManager);
      // if(permMgr) {
      //   permMgr.removeAll();
      // }
      
      // clearingSearchbarHistory();
      
    }
    // Force prefs to be synced to disk
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService);
    prefService.savePrefFile(null);

  } catch (e) {
    log("setProxy(): " + e);
  } finally {
    // Actively hide the 'menupopup'
    var win = Cc['@mozilla.org/appshell/window-mediator;1'].
                 getService(Ci.nsIWindowMediator).
                 getMostRecentWindow('navigator:browser');
    win.document.getElementById('jondofox-proxy-list').hidePopup();
  }
}

// Disable the proxy and ask the user for confirmation first
function setProxyNone() {
  try {
    // Hide 'menupopup'
    var win = Cc['@mozilla.org/appshell/window-mediator;1'].
                 getService(Ci.nsIWindowMediator).
                 getMostRecentWindow('navigator:browser');
    win.document.getElementById('jondofox-proxy-list').hidePopup();
    // Request user confirmation if she has not disabled the warning
    var keepProxyEnabled;
    if (!prefsHandler.getBoolPref('extensions.jondofox.proxy_warning')) {
      keepProxyEnabled = false;
    }
    else {
      log("Asking for confirmation ..");
      keepProxyEnabled = jdfUtils.showConfirmEx(jdfUtils.
                  getString('jondofox.dialog.warning'), jdfUtils.
                  getString('jondofox.dialog.message.proxyoff'), 'proxy',
                  false);
    }
    if (!keepProxyEnabled) {
      // Call the method above
      setProxy(jdfManager.STATE_NONE);
    } else {
      // Refresh the statusbar
      refresh();
    }
  } catch (e) {
    log("setProxyNone(): " + e);
  }
}

// Check whether there are really proxy settings if changing to custom proxy.
// If not, ask the user whether she really wants to surf without proxy.

function setCustomProxy() {
  var keepProxyEnabled;
  log("Check whether there is a proxy set at all ..");
  try {
    // Hide 'menupopup'; As we may call it from prefs-dialog,js as well we need
    // the browser window.
    var win = Cc['@mozilla.org/appshell/window-mediator;1'].
                 getService(Ci.nsIWindowMediator).
                 getMostRecentWindow('navigator:browser');
    win.document.getElementById('jondofox-proxy-list').hidePopup();
    // Check whether one of the relevant preferences is zero
    if (prefsHandler.getBoolPref(customPrefix + 'empty_proxy')) {
      if (!prefsHandler.getBoolPref('extensions.jondofox.proxy_warning')) {
        keepProxyEnabled = false;
      }
      else {
        // Request user confirmation
        keepProxyEnabled = jdfUtils.showConfirmEx(jdfUtils.
          getString('jondofox.dialog.warning'), jdfUtils.
          getString('jondofox.dialog.message.nocustomproxy'), 'proxy',
	  false);
      }
      if (!keepProxyEnabled) {
        // Call the setProxy-method
	setProxy(jdfManager.STATE_CUSTOM);
      } else {
          // Refresh the statusbar
	  refresh();
      }
    } else {
	setProxy(jdfManager.STATE_CUSTOM);
    }
  } catch (e) {
    log("setCustomProxy(): " + e);
  }
}

// We are showing a warning if the user wants to start surfing either without
// any proxy at all or without a valid custom one. Maybe she has just forgotten
// to activate it. The true flag indicates that we have a dialog shown on
// startup leading to an other default button. That is not the case for
// JonDoBrowser users as we made it intentionally hard for them to shoot
// themselves into the foot. If they chose no proxy then we assume that is done
// intentionally and avoid the warning.

function isProxyDisabled() {
  var disableJonDo = null;
  if (!prefsHandler.isPreferenceSet('jondobrowser.version') && !prefsHandler.
      isPreferenceSet('extensions.jondofox.browser_version')) {
    if (prefsHandler.getBoolPref('extensions.jondofox.proxy_warning')) {
      if (jdfManager.getState() == jdfManager.STATE_NONE) {
        disableJonDo = jdfUtils.showConfirmEx(jdfUtils.
          getString('jondofox.dialog.attention'), jdfUtils.
          getString('jondofox.dialog.message.proxyoff'), 'proxy', true);
      } else if (jdfManager.getState() == jdfManager.STATE_CUSTOM) {
        if (prefsHandler.getBoolPref(customPrefix + 'empty_proxy')) {
          disableJonDo = jdfUtils.showConfirmEx(jdfUtils.
            getString('jondofox.dialog.attention'), jdfUtils.
            getString('jondofox.dialog.message.nocustomproxy'), 'proxy', true);
        }
      }
      if (disableJonDo !== null && !disableJonDo) {
        setProxy(jdfManager.STATE_JONDO);
      }
    }
  }
}

// Map the current proxy status to a (localized) string label,
// pass one of the jdfManager.STATE_XXXs here
function getLabel(state) {
  // log("Determine proxy status label for " + state);
  try {
    switch (state) {
      case jdfManager.STATE_NONE:
        return jdfUtils.getString('jondofox.statusbar.label.noproxy');

      case jdfManager.STATE_JONDO:
        return jdfUtils.getString('jondofox.statusbar.label.jondo');

      case jdfManager.STATE_TOR:
        return jdfUtils.getString('jondofox.statusbar.label.tor');

      case jdfManager.STATE_CUSTOM:
        // Return the custom set label if it's not empty
        var l = prefsHandler.getStringPref('extensions.jondofox.custom.label');
        if (l != "") {
          return l;
        } else {
          return jdfUtils.getString('jondofox.statusbar.label.custom');
        }

      default:
        // This should actually never happen
        log("!! Unknown proxy state: " + state);
        return jdfUtils.getString('jondofox.statusbar.label.unknown');
    }
  } catch (e) {
    log("getLabel(): " + e);
  }
}

// Refresh the statusbar
function refresh() {
  log("Refreshing the statusbar and the toolbar button");
  try {
    // Get state, label and statusbar respectively
    var state = jdfManager.getState();
    var label = getLabel(state);
    var win = Cc['@mozilla.org/appshell/window-mediator;1'].
                 getService(Ci.nsIWindowMediator).
                 getMostRecentWindow('navigator:browser');
    var statusbar = win.document.getElementById('jondofox-proxy-status');
    // No statusbar. Let's try the add-on bar...
    if (!statusbar) {
      log("We try the addon-bar!");
      statusbar = win.document.getElementById('addon-bar');
    }
    var emptyCustomProxy = prefsHandler.getBoolPref(customPrefix + 'empty_proxy');
    if (statusbar) {
      // Set the text color; if we have proxy state custom and an empty proxy
      // then change the text color as well...
      if (state == jdfManager.STATE_NONE ||
          (state == jdfManager.STATE_CUSTOM && emptyCustomProxy)) {
        statusbar.style.color = "#F00";
      } else {
        statusbar.style.color = "#000";
      }
      // Set the label to the statusbar
      statusbar.setAttribute('label', "Proxy: " + label);
    }
    // Set the custom proxy label in the popup menu
    win.document.getElementById('custom-radio').label = getLabel(jdfManager.
                                                       STATE_CUSTOM);
    // Checking the proper menuitem here.
    win.document.getElementById(state + "-radio").setAttribute("checked", "true");
    // Refresh context menu: Set the label of 'bypass-proxy'
    win.document.getElementById('bypass-proxy').label = jdfUtils.
       formatString("jondofox.contextmenu.bypass.label", [label]);
    refreshToolbarButton();
  } catch (e) {
    log("refresh(): " + e);
  }
}

function refreshToolbarButton() {
  log("Now we refresh the toolbar button...");
  var state = jdfManager.getState();
  var label = getLabel(state);
  var tbButton = document.getElementById("jondofox-toolbar-button");
  if (tbButton) {
    var emptyCustomProxy = prefsHandler.getBoolPref(customPrefix + 'empty_proxy');
    tbButton.setAttribute("proxy", state);
    tbButton.setAttribute("label", "Proxy: " + label);
    if (state == jdfManager.STATE_NONE ||
        (state == jdfManager.STATE_CUSTOM && emptyCustomProxy)) {
      tbButton.style.color = "#F00";
    } else {
      tbButton.style.color = "#000";
    }
  }
}

// Return false if state is NONE or CUSTOM with no valid proxy
// else true (called from jondofox-overlay.xul)
function isProxyActive() {
  // log("Checking if proxy is active");
    var customAndDisabled = jdfManager.getState() == jdfManager.STATE_CUSTOM &&
	prefsHandler.getBoolPref(customPrefix + 'empty_proxy');
  return (jdfManager.getState() != jdfManager.STATE_NONE && !customAndDisabled);
}

///////////////////////////////////////////////////////////////////////////////
// Utility functions
///////////////////////////////////////////////////////////////////////////////

// Opens a website in a new Tab

function openPageNewTab(aString) {
  try {
    var win = Cc['@mozilla.org/appshell/window-mediator;1'].
                 getService(Ci.nsIWindowMediator).
                 getMostRecentWindow('navigator:browser');
    if (aString === "keepAlive") {
      win.openUILinkIn(jdfUtils.getString('jondofox.keepAliveHelp.url'), 'tab');
    } else if (aString === "anontest") {
      if (win.gBrowser.getBrowserForTab(win.gBrowser.selectedTab).
	  currentURI.spec === 'about:blank') {
        win.openUILinkIn(jdfUtils.getString('jondofox.anontest.url'),
          'current');
      } else {
        win.openUILinkIn(jdfUtils.getString('jondofox.anontest.url'), 'tab');
      }
    } else if (aString === "homepage") {
      win.openUILinkIn(jdfUtils.getString('jondofox.homepage.url'), 'tab');
    } else if (aString === "noScript") {
      win.openUILinkIn('http://noscript.net', 'tab');
    } else if (aString === "cookieController") {
      var cm = 'https://addons.mozilla.org/en-US/firefox/addon/cookie-controller/';
      win.openUILinkIn(cm, 'tab');
    } else if (aString === "about") {
      if (win.gBrowser.getBrowserForTab(win.gBrowser.selectedTab).
	  currentURI.spec === 'about:blank') {
        win.openUILinkIn('about:jondofox', 'current');
      } else {
        win.openUILinkIn('about:jondofox', 'tab');
      }
    } else if (aString === "observatory") {
      win.openUILinkIn("https://www.eff.org/observatory", 'tab');
    } else if (aString === "observatoryAPI") {
      win.openUILinkIn("https://trac.torproject.org/projects/tor/wiki/doc/HTTPSEverywhere/SSLObservatorySubmission", 'tab');
    } else if (aString === "tempWiki") {
      win.openUILinkIn(jdfUtils.getString("jondofox.temp.email.wikiURL"), 'tab');
    } else if (aString === "jdb") {
      win.openUILinkIn(jdfUtils.getString("jondofox.browser.url"), 'tab');
    }
  } catch (e) {
    log("openPageNewTab(): " + e);
  }
}

// Open dialog to edit preferences
function openDialogPreferences() {
  log("Open dialog 'JonDoFox-Preferences'");
  try {
    var win = Cc['@mozilla.org/appshell/window-mediator;1'].
                 getService(Ci.nsIWindowMediator).
                 getMostRecentWindow('jondofox:prefs-dialog');
    if (!win) {
      // No additional parameters needed WRONG: we need at least centerscreen
      // otherwise the dialog is shown in the left upper corner using JDF
      // portable
      window.openDialog("chrome://jondofox/content/dialogs/prefs-dialog.xul",
        "prefs-dialog", "centerscreen");
    } else {
      // We have already one window open, focus it!
      win.focus();
    }
  } catch (e) {
    log("openDialogPreferences(): " + e);
  }
}

///////////////////////////////////////////////////////////////////////////////
// These methods are called to bypass the proxy for certain URIs
///////////////////////////////////////////////////////////////////////////////

// Bypass the proxy and save target as
function bypassProxyAndSave(uri) {
  log("Bypassing the proxy for " + uri);
  try {
    noProxyListAdd(uri);
    document.getElementById('context-savelink').doCommand();
  } catch (e) {
    log("bypassProxyAndSave(): " + e);
  }
}

// Check if a given URI is on the 'no proxy list'
// TODO: Might get removed...
function noProxyListContains(uri) {
  return jdfManager.noProxyListContains(uri);
}

// Add a given URI to the 'no proxy list'
function noProxyListAdd(uri) {
  try {
    jdfManager.noProxyListAdd(uri);
  } catch (e) {
    log("addException() :" + e);
  }
}

// Remove a given URI from the list
function noProxyListRemove(uri) {
  try {
    jdfManager.noProxyListRemove(uri);
  } catch (e) {
    log("removeException() :" + e);
  }
}

///////////////////////////////////////////////////////////////////////////////
// Deleting searchbar entries
// ////////////////////////////////////////////////////////////////////////////

function clearingSearchbar(e) {
  try {
    if (prefsHandler.getBoolPref('extensions.jondofox.delete_searchbar')) {
      // If the user searched something (either via pressing return or
      // clicking on the search icon or dragging something into the serachbar or
      // choosing a value by mouseclick or return key out of her search history)
      // we erase the searchbar value to protect against someone looking over
      // the user's shoulder.
      if (e.keyCode === 13 || e.type === "drop" ||
          (e.type === "click" && e.button !== 2)) {
        var searchbar = window.document.getElementById("searchbar");
        if (searchbar && searchbar.value) {
          log("We found some searchbar value to erase...");
          searchbar.value = "";
        } else {
          log("We found no searchbar(value), thus deleting nothing!");
        }
      }
    }
  } catch (e) {
    log("Something went wrong while clearing the searchbar: " + e);
  }
}

function clearingSearchbarHistory() {
  try {
    var formHistSvc = Cc["@mozilla.org/satchel/form-history;1"].
	    getService(Ci.nsIFormHistory2);
    if (formHistSvc.nameExists("searchbar-history")) {
      log("We found search-history values to erase...");
      formHistSvc.removeEntriesForName("searchbar-history");
    } else {
      log("No searchbar history entries found! Waiting for another 30 min...");
    }
  } catch (e) {
    log("Something went wrong with deleting the searchbar history!");
  }
}

function openJDFFeaturePage() {
  var win = Cc['@mozilla.org/appshell/window-mediator;1'].
                 getService(Ci.nsIWindowMediator).
                 getMostRecentWindow('navigator:browser');
  // TODO: That does not take into account the scenario of having different
  // tabs open and updating + restarting an extension! Test with more than one
  // windows as well. Test again with newVersion flag set to false (see below)!
  if (prefsHandler.getIntPref("browser.startup.page") === 0 ||
      (prefsHandler.getIntPref("browser.startup.page") === 1 && prefsHandler.
       getStringPref("browser.startup.homepage") === "about:blank")) {
    win.openUILinkIn('about:jondofox', 'current');
  } else {
    // We know that the user had an other page as her default start page.
    // We therefore load the feature page in a new tab to not get blamed for
    // overwriting the default one.
    win.openUILinkIn('about:jondofox', 'tab');
  }
}

function HTMLParser(aHTMLString){
  var html = document.implementation.
    createDocument("http://www.w3.org/1999/xhtml", "html", null),
    body = document.createElementNS("http://www.w3.org/1999/xhtml", "body"),
    head = document.createElementNS("http://www.w3.org/1999/xhtml", "head");
  // Appending the child here, no parsing as the parseFragment method below does
  // not parse head elements; we add the content later.
  html.documentElement.appendChild(head);
  html.documentElement.appendChild(body);

  body.appendChild(Components.classes["@mozilla.org/feed-unescapehtml;1"]
    .getService(Components.interfaces.nsIScriptableUnescapeHTML)
    .parseFragment(aHTMLString, false, null, body));

  return html;
}

function errorPageCheck() {
  var contDoc = window.content.document;
  if (contDoc.documentURI.indexOf("about:neterror?e=proxyConnectFailure") ===
      0) {
    // If we had a TLS request we would get an proxyConnectFailure error as
    // well if we just had disabled JonDo. The resulting error page is probably
    // confusing for users. We, therefore, try to request the site over plain
    // HTTP. If we succeeded we show the usual JonDo errorpage but rewrite the
    // links to HTTPS. First let's check for a TLS request.
    var reqURL = gURLBar.value;
    if (reqURL.indexOf("https://") === 0) {
      // We have to check whether JonDo is really disabled or not loaded
      reqURL = reqURL.replace("https://", "http://");
      // We just want to send the domain for safety's sake, thus...
      if (reqURL.indexOf("/", 7) !== -1) {
        reqURL = reqURL.slice(0, reqURL.indexOf("/", 7));
        log("reqURL is: " + reqURL);
      }
      var request = new XMLHttpRequest();
      request.onreadystatechange = function(aEvt) {
        if (request.readyState === 4) {
          if (request.status === 202) {
            // Got the JonDo Error page.
            try {
              var DOMPars = HTMLParser(request.responseText);
              var aElems = DOMPars.getElementsByTagName("a");
              for (let i = 0; i < aElems.length; i++) {
                // We just add the proper http link if the a elements have the
                // correct id.
                if (aElems[i].getAttribute("id") === "JonDoProxy") {
                  aElems[i].setAttribute("href", gURLBar.value);
                }
              }
              var titleElem = contDoc.createElement("title");
              var titleText = contDoc.createTextNode("JAP/JonDo");
              titleElem.appendChild(titleText);
              DOMPars.getElementsByTagName("head")[0].appendChild(titleElem);
              var headElem = contDoc.getElementsByTagName("head")[0];
              var bodyElem = contDoc.getElementsByTagName("body")[0];
              contDoc.documentElement.replaceChild(DOMPars.firstChild.
                firstChild, headElem);
              contDoc.documentElement.replaceChild(DOMPars.firstChild.
                firstChild, bodyElem);
            } catch (e) {
              log("Error while parsing the HTML and modifying the DOM: " + e);
            }
            return;
          }
        }
      }
      request.open("GET", reqURL, true);
      // For safety's sake...
      request.setRequestHeader("Cookie", null);
      request.setRequestHeader("Authorization", null);
      request.send(null);
    }
    var longContentElem = contDoc.getElementById("errorLongContent");
    if (jdfManager.isJondoInstalled) {
      if (!jdfManager.jondoProcess.isRunning) {
        var buttonShortDesc = contDoc.createElement("div");
        buttonShortDesc.setAttribute("id", "errorShortDesc");
        var button = contDoc.createElement("button");
        var text = contDoc.createTextNode(jdfUtils.
          getString("jondofox.jondo.startbutton.value"));
        button.setAttribute("id", "jondoButton");
        button.setAttribute("type", "button");
        button.setAttribute("title", jdfUtils.
          getString("jondofox.jondo.startbutton.value"));
        button.appendChild(text);
        buttonShortDesc.appendChild(button);
        buttonShortDesc.setAttribute("style", "text-align:center;");
        longContentElem.appendChild(buttonShortDesc);
        button.addEventListener("click", startJondoAgain, false);
      } else {
        // JonDo is probably already starting...
        contDoc.getElementById("errorTitleText").style.display = "none";
        var jondoIsStarting = contDoc.createElement("div");
        jondoIsStarting.setAttribute("id", "errorShortDesc");
        var pNode = contDoc.createElement("p");
        pNode.setAttribute("id", "errorShortDescText");
        pNode.setAttribute("style", "color:green;");
        var textNode = contDoc.createTextNode(jdfUtils.
          getString("jondofox.jondo.isStarting"));
        pNode.appendChild(textNode);
        jondoIsStarting.appendChild(pNode);
        longContentElem.appendChild(jondoIsStarting);
      }
    } else {
      // We found the error page but no JonDo we could start therefore
      // checking if we can safely whitelist and display the download links...
      var textNode;
      var pHintNode;
      var pHintNode2;
      var pHintNode3;
      var hintTextNode;
      var hintTextNode2;
      var imgNode;
      var refNode;
      var jondoURI;
      var downloadLink = contDoc.createElement("div");
      downloadLink.setAttribute("id", "errorShortDesc");
      var pNode = contDoc.createElement("p");
      refNode = contDoc.createElement("a");
      pNode.setAttribute("id", "errorShortDescText");
      if (jdfManager.os === "windows") {
        jondoURI = jdfUtils.
          getString("jondofox.jondo.windows");
      } else if (jdfManager.os === "linux") {
        jondoURI = jdfUtils.
          getString("jondofox.jondo.linux");
      } else if (jdfManager.os === "darwin") {
        jondoURI = jdfUtils.
          getString("jondofox.jondo.mac");
      } else {
        jondoURI = jdfUtils.
          getString("jondofox.jondo.unsupported");
      }
      refNode.setAttribute("href", jondoURI);
      textNode = contDoc.createTextNode(jondoURI);
      refNode.appendChild(textNode);
      pNode.appendChild(refNode);
      pHintNode = contDoc.createElement("p");
      pHintNode.setAttribute("id", "errorShortDescText");
      hintTextNode = contDoc.createTextNode(jdfUtils.
        getString("jondofox.jondo.hint"));
      pHintNode.appendChild(hintTextNode);
      pHintNode2 = contDoc.createElement("p");
      pHintNode2.setAttribute("id", "errorShortDescText");
      hintTextNode2 = contDoc.createTextNode(jdfUtils.
        getString("jondofox.jondo.hint2"));
      pHintNode2.appendChild(hintTextNode2);
      pHintNode3 = contDoc.createElement("p");
      pHintNode3.setAttribute("id", "errorShortDescText");
      imgNode = contDoc.createElement("img");
      imgNode.setAttribute("src", jdfUtils.
        getString("jondofox.jondo.hint.image"));
      pHintNode3.appendChild(imgNode);
      pHintNode3.setAttribute("style", "text-align:center;");
      downloadLink.appendChild(pHintNode);
      downloadLink.appendChild(pNode);
      downloadLink.appendChild(pHintNode2);
      downloadLink.appendChild(pHintNode3);
      if (jdfManager.os === "windows") {
        var pHintNode4 = contDoc.createElement("p");
        var hintTextNode4 = contDoc.createTextNode(jdfUtils.
          getString("jondofox.jondo.hint4.windows"));
        pHintNode4.appendChild(hintTextNode4);
        downloadLink.appendChild(pHintNode4);
      }
      longContentElem.appendChild(downloadLink);

      if (reqObs.firstRequest) {
        noProxyListAdd(jondoURI);
        noProxyListAdd("http://ocsp.godaddy.com/");
      }
    }
  } else {
    //log("No Errorpage found");
  }
}

function startJondoAgain(e) {
  // Seems to be a sane assumption that we can allow just one click on the
  // button as the surfing should be possible afterwards again. And if a new
  // error page is popping up later on there is a new button element included
  // there as well (with a new click listener).
  e.target.removeEventListener("click", startJondoAgain, false);
  if (e.button !== 2) {
    jdfManager.startJondo();
  }
}

function findToolbarIcon() {
  if (typeof(gNavToolbox) == "undefined") {
    return;
  }
  var toolbox = gNavToolbox ? gNavToolbox.customizeChange /* 3.5+ */ : getNavToolbox().customizeChange /* 3.0.x */;
  /* Save the original function, prefixed with our name in case other addons are doing the same thing */
  getNavToolbox().jondofoxCustomizeChange = getNavToolbox().customizeChange;
  /* Overwrite the property with our function */
  getNavToolbox().customizeChange = function() {
    if (document.getElementById("jondofox-toolbar-button")) {
      refreshToolbarButton();
    }
    getNavToolbox.jondofoxCustomizeChange();
  }
}

function startupChecks() {
  // Let's check if NoScript and Cookie Monster are installed
  // and enabled. If not remind the user of the importance to do so
  // and load the NoScript (or Cookie Monster) homepage
  // if it is missing. We do this here using a flag because either
  // (FF3) the window is not ready when we check it or (FF4) the
  // callback returns so late.
  log("Checking for NoScript and CM.....");
  if (prefsHandler.getBoolPref('extensions.jondofox.update_warning')) {
    if (!jdfManager.isNoScriptInstalled) {
      jdfUtils.showAlertCheck(jdfUtils.getString('jondofox.dialog.attention'),
        jdfUtils.formatString('jondofox.dialog.message.necessaryExtension',
        ['NoScript']), 'update');
      openPageNewTab("noScript");
    } else if (!jdfManager.isNoScriptEnabled) {
      jdfUtils.showAlertCheck(jdfUtils.getString('jondofox.dialog.attention'),
        jdfUtils.formatString('jondofox.dialog.message.enableExtension',
        ['NoScript']), 'update');
    }
  }
  // The user could have disabled the update warning already in the
  // NoScript popup (if that is missing or disabled). Thus, we check
  // it here again.
  if (prefsHandler.getBoolPref('extensions.jondofox.update_warning')) {
    if (!jdfManager.isCMInstalled) {
      jdfUtils.showAlertCheck(jdfUtils.getString('jondofox.dialog.attention'),
        jdfUtils.formatString('jondofox.dialog.message.necessaryExtension',
        ['Cookie Controller']), 'update');
      openPageNewTab("cookieController");
    } else if (!jdfManager.isCMEnabled) {
      jdfUtils.showAlertCheck(jdfUtils.getString('jondofox.dialog.attention'),
        jdfUtils.formatString('jondofox.dialog.message.enableExtension',
        ['Cookie Cntroller']), 'update');
    }
  }
  // Let's test whether the user starts with appropriate proxy-settings..
  isProxyDisabled();
  // If the user should update the profile and has not disabled the update
  // warning, help her and show the JonDoFox homepage after startup. But first
  // we check whether the user is deploying our JonDoBrowser...
  if (!prefsHandler.isPreferenceSet('jondobrowser.version') && !prefsHandler.
      isPreferenceSet('extensions.jondofox.browser_version')) {
    if (jdfManager.checkProfileUpdate()) {
      openPageNewTab("homepage");
    }
  } else {
    // We are within JonDoBrowser...
    // Check if we are up-to-date and first whether we did that check already
    // (i.e. in an other window).
    if (!prefsHandler.isPreferenceSet('jondobrowser.version')) {
      // We don't have the updater available. Take the old fallback if we have
      // not checked yet whether a new version exists.
      if (!jdfManager.jdbCheck) {
        if (prefsHandler.getStringPref("extensions.jondofox.jdb.version") ===
            prefsHandler.getStringPref("extensions.jondofox.browser_version")) {
          // Everything is fine, JonDoBrowser is up-to-date.
        } else {
          if (prefsHandler.getBoolPref('extensions.jondofox.update_warning')) {
            jdfUtils.showAlertCheck(jdfUtils.
              getString('jondofox.dialog.attention'), jdfUtils.
              getString("jondofox.browser.update"), 'update');
            openPageNewTab("jdb");
          }
        }
        // Having the message in one window is enough...
        jdfManager.jdbCheck = true;
      }
    }
    jondofox.withinJonDoBrowser = true;
    // Adapt our menu according to the user settings and monitor the respective
    // preference.
    if (!prefsHandler.getBoolPref(MENU_PREF)) {
      document.getElementById("enhanced-menu-selected").hidden = true;
    }
    prefsHandler.prefs.addObserver(MENU_PREF, prefsObserver, false);
  }
}

///////////////////////////////////////////////////////////////////////////////
// The method 'initWindow()' is called on the 'load' event + observers
///////////////////////////////////////////////////////////////////////////////

// Observer for different preferences
var prefsObserver = {
  // Implement nsIObserver
  observe: function(subject, topic, data) {
    switch (topic) {
      case 'nsPref:changed':
        // log(topic + " --> " + data);
        // If someone disables the proxy in FF ..
        if (data === PROXY_PREF) {
          if (prefsHandler.getIntPref(PROXY_PREF) == 0 &&
                 jdfManager.getState() != jdfManager.STATE_NONE) {
            log("Detected 'network.proxy.type' == 0, set state to 'none' ..");
            // .. set the state to 'none'
            jdfManager.setState(jdfManager.STATE_NONE);
            jdfManager.setUserAgent(false, jdfManager.STATE_NONE);
          }
        }
        else if (data === VERSION_PREF) {
            log("Detected last version change in FF4.")
	    openJDFFeaturePage();
            if (!prefsHandler.getBoolPref(
                'extensions.jondofox.noscript_showDomain')) {
                prefsHandler.setBoolPref('noscript.showDomain', false);
            }
	  }
        else if (data === MENU_PREF) {
          let menuObserver = document.getElementById("enhanced-menu-selected");
          if (prefsHandler.getBoolPref(MENU_PREF)) {
            menuObserver.hidden = false;
          } else {
            menuObserver.hidden = true;
          }
        }
        else {
          // STATE_PREF or CUSTOM_LABEL or EMPTY_PROXY has changed,
          // just refresh the statusbar
          refresh();
        }
        break;

      default:
        log("!! Unknown topic " + topic);
        break;
    }
  }
}

// This overlay observer belongs to the init process
var overlayObserver = {
  // Implement nsIObserver
  observe: function(subject, topic, data) {
    var exFound;
    var appStart;
    var restart;
    switch (topic) {
      case 'xul-overlay-merged':
        try {
          // 'subject' implements nsIURI
          var uri = subject.QueryInterface(Ci.nsIURI);
          if (uri.spec === "chrome://jondofox/content/jondofox-gui.xul") {
            // Thanks to FoxyProxy for this idea for customizing the toolbar
            // button automatically if it is added to the toolbar.
            findToolbarIcon();
            // Overlay is ready --> refresh the GUI
	    refresh();
            // Add observer to different preferences
	    prefsHandler.prefs.addObserver(VERSION_PREF, prefsObserver, false);
            prefsHandler.prefs.addObserver(STATE_PREF, prefsObserver, false);
            prefsHandler.prefs.addObserver(PROXY_PREF, prefsObserver, false);
            prefsHandler.prefs.addObserver(CUSTOM_LABEL, prefsObserver, false);

            // We need to observe this preference because otherwise there
	    // would be no refreshing of the status bar if we had already
	    // 'custom' as a our proxy state: the correct writing of 'custom'
	    // with either red or black letters would not work if we accepted
	    // or applied new settings.

            prefsHandler.prefs.addObserver(EMPTY_PROXY, prefsObserver, false);
            log("New window is ready");

            gBrowser.addEventListener("DOMContentLoaded", errorPageCheck,
              false);

            // Show about:jondofox if new version was installed
	    if (jdfManager.newVersionDetected) {
	        // Get the last version property
                var last_version = prefsHandler.getStringPref('extensions.jondofox.last_version');
         
                log("New version detected, opening feature page ..");
	        // Checking whether we have to open a new tab for about:jondofox and opening it.
	        openJDFFeaturePage();
                prefsHandler.setStringPref('extensions.jondofox.last_version',
                  jdfManager.VERSION);
                if (!prefsHandler.getBoolPref(
                  'extensions.jondofox.noscript_showDomain')) {
                  prefsHandler.setBoolPref('noscript.showDomain', false);
                }
   
                jdfManager.newVersionDetected = false;
	    }

            setTimeout(function() {startupChecks()}, 100);

            
              // First, setting the toolbar button on first startup...
              if (prefsHandler.getBoolPref("extensions.jondofox.firstStart")) {
                prefsHandler.setBoolPref("extensions.jondofox.firstStart",
                   false);
                var navBar = document.getElementById("nav-bar");
                if (navBar) {
                  var curSet = navBar.currentSet.split(",");
                  if (curSet.indexOf("jondofox-toolbar-button") === -1) {
                    var pos = curSet.indexOf("unified-back-forward-button") + 1 || curSet.
                      length;
                    var set = curSet.slice(0, pos).
                      concat("jondofox-toolbar-button").
                      concat(curSet.slice(pos));
                    navBar.setAttribute("currentset", set.join(","));
                    navBar.currentSet = set.join(",");
                    document.persist(navBar.id, "currentset");

                    try {
                      BrowserToolboxCustomizeDone(true);
                    } catch (e) {}
                  }
                }
              }
	      // Second, if there are incompatible extensions we found
	      // we iterate through the array containing them and we restart
	      // the browser after showing a proper message dialog
	      exFound = jdfManager.extensionsFound;
              if (exFound.length > 0) {
	        for (var i = 0; i < exFound.length; i++) {
	          log("The array contains: " + exFound[i]);
	          jdfUtils.showAlert(jdfUtils.
	              getString('jondofox.dialog.attention'), jdfUtils.
                      formatString('jondofox.dialog.message.uninstallExtension',
                      [exFound[i]]));
	        }
                appStart =
		   Cc['@mozilla.org/toolkit/app-startup;1'].
			      getService(Ci.nsIAppStartup);
                appStart.quit(Ci.nsIAppStartup.eAttemptQuit|
			     Ci.nsIAppStartup.eRestart);
	      }
            
	    // We delete the search history after 30 minutes... But only using
	    // one setInterval as there is no search history per window but
	    // per session.
	    if (!jdfManager.isClearingSearchhistoryEnabled) {
	      jdfManager.isClearingSearchhistoryEnabled = true;
	      var intervalHID = window.setInterval(clearingSearchbarHistory,
			    1800000);
	    }
	    // We set listeners to the search bar text box as well as to
	    // the Go-Button and the search history popup to erase the search
	    // query immediately after or during submitting...
	    var searchbar = document.getElementById("searchbar");
	    document.getElementById("PopupAutoComplete").
		    addEventListener("click", clearingSearchbar, false);
	    searchbar.textbox.addEventListener("keypress", clearingSearchbar, true);
	    searchbar.textbox.addEventListener("drop", clearingSearchbar, false);
	   
	    document.getAnonymousElementByAttribute(searchbar,
			    "anonid", "search-go-button").addEventListener(
				    "click", clearingSearchbar, true);
          } else {
            log("!! Wrong uri: " + uri.spec);
          }
          break;
	} catch (e) {
          log("There occurred an error within the overlayobserver: " + e);
        }
      default:
        log("!! Unknown topic: " + topic);
        break;
    }
  }
}

function shutdown() {
  try {
    log("Removing event listeners and observers...");
    window.removeEventListener("load", initWindow, true);
    window.removeEventListener("unload", shutdown, false);
    window.removeEventListener("load", initTitleListener, false);
    window.removeEventListener("load", function(e) { CertPatrol.onLoad(e); },
           false);
    document.getElementById("PopupAutoComplete").
            removeEventListener("click", clearingSearchbar, false);
    document.getElementById("searchbar").textbox.
	    removeEventListener("keypress", clearingSearchbar, true);
    document.getElementById("searchbar").textbox.
	    removeEventListener("drop", clearingSearchbar, false);
    
    document.getAnonymousElementByAttribute(document.
	getElementById("searchbar"), "anonid", "search-go-button").
	    removeEventListener("click", clearingSearchbar, true);
    document.getElementById("content").removeEventListener("DOMTitleChanged",
		    setTitleModifier, false);
    // TODO: Does not work as this is an anonymous function!
    document.getElementById("content").removeEventListener("load",
		    CertPatrol.onPageLoad, true);
    document.getElementById("contentAreaContextMenu").
	    removeEventListener("popupshowing",
		jondofox.updateContextMenuEntry, false);
    gBrowser.removeEventListener("DOMContentLoaded", errorPageCheck, false);
    prefsHandler.prefs.removeObserver(VERSION_PREF, prefsObserver, false);
    prefsHandler.prefs.removeObserver(STATE_PREF, prefsObserver, false);
    prefsHandler.prefs.removeObserver(PROXY_PREF, prefsObserver, false);
    prefsHandler.prefs.removeObserver(CUSTOM_LABEL, prefsObserver, false);
    prefsHandler.prefs.removeObserver(EMPTY_PROXY, prefsObserver, false);
    if (jondofox.withinJonDoBrowser) {
      prefsHandler.prefs.removeObserver(MENU_PREF, prefsObserver, false);
    }
  } catch (e) {
    log("Error while removing event listeners and observers: " + e);
  }
}

// Initialize a new browser window
function initWindow() {
  log("New browser window ..");
  try {
    window.addEventListener("unload", shutdown, false);
    // FIXME: Due to bug #330458 subsequent calls to loadOverlay() do not work.
    // Few other extensions (CuteMenus) also load overlays dynamically and can
    // therefore cause this call to fail. For further information, please see
    // http://developer.mozilla.org/en/DOM/document.loadOverlay and
    // https://bugzilla.mozilla.org/show_bug.cgi?id=330458
    // Additionally, loading an overlay with the same URI twice is also not
    // supported. A polling approach is therefore not practicable.

    // Possible workaround: Dynamically load the GUI overlay using a timeout
    // var code = 'document.loadOverlay(\"chrome://jondofox/content/' +
    //           'jondofox-gui.xul\", overlayObserver)';
    // setTimeout(code, 800);

    // This should work unexceptionally if bug #330458 is fixed.
    document.loadOverlay('chrome://jondofox/content/jondofox-gui.xul',
                overlayObserver);
    var contextMenu = document.getElementById("contentAreaContextMenu");
    if (contextMenu) {
      contextMenu.addEventListener("popupshowing",
	jondofox.updateContextMenuEntry, false);
    }
  } catch (e) {
    log("initWindow(): " + e);
  }
}
