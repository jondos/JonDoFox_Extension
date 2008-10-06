/******************************************************************************
 * Copyright (C) 2008, JonDos GmbH
 * Author: Johannes Renner
 *
 * This code is available on a per window basis.
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

// Dump information to the console?
var mDebug = true;

// Send data to the console if we're in debug mode
// Create 'browser.dom.window.dump.enabled' first!
function log(msg) {
  if (mDebug) dump("JonDoFox :: " + msg + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Proxy stuff
///////////////////////////////////////////////////////////////////////////////

// Get the preferences handler
var prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
                                 getService().wrappedJSObject;
    
// Get the JDFManager
var jdfManager = Components.classes['@jondos.de/jondofox-manager;1'].
                                 getService().wrappedJSObject;

// Preferences that need to be observed for triggering GUI changes
var STATE_PREF = jdfManager.STATE_PREF
var PROXY_PREF = 'network.proxy.type';
var CUSTOM_LABEL = 'extensions.jondofox.custom.label';

// Set the extension into a certain state, pass one of jdfManager.STATE_XXX
function setProxy(state) {
  log("Setting proxy state to '" + state + "'");
  try {
    // Call the underlying method in JDFManager
    if (!jdfManager.setProxy(state)) {
      // If the state didn't change, call refreshStatusbar() by hand
      log("NOT a state change, calling refreshStatusbar() ..");
      refreshStatusbar();
    }
  } catch (e) {
    log("setProxy(): " + e);
  } finally {
    // Hide the 'menupopup'
    document.getElementById('jondofox-proxy-list').hidePopup();
  }
}

// Disable the proxy, but ask the user for confirmation first
function setProxyNone() {
  log("Asking for confirmation ..");
  try {
    // Hide 'menupopup'
    document.getElementById('jondofox-proxy-list').hidePopup();
    // Request user confirmation
    var disable = jdfManager.showConfirm(
                     jdfManager.getString('jondofox.dialog.attention'),
                     jdfManager.getString('jondofox.dialog.message.proxyoff'));
    if (disable) {
      // Call the method above
      setProxy(jdfManager.STATE_NONE);
    } else {
      // Refresh the statusbar
      refreshStatusbar();
    }
  } catch (e) {
    log("setProxyNone(): " + e);
  }
}

// Map the current proxy status to a (localized) string label
function getLabel(state) {
  log("Determine proxy status label for " + state);
  try {
    switch (state) {
      case jdfManager.STATE_NONE:
        return jdfManager.getString('jondofox.statusbar.label.noproxy');

      case jdfManager.STATE_JONDO:
        return jdfManager.getString('jondofox.statusbar.label.jondo');

      case jdfManager.STATE_TOR:
        return jdfManager.getString('jondofox.statusbar.label.tor');

      case jdfManager.STATE_CUSTOM:
        // Return the custom set label if it's not empty
        var l = prefsHandler.getStringPref('extensions.jondofox.custom.label');
        if (l != "") {
          return l;
        } else {
          return jdfManager.getString('jondofox.statusbar.label.custom');
        }

      default:
        log("!! Unknown proxy state: " + state);        
        return jdfManager.getString('jondofox.statusbar.label.unknown');
    }
  } catch (e) {
    log("getLabel(): " + e);
  }
}

// Refresh the statusbar
function refreshStatusbar() {
  log("Refreshing the statusbar");
  try {
    // Get statusbar, state and label respectively
    var statusbar = document.getElementById('jondofox-proxy-status');
    var state = jdfManager.getState();
    var label = getLabel(state);
    // Set the color
    if (state == jdfManager.STATE_NONE) {
      statusbar.style.color = "#F00";
    } else {
      statusbar.style.color = "#390";
    }
    // Set the label to the statusbar
    statusbar.setAttribute('label', label);

    // Set the custom proxy label in the popup menu
    document.getElementById('custom-radio').label = getLabel(jdfManager.
                                                       STATE_CUSTOM);
        
    // Get the radiogroup element and set 'selectedItem'
    var radiogroupElement = document.getElementById("jondofox-radiogroup");
    radiogroupElement.selectedItem = document.getElementById(state + "-radio");
  } catch (e) {
    log("refreshStatusbar(): " + e);
  }
}

///////////////////////////////////////////////////////////////////////////////
// Utility functions
///////////////////////////////////////////////////////////////////////////////

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
// The method 'initWindow()' is called on the 'load' event + observers
///////////////////////////////////////////////////////////////////////////////

// Observer for different preferences
var prefsObserver = {
  // Implement nsIObserver
  observe: function(subject, topic, data) {
    switch (topic) {
      case 'nsPref:changed':
        //log(topic + " --> " + data);        
        // If someone disables the proxy in FF ..
        if (data == PROXY_PREF) {
          if (prefsHandler.getIntPref(PROXY_PREF) == 0 && 
                 jdfManager.getState() != jdfManager.STATE_NONE) {
            log("Detected 'network.proxy.type' == 0, set state to 'none' ..");
            // .. set the state to 'none'
            jdfManager.setState(jdfManager.STATE_NONE);
          }
        } else {
          // STATE_PREF or CUSTOM_LABEL has changed, just refresh the statusbar
          refreshStatusbar();
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
    switch (topic) {
      case 'xul-overlay-merged':
        // 'subject' implements nsIURI
        var uri = subject.QueryInterface(Components.interfaces.nsIURI);
        //log("uri.spec is " + uri.spec);
        if (uri.spec == "chrome://jondofox/content/jondofox-gui.xul") {
          
          // Overlay is ready, add observers for preferences
          log("Overlay ready --> adding preferences observers");
          prefsHandler.prefs.addObserver(STATE_PREF, prefsObserver, false);
          prefsHandler.prefs.addObserver(PROXY_PREF, prefsObserver, false);
          prefsHandler.prefs.addObserver(CUSTOM_LABEL, prefsObserver, false);
          
          // Set the initial proxy state
          // XXX: Rather do this from within jondofox-manager.js?
          log("Setting initial proxy state ..");
          setProxy(jdfManager.getState());
        
        } else {
          log("!! Wrong uri: " + uri.spec);
        }
        break;

      default:
        log("!! Unknown topic: " + topic);
        break;
    }
  }
}

// Initialize a new browser window
function initWindow() {
  log("New browser window ..");
  try {
    // At first remove this listener again
    window.removeEventListener("load", initWindow, true);

    // FIXME: Due to Bug #330458 subsequent calls to loadOverlay do not work. 
    // Few other extensions (CuteMenus) also load overlays dynamically and 
    // therefore cause this call to fail. For further information, please see    
    // http://developer.mozilla.org/en/DOM/document.loadOverlay and
    // https://bugzilla.mozilla.org/show_bug.cgi?id=330458
    // Additionally, loading an overlay with the same URI twice is also not 
    // supported. A polling approach is therefore not practicable.

    // Workaround: Dynamically load the GUI overlay using a timeout of 1000 ms
    var code = 'document.loadOverlay(\"chrome://jondofox/content/' + 
                  'jondofox-gui.xul\", overlayObserver)';
    setTimeout(code, 800);
  } catch (e) {
    log("initWindow(): " + e);
  }
}
