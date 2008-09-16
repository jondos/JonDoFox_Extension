/******************************************************************************
 * Copyright (c) 2008, JonDos GmbH
 * Author: Johannes Renner
 *
 * TODO: Document this
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

// Dump information to the console?
var mDebug = true;

// Send data to the console if we're in debug mode
// Don't forget to create 'browser.dom.window.dump.enabled' first!
function log(msg) {
  if (mDebug) dump("JonDoFox :: " + msg + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Proxy stuff
///////////////////////////////////////////////////////////////////////////////

// Proxy state preference
const statePref = 'extensions.jondofox.proxy.state';

// Get the preferences handler
var prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
                                 getService().wrappedJSObject;
    
// Get the proxy manager
var proxyManager = Components.classes['@jondos.de/proxy-manager;1'].
                                 getService().wrappedJSObject;

// Disable the proxy and set the state pref
function disableProxy() {
  try {
    // Call disable on the proxy manager
    proxyManager.disableProxy();
    prefsHandler.setStringPref(statePref, 'none');
  } catch (e) {
    log("disableProxy(): " + e);
  }
}

// This happens on a double-click:
// Toggle the proxy according to its current state
function toggleProxy() {
  log("Toggling Proxy ..");
  try {
    // Get the current status
    var state = proxyManager.getProxyState();
    if (state > 0) {
      // Disable
      disableProxy();
    } else {
      // Set the proxy to JonDo
      setProxy('jondo');
    }
  } catch (e) {
    log("toggleProxy(): " + e);
  }
}

// This is called when choosing a proxy from the list 
// ['state' --> jondo, tor, custom, none, unknown?]
function setProxy(state) {
  log("Setting proxy to " + state);
  try {
    // Store the previous state to detect if the state didn't change
    var previousState = prefsHandler.getStringPref(statePref);
    if (state == 'none') {
      // Disable the proxy
      disableProxy();
    } else {
      // Check the id
      switch (state) {
        case 'jondo':
          // Set proxies for all protocols but SOCKS
          proxyManager.setProxyAll('127.0.0.1', 4001);
          proxyManager.setProxySOCKS('', 0, 5);
          break; 
 
        case 'tor':
          // Set SOCKS proxy only
          proxyManager.setProxySOCKS('127.0.0.1', 9050, 5);
          proxyManager.setSocksRemoteDNS(true);
          proxyManager.setProxyAll('', 0);
          break;

        case 'custom':
          // TODO: Get custom preferences
          //var prefix = "extensions.jondofox.";
          //var host = prefsHandler.getStringPref(prefix + id + ".proxy_host");
          //var port = prefsHandler.getIntPref(prefix + id + ".proxy_port");
          //proxyManager.setProxyAll(host, port);
          
          // Set it to JonDo for now
          proxyManager.setProxyAll('127.0.0.1', 4001);
          break;

        default:
          log("!! Unknown proxy state: " + state);
          return;
      }
      // Enable and set the state
      proxyManager.enableProxy();
      prefsHandler.setStringPref(statePref, state);          
    }
    // If the state didn't change, call refreshStatus() by hand
    if (previousState == state) {
      log("NOT a state change, calling refreshStatus() ..");
      refreshStatus();
    }
  } catch (e) {
    log("setProxy(): " + e);
  }
}

// Map the current proxy status to a string label
function getLabel() {
  log("Determine proxy-status label");
  try {
    // Get the state first
    var state = prefsHandler.getStringPref(statePref);
    switch (state) {
      case 'none':
        // FIXME: This is a Hack: Return the label of the right menuitem
        var elements = document.getElementsByAttribute('oncommand', "setProxy('none')");
        return elements[0].getAttribute('label');
      
      case 'jondo':
        return "JonDo";

      case 'tor':
        return "Tor";

      case 'custom':
        return "Custom";

      default:
        log("!! Unknown proxy state: " + state);        
        return "Unknown";
    }
  } catch (e) {
    log("getLabel(): " + e);
  }
}

// Set the current label to the proxy-status
function refreshStatus() {
  log("Refreshing the statusbar");
  try {
    // Set the label
    var label = getLabel();
    document.getElementById('jondofox-proxy-status').
                setAttribute('label', label);
    
    // Get the proxy list
    var proxyList = document.getElementById('jondofox-proxy-list');
    // Get the single checkbox elements 
    var items = proxyList.getElementsByAttribute('type', 'checkbox');

    // Uncheck all but the selected one
    for (var i = 0; i < items.length; i++) {
      if (items[i].getAttribute('label') == label) {
        items[i].setAttribute('checked', true);
      } else {
        items[i].setAttribute('checked', false);
      }
    }
  } catch (e) {
    log("refreshStatus(): " + e);
  }
}

// Observe 'extensions.jondofox.proxy.state'
var proxyStateObserver = {
  // Implement nsIObserver
  observe: function(subject, topic, data) {
    switch (topic) {
      case 'nsPref:changed':
        // The state has changed        
        log(topic + " --> " + data);
        // Refresh the status
        refreshStatus();
        break;

      default:
        log("Wrong topic " + topic);
        break;
    }
  }
}

// Initialize the proxy status label
function init() {
  log("Init proxy status");
  try {
    // Remove this listener again
    window.removeEventListener("load", init, true);
    // Initially set the label
    refreshStatus();
    // Add a proxy preferences observer
    prefsHandler.getPrefs().addObserver("extensions.jondofox.proxy.state", 
                               proxyStateObserver, false);
  } catch (e) {
    log("init(): " + e);
  }
}

///////////////////////////////////////////////////////////////////////////////
// Append a JonDoFox customized string to the window's title
///////////////////////////////////////////////////////////////////////////////

// Get the Firefox version
var appInfo = Components.classes['@mozilla.org/xre/app-info;1'].
                            getService(Components.interfaces.nsIXULAppInfo);

// Get both of the version strings and the application's name
var versionPref = "extensions.jondofox.profile_version";
var profileVersion = prefsHandler.getStringPref(versionPref);
var appVersion = appInfo.version;
var appName = appInfo.name;

// Create an appendix for the title string
const titleString = "JonDoFox "+profileVersion+" ("+appName+" "+appVersion+")";
// Log something initially
log("This is " + titleString);

// Set the modifier only
function setTitleModifier() {
  //log("Setting title modifier");
  try {
    // Set the 'titlemodifier' attribute in the current document
    var modAtt = document.documentElement.getAttribute("titlemodifier");
    if (modAtt) {
      document.documentElement.setAttribute("titlemodifier", titleString);
    }
    // XXX: This seems to be not needed
    //document.getElementById("content").updateTitlebar();
  } catch (e) {
    log("setModifier(): " + e);
  }
}

// Init a listener that calls setTitleModifier()
function initTitleListener() {
  log("Init title listener");
  try {
    // This seems to be enough?
    document.getElementById("content").addEventListener("DOMTitleChanged", 
                                          setTitleModifier, false);
    
    // XXX: Also not needed? .. mTabContainer ..
    //gBrowser.addEventListener("DOMNodeInserted", setTitleModifier, true);
    //gBrowser.addEventListener("DOMNodeRemoved", setTitleModifier, true);
  } catch (e) {
    log("initTitleListener(): " + e);
  }
}

// We have a new window
log("New window ..");
// Set the title once when initializing a new window
setTitleModifier();
// Rather use an anonymous function?
window.addEventListener("load", initTitleListener, false);
