/******************************************************************************
 * Copyright (c) 2008, JonDos GmbH
 * Author: Johannes Renner
 *
 * This code is available on a per window basis. These are in fact methods for
 * controlling proxy behavior and setting the customized window title.
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
// Utils
///////////////////////////////////////////////////////////////////////////////

// Load localization strings
function getStringBundle() {
  try {
    var bundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].
                           getService(Components.interfaces.
                              nsIStringBundleService);
    var stringBundle = bundleService.createBundle(
                          "chrome://jondofox/locale/jondofox.properties");
    return stringBundle;
  } catch (e) {
    log("getStringBundle(): " + e);
  }
}

///////////////////////////////////////////////////////////////////////////////
// Proxy stuff
///////////////////////////////////////////////////////////////////////////////

// The proxy state preference
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
    prefsHandler.setStringPref(statePref, 'none');
    proxyManager.disableProxy();
  } catch (e) {
    log("disableProxy(): " + e);
  }
}

// This could happen on a double-click in the statusbar:
// Toggle the proxy according to its current state
// XXX: (Currently never called)
function toggleProxy() {
  log("Toggling Proxy ..");
  try {
    // Get the current status
    var state = proxyManager.getProxyState();
    if (state > 0) {
      // Let the user confirm
      if (confirmProxyOff()) {
        disableProxy();
      }
    } else {
      // Set the proxy to JonDo
      setProxy('jondo', false);
    }
  } catch (e) {
    log("toggleProxy(): " + e);
  }
}

// Return 'true' if the user clicked Ok, else return 'false'
function confirmProxyOff() {
  try {
    // 'ret' is an array
    var ret = {value: false};
    window.openDialog("chrome://jondofox/content/dialogs/proxy-warning.xul",
              "Proxy Alert", "modal, centerscreen, close=no", ret);
    return ret.value;
  } catch (e) {
    log("confirmProxyOff(): " + e);
  }
}

// This is called when a proxy is chosen from the popup menu
// ['state' --> jondo, tor, custom, none, unknown?]
// Set 'conf' to true if the user should need to confirm disabling the proxy
function setProxy(state, conf) {
  log("Setting proxy to " + state);
  try {
    // Store the previous state to detect if the state didn't change
    var previousState = prefsHandler.getStringPref(statePref);
    if (state == 'none') {
      if (conf) {
        // Let the user confirm this
        var value = confirmProxyOff();
        if (value) {
          // Disable the proxy
          disableProxy();
        } else {
          // Reset the state
          log("Resetting state to " + previousState);
          state = previousState;
        }
      } else {
        // 'ask' is false, straight disable
        disableProxy();
      }
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
      // Set the state first and then enable
      prefsHandler.setStringPref(statePref, state);          
      proxyManager.enableProxy();
    }
    // If the state didn't change, call refreshStatusbar() by hand
    if (previousState == state) {
      log("NOT a state change, calling refreshStatusbar() ..");
      refreshStatusbar();
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
    // Get the stringbundle
    var strings = getStringBundle();
    switch (state) {
      case 'none':
        return strings.GetStringFromName('jondofox.statusbar.label.noproxy');

      case 'jondo':
        return strings.GetStringFromName('jondofox.statusbar.label.jondo');

      case 'tor':
        return strings.GetStringFromName('jondofox.statusbar.label.tor');

      case 'custom':
        return strings.GetStringFromName('jondofox.statusbar.label.custom');

      default:
        log("!! Unknown proxy state: " + state);        
        return strings.GetStringFromName('jondofox.statusbar.label.unknown');
    }
  } catch (e) {
    log("getLabel(): " + e);
  }
}

// Refresh the statusbar label and checkboxes
function refreshStatusbar() {
  log("Refreshing the statusbar");
  try {
    // Get and set the label
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
    log("refreshStatusbar(): " + e);
  }
}

// Observe 'extensions.jondofox.proxy.state'
var proxyStateObserver = {
  // Implement nsIObserver
  observe: function(subject, topic, data) {
    switch (topic) {
      case 'nsPref:changed':
        // The proxy state has changed
        log(topic + " --> " + data);        
        // If someone disables the proxy in FF ..
        if (data == 'network.proxy.type') {
          if (proxyManager.getProxyState() == 0 && 
                 prefsHandler.getStringPref(statePref) != 'none') {
            log("Detected 'network.proxy.type' == 0, set state to 'none' ..");
            // .. set the state to 'none'
            prefsHandler.setStringPref(statePref, 'none')
          }
        } else {
          // 'statePref' has changed, refresh the status
          refreshStatusbar();
        }
        break;

      default:
        log("!! Unknown topic " + topic);
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
    // Add a proxy preferences observer
    log("Adding proxy state observers");
    prefsHandler.getPrefs().addObserver(statePref, proxyStateObserver, false);
    prefsHandler.getPrefs().addObserver("network.proxy.type", 
                               proxyStateObserver, false);
    // Initially set the state
    log("Setting initial proxy state");
    setProxy(prefsHandler.getStringPref(statePref), false);
  } catch (e) {
    log("init(): " + e);
  }
}

// Open up the anontest in a new tab of the current window
function openTabAnontest() {
  try {
    var win = Components.classes['@mozilla.org/appshell/window-mediator;1'].
                         getService(Components.interfaces.nsIWindowMediator).
                         getMostRecentWindow('navigator:browser');
    win.openUILinkIn('https://www.jondos.de/anontest', 'tab');
  } catch (e) {
    log("openTabAnontest(): " + e);
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

// Set the title modifier
// FIXME: This does not work on Macs
function setTitleModifier() {
  //log("Setting title modifier");
  try {
    // Set the 'titlemodifier' attribute in the current document
    var modAtt = document.documentElement.getAttribute("titlemodifier");
    if (modAtt) {
      document.documentElement.setAttribute("titlemodifier", titleString);
    }
    // This throws an exception if this.docShell is not set
    if (this.docShell) {
      //log("'this.docShell' is not null");
      document.getElementById("content").updateTitlebar();
    }
  } catch (e) {
    log("setTitleModifier(): " + e);
  }
}

// Init a listener that calls setTitleModifier()
function initTitleListener() {
  log("Init title listener");
  try {
    // This seems to be enough?
    document.getElementById("content").addEventListener("DOMTitleChanged", 
                                          setTitleModifier, false);
    
    // XXX: Not needed? .. mTabContainer ..
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
