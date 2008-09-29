/******************************************************************************
 * Copyright (C) 2008, JonDos GmbH
 * Author: Johannes Renner
 *
 * This code is available on a per window basis. Below are methods for 
 * controlling the proxy behavior.
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

// Preferences that need to be observed
var PROXY_PREF = 'network.proxy.type';
var CUSTOM_LABEL = 'extensions.jondofox.custom.label';

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

// Refresh the statusbar label and checkboxes
function refreshStatusbar() {
  log("Refreshing the statusbar");
  try {
    // Get statusbar, state and label
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
    document.getElementById('custom-menuitem').label = 
                getLabel(jdfManager.STATE_CUSTOM);
        
    // Get the single checkbox elements and .. 
    var proxyList = document.getElementById('jondofox-proxy-list');
    var items = proxyList.getElementsByAttribute('type', 'checkbox');
    // .. uncheck all but the selected one
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
  
// FIXME: Unfinished method to bypass the proxy when performing a download
function bypassProxy() {
  log("Bypassing proxy");
  try {
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes['@mozilla.org/filepicker;1'].
                           createInstance(nsIFilePicker);
    fp.init(window, "Bypass Proxy and Save Target As...", 
               nsIFilePicker.modeSave);
    // Open the dialog and get the result
    var result = fp.show();
    if (result == nsIFilePicker.returnOK) {
      var theFile = fp.file;
      
      log("The file is " + theFile);
      log("popupNode is " + document.popupNode);
      var objURI = Components.classes["@mozilla.org/network/io-service;1"].
                      getService(Components.interfaces.nsIIOService).newURI(
                         document.popupNode, null, null);

      // TODO: Download the file while bypassing the proxy
      var persist = Components.classes["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].
                       createInstance(Components.interfaces.nsIWebBrowserPersist);
      // Call addDownload()
      // Set the progressListener to the returned download object
      persist.saveURI(objURI, null, null, null, "", theFile);
    }
  } catch (e) {
    log("bypassProxy(): " + e);
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
                 jdfManager.getState() != jdfManager.STATE_NONE) {
            log("Detected 'network.proxy.type' == 0, set state to 'none' ..");
            // .. set the state to 'none'
            jdfManager.setState(jdfManager.STATE_NONE);
          }
        } else {
          // STATE_PREF or CUSTOM_LABEL has changed, refresh the status
          refreshStatusbar();
        }
        break;

      default:
        log("!! Unknown topic " + topic);
        break;
    }
  }
}

///////////////////////////////////////////////////////////////////////////////
// The method initWindow() is called on the 'load' event
///////////////////////////////////////////////////////////////////////////////

// This overlay observer belongs to the init process
var overlayObserver = {
  // Implement nsIObserver
  observe: function(subject, topic, data) {
    switch (topic) {
      case 'xul-overlay-merged':
        // subject implements nsIURI
        var uri = subject.QueryInterface(Components.interfaces.nsIURI);
        //log("uri.spec is " + uri.spec);
        if (uri.spec == "chrome://jondofox/content/jondofox-gui.xul") {
          
          // Overlay is ready, add observers for proxy preferences
          log("Overlay ready --> adding proxy state observers");
          prefsHandler.prefs.addObserver(jdfManager.STATE_PREF, 
                                proxyStateObserver, false);
          prefsHandler.prefs.addObserver(PROXY_PREF, 
                                proxyStateObserver, false);
          prefsHandler.prefs.addObserver(CUSTOM_LABEL,
                                proxyStateObserver, false);
          // Set the initial proxy state
          // TODO: Do this from within jondofox-manager.js?
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
    // Load the overlay
    document.loadOverlay("chrome://jondofox/content/jondofox-gui.xul", 
                            overlayObserver);
  } catch (e) {
    log("initWindow(): " + e);
  }
}
