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
const statePref = 'extensions.jondofox.proxy.state';
const proxyType = 'network.proxy.type';

// Get the preferences handler
var prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
                                 getService().wrappedJSObject;
    
// Get the proxy manager
var proxyManager = Components.classes['@jondos.de/proxy-manager;1'].
                                 getService().wrappedJSObject;

// Get the JDFManager
var jdfManager = Components.classes['@jondos.de/jondofox-manager;1'].
                                 getService().wrappedJSObject;

// This is called when a proxy is chosen from the popup menu, where
// 'state' is one of --> jondo, tor, custom, none, unknown?
// Set 'conf' to true if the user should need to confirm disabling 
// the proxy, makes only sense in combination with state = 'none'
function setProxy(state, conf) {
  log("Setting proxy to '" + state + "'");
  try {
    // Store the previous state to detect state changes
    var previousState = prefsHandler.getStringPref(statePref);
    if (state == 'none') {
      if (conf) {
        // Request confirmation
        var value = jdfManager.showConfirm(
                    jdfManager.getString('jondofox.dialog.attention'),
                    jdfManager.getString('jondofox.dialog.message.proxyoff'));
        if (value) {
          // Disable the proxy
          disableProxy();
        } else {
          // Reset the state
          log("Resetting state to " + previousState);
          state = previousState;
        }
      } else {
        // 'conf' is false, straight disable
        disableProxy();
      }
    } else {
      // Check the id
      switch (state) {
        case 'jondo':
          // Set proxies for all protocols but SOCKS
          proxyManager.setProxyAll('127.0.0.1', 4001);
          proxyManager.setProxySOCKS('', 0, 5);
          // Set default exceptions
          proxyManager.setExceptions('127.0.0.1, localhost');
          break; 
 
        case 'tor':
          // Set SOCKS proxy only
          proxyManager.setProxySOCKS('127.0.0.1', 9050, 5);
          proxyManager.setSocksRemoteDNS(true);
          proxyManager.setProxyAll('', 0);
          // Set default exceptions
          proxyManager.setExceptions('127.0.0.1, localhost');
          break;

        case 'custom':
          // Set the custom proxy
          var prefix = "extensions.jondofox.custom.";
          proxyManager.setProxyHTTP(
                          prefsHandler.getStringPref(prefix + "http_host"),
                          prefsHandler.getIntPref(prefix + "http_port"));
          proxyManager.setProxySSL(
                          prefsHandler.getStringPref(prefix + "ssl_host"),
                          prefsHandler.getIntPref(prefix + "ssl_port"));
          proxyManager.setProxyFTP(
                          prefsHandler.getStringPref(prefix + "ftp_host"),
                          prefsHandler.getIntPref(prefix + "ftp_port"));
          proxyManager.setProxyGopher(
                          prefsHandler.getStringPref(prefix + "gopher_host"),
                          prefsHandler.getIntPref(prefix + "gopher_port"));
          proxyManager.setProxySOCKS(
                          prefsHandler.getStringPref(prefix + "socks_host"),
                          prefsHandler.getIntPref(prefix + "socks_port"),
                          prefsHandler.getIntPref(prefix + "socks_version"));
          proxyManager.setExceptions(
                         prefsHandler.getStringPref(prefix + "no_proxies_on"));
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

// Disable the proxy and set the state preference
function disableProxy() {
  try {
    // Call disable on the proxy manager
    prefsHandler.setStringPref(statePref, 'none');
    proxyManager.disableProxy();
  } catch (e) {
    log("disableProxy(): " + e);
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
    var state = prefsHandler.getStringPref(statePref);
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
        if (data == proxyType) {
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

// Initialize a new browser window
function initWindow() {
  log("Init new browser window");
  try {
    // Remove this listener again
    window.removeEventListener("load", initWindow, true);
    // Add observers for proxy preferences
    log("Adding proxy state observers");
    prefsHandler.prefs.addObserver(statePref, proxyStateObserver, false);
    prefsHandler.prefs.addObserver(proxyType, proxyStateObserver, false);
    // Initially set the state
    log("Setting initial proxy state ..");
    setProxy(prefsHandler.getStringPref(statePref), false);
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
  log("Open dialog to edit custom proxy");
  try {
    // Give the prefsHandler as argument to the dialog
    var params = {ph:prefsHandler}; // activate:false};
    // Do we need to make it modal, 'modal=yes'?
    window.openDialog("chrome://jondofox/content/dialogs/editcustom.xul",
              "editcustom", "", params);
    
    // XXX: Enable the custom proxy here?
    //log("Activate is " + params.activate);
    //if (params.activate) {
    //  setProxy("custom", false);
    //}

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
