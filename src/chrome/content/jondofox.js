/******************************************************************************
 * Copyright (c) 2008, JonDos GmbH
 * Author: Johannes Renner
 *
 * This code is available on a per window basis. Below are in fact methods for
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
// Proxy stuff
///////////////////////////////////////////////////////////////////////////////

// The proxy state preferences
const STATE_PREF = 'extensions.jondofox.proxy.state';
const PROXY_PREF = 'network.proxy.type';

// Get the preferences handler
var prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
                                 getService().wrappedJSObject;
    
// Get the JDFManager
var jdfManager = Components.classes['@jondos.de/jondofox-manager;1'].
                                 getService().wrappedJSObject;

// Only set 'conf' to true if the user should need to confirm when 
// disabling the proxy (in combination with state = 'none')
function setProxy(state, conf) {
  log("Setting proxy state to '" + state + "'");
  try {
    // Call the underlying method in JDFManager
    if (!jdfManager.setProxy(state, conf)) {
      // If the state didn't change, call refreshStatusbar() by hand
      log("NOT a state change, calling refreshStatusbar() ..");
      refreshStatusbar();
    }
  } catch (e) {
    log("setProxy(): " + e);
  }
}

// Map the current proxy status to a (localized) string label
function getLabel(state) {
  log("Determine proxy-status label");
  try {
    switch (state) {
      case 'none':
        return jdfManager.getString('jondofox.statusbar.label.noproxy');

      case 'jondo':
        return jdfManager.getString('jondofox.statusbar.label.jondo');

      case 'tor':
        return jdfManager.getString('jondofox.statusbar.label.tor');

      case 'custom':
        return jdfManager.getString('jondofox.statusbar.label.custom');

      default:
        log("!! Unknown proxy state: " + state);        
        return jdfManager.getString('jondofox.statusbar.label.unknown');
    }
  } catch (e) {
    log("getLabel(): " + e);
  }
}

// Refresh the statusbar label and checkboxes
function refreshStatusbar() {
  log("Refreshing the statusbar");
  try {
    // Get statusbar, state and label
    var statusbar = document.getElementById('jondofox-proxy-status');
    var state = prefsHandler.getStringPref(STATE_PREF);
    var label = getLabel(state);
    // Set the color
    if (state == 'none') {
      statusbar.style.color = "#F00";
    } else {
      statusbar.style.color = "#390";
    }
    // Set the label to the statusbar
    statusbar.setAttribute('label', label);

    // Handle the popup list
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
        //log(topic + " --> " + data);        
        // If someone disables the proxy in FF ..
        if (data == PROXY_PREF) {
          if (prefsHandler.getIntPref(PROXY_PREF) == 0 && 
                 prefsHandler.getStringPref(STATE_PREF) != 'none') {
            log("Detected 'network.proxy.type' == 0, set state to 'none' ..");
            // .. set the state to 'none'
            prefsHandler.setStringPref(STATE_PREF, 'none')
          }
        } else {
          // STATE_PREF has changed, refresh the status
          refreshStatusbar();
        }
        break;

      default:
        log("!! Unknown topic " + topic);
        break;
    }
  }
}

// Initialize a new browser window
function initWindow() {
  log("Init new browser window");
  try {
    // Remove this listener again
    window.removeEventListener("load", initWindow, true);
    // Add observers for proxy preferences
    log("Adding proxy state observers");
    prefsHandler.prefs.addObserver(STATE_PREF, proxyStateObserver, false);
    prefsHandler.prefs.addObserver(PROXY_PREF, proxyStateObserver, false);
    
    // Initially set the proxy state
    // TODO: Do this from within jondofox-manager.js?
    log("Setting initial proxy state ..");
    setProxy(prefsHandler.getStringPref(STATE_PREF), false);

  } catch (e) {
    log("initWindow(): " + e);
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

// Open dialog to edit custom proxy settings
function editCustomProxy() {
  log("Open dialog 'edit custom proxy'");
  try {
    // No parameters needed
    window.openDialog("chrome://jondofox/content/dialogs/editcustom.xul", 
              "editcustom", "");
  } catch (e) {
    log("editCustomProxy(): " + e);
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

// FIXME: This does not work on Macs
// Set the title modifier
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
