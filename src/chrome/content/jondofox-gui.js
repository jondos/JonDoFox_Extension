/******************************************************************************
 * Copyright (C) 2008, JonDos GmbH
 * Author: Johannes Renner
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

///////////////////////////////////////////////////////////////////////////////
// Proxy stuff
///////////////////////////////////////////////////////////////////////////////

// Get the preferences handler
var prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
                                 getService().wrappedJSObject;
    
// Get the JDFManager
var jdfManager = Components.classes['@jondos.de/jondofox-manager;1'].
                                 getService().wrappedJSObject;

// Get the utility Object
var jdfUtils = Components.classes['@jondos.de/jondofox-utils;1'].
                               getService().wrappedJSObject;

var prefix = "extensions.jondofox.custom.";

// Preferences that need to be observed for triggering GUI changes
var STATE_PREF = jdfManager.STATE_PREF;
var PROXY_PREF = 'network.proxy.type';
var CUSTOM_LABEL = 'extensions.jondofox.custom.label';
var EMPTY_PROXY = 'extensions.jondofox.custom.empty_proxy';

// Set the extension into a certain state, 
// pass one of the jdfManager.STATE_XXXs
function setProxy(state) {
  log("Started helper function for setting proxy state to '" + state + "'");
  try {
    // Call the underlying method in JDFManager
    if (!jdfManager.setProxy(state)) {
      // If the state didn't change, call refresh() by hand
      log("NOT a state change, calling refresh() ..");
      refresh();
    } else {
      // The state has changed --> set the user agent and clear cookies
      jdfManager.setUserAgent(state);
      jdfManager.clearAllCookies();
     }
  } catch (e) {
    log("setProxy(): " + e);
  } finally {
    // Actively hide the 'menupopup'
    document.getElementById('jondofox-proxy-list').hidePopup();
  }
}

// Disable the proxy and ask the user for confirmation first
function setProxyNone() {
  try {
    // Hide 'menupopup'
    document.getElementById('jondofox-proxy-list').hidePopup();
    // Request user confirmation if she has not disabled the warning
    var disable;
    if (!prefsHandler.getBoolPref('extensions.jondofox.proxy_warning')) {
      disable = true; 
    }
    else {  
      log("Asking for confirmation ..");
      disable = jdfUtils.showConfirmCheck(jdfUtils.
                  getString('jondofox.dialog.warning'), jdfUtils.
                  getString('jondofox.dialog.message.proxyoff'), 'proxy');
    }
    if (disable) {
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
  var disable;
  log("Check whether there is a proxy set at all ..");
  try {
    // Hide 'menupopup'
    document.getElementById('jondofox-proxy-list').hidePopup();
    //Check whether one of the relevant preferences is zero
    
    if (prefsHandler.getBoolPref(prefix + 'empty_proxy')) {
      if (!prefsHandler.getBoolPref('extensions.jondofox.proxy_warning')) {
        disable = true; 
      }
      else {
        // Request user confirmation
        disable = jdfUtils.showConfirmCheck(jdfUtils.
          getString('jondofox.dialog.warning'), jdfUtils.
          getString('jondofox.dialog.message.nocustomproxy'), 'proxy');
      }
      if (disable) {
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
// to activate it...

function isProxyDisabled() {
  if (prefsHandler.getBoolPref('extensions.jondofox.proxy_warning')) {
    if (jdfManager.getState() == jdfManager.STATE_NONE) {
      jdfUtils.showAlertCheck(jdfUtils.
        getString('jondofox.dialog.attention'), jdfUtils.
        getString('jondofox.dialog.message.proxyoff'), 'proxy');
    }
    else if (jdfManager.getState() == jdfManager.STATE_CUSTOM) {
      if (prefsHandler.getBoolPref(prefix + 'empty_proxy')) {
        jdfUtils.showAlertCheck(jdfUtils.
          getString('jondofox.dialog.attention'), jdfUtils.
          getString('jondofox.dialog.message.nocustomproxy'), 'proxy');
      }
    }
  }
}

// Map the current proxy status to a (localized) string label,
// pass one of the jdfManager.STATE_XXXs here
function getLabel(state) {
  //log("Determine proxy status label for " + state);
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
  log("Refreshing the statusbar");
  try {
    // Get state, label and statusbar respectively
    var state = jdfManager.getState();
    var label = getLabel(state);
    var statusbar = document.getElementById('jondofox-proxy-status');
    var emptyCustomProxy = prefsHandler.getBoolPref(prefix + 'empty_proxy');
    // Set the text color; if we have proxy state custom and an empty proxy
    // then change the text color as well...
    if (state == jdfManager.STATE_NONE || 
        (state == jdfManager.STATE_CUSTOM && emptyCustomProxy)) {
      statusbar.style.color = "#F00";
    } else {
      statusbar.style.color = "#000";
    }
    // Set the label to the statusbar
    statusbar.setAttribute('label', label);

    // Set the custom proxy label in the popup menu
    document.getElementById('custom-radio').label = getLabel(jdfManager.
                                                       STATE_CUSTOM);
        
    // Get the radiogroup element and set 'selectedItem'
    var radiogroupElement = document.getElementById("jondofox-radiogroup");
    radiogroupElement.selectedItem = document.getElementById(state + "-radio");

    // Refresh context menu: Set the label of 'bypass-proxy'
    document.getElementById('bypass-proxy').label = jdfUtils.
       formatString("jondofox.contextmenu.bypass.label", [label]);
  } catch (e) {
    log("refresh(): " + e);
  }
}

// Return false if state is NONE or CUSTOM with no valid proxy
// else true (called from jondofox-overlay.xul)
function isProxyActive() {
  //log("Checking if proxy is active");
    var customAndDisabled = jdfManager.getState() == jdfManager.STATE_CUSTOM &&
	prefsHandler.getBoolPref(prefix + 'empty_proxy');
  return (jdfManager.getState() != jdfManager.STATE_NONE && !customAndDisabled);
}

///////////////////////////////////////////////////////////////////////////////
// Utility functions
///////////////////////////////////////////////////////////////////////////////

// Open up the anontest in a new tab of the current window
function openBrowserTabAnontest() {
  try {
    var win = Components.classes['@mozilla.org/appshell/window-mediator;1'].
                 getService(Components.interfaces.nsIWindowMediator).
                 getMostRecentWindow('navigator:browser');
    win.openUILinkIn(jdfUtils.getString('jondofox.anontest.url'), 'tab');
  } catch (e) {
    log("openBrowserTabAnontest(): " + e);
  }
}

// Open up the jondofox homepage in a new tab of the current window
function openBrowserTabJondofox(update) {
  try {
    var win = Components.classes['@mozilla.org/appshell/window-mediator;1'].
                 getService(Components.interfaces.nsIWindowMediator).
                 getMostRecentWindow('navigator:browser');
    if (update) {
      win.openUILinkIn(jdfUtils.getString('jondofox.homepage.download'), 'tab');
    } else {
      win.openUILinkIn("about:jondofox", 'tab');
    }
  } catch (e) {
    log("openBrowserTabJondofox(): " + e);
  }
}

// Open dialog to edit preferences
function openDialogPreferences() {
  log("Open dialog 'JonDoFox-Preferences'");
  try {
    // No additional parameters needed
    window.openDialog("chrome://jondofox/content/dialogs/prefs-dialog.xul",
              "prefs-dialog", "");
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
            jdfManager.setUserAgent(jdfManager.STATE_NONE);
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
    switch (topic) {
      case 'xul-overlay-merged':
        // 'subject' implements nsIURI
        var uri = subject.QueryInterface(Components.interfaces.nsIURI);
        //log("uri.spec is " + uri.spec);
        if (uri.spec == "chrome://jondofox/content/jondofox-gui.xul") {          
          // Overlay is ready --> refresh the GUI
	  refresh();
          // Add observer to different preferences
          prefsHandler.prefs.addObserver(STATE_PREF, prefsObserver, false);
          prefsHandler.prefs.addObserver(PROXY_PREF, prefsObserver, false);
          prefsHandler.prefs.addObserver(CUSTOM_LABEL, prefsObserver, false);

          //We need to obser ve this preference because otherwise there would be
          //no refreshing of the status bar if we had already 'custom' as a
          //our proxy state: the correct writing of 'custom' with either red
          //or black letters would not work if we accepted or applied new
          //settings.

          prefsHandler.prefs.addObserver(EMPTY_PROXY, prefsObserver, false);
                  
          log("New window is ready");
          //Let's test whether the user starts with appropriate proxy-settings..
          isProxyDisabled();

          // Get the last version property
          var last_version = prefsHandler.
                 getStringPref('extensions.jondofox.last_version');
          if (last_version != jdfManager.VERSION) {
            log("New version detected, opening homepage ..");
            openBrowserTabJondofox(false);
            prefsHandler.setStringPref('extensions.jondofox.last_version',
                 jdfManager.VERSION);
            if (!prefsHandler.getBoolPref(
                'extensions.jondofox.noscript_showDomain')) {
              prefsHandler.setBoolPref('noscript.showDomain', false);
            }
          }
          // If the user should update the profile and has not disabled the 
          // update warning, help her and show the JonDoFox homepage after 
          // startup
          if (jdfManager.checkProfileUpdate()) {
	    openBrowserTabJondofox(true);
          } 
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
    // Remove this listener
    window.removeEventListener("load", initWindow, true);
    // FIXME: Due to bug #330458 subsequent calls to loadOverlay() do not work. 
    // Few other extensions (CuteMenus) also load overlays dynamically and can
    // therefore cause this call to fail. For further information, please see    
    // http://developer.mozilla.org/en/DOM/document.loadOverlay and
    // https://bugzilla.mozilla.org/show_bug.cgi?id=330458
    // Additionally, loading an overlay with the same URI twice is also not 
    // supported. A polling approach is therefore not practicable.

    // Possible workaround: Dynamically load the GUI overlay using a timeout
    //var code = 'document.loadOverlay(\"chrome://jondofox/content/' + 
    //           'jondofox-gui.xul\", overlayObserver)';
    //setTimeout(code, 800);

    // This should work unexceptionally if bug #330458 is fixed:
    document.loadOverlay('chrome://jondofox/content/jondofox-gui.xul', 
                overlayObserver);
  } catch (e) {
    log("initWindow(): " + e);
  }
}
