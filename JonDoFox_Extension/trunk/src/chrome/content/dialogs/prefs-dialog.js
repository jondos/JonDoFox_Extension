/******************************************************************************
 * Copyright (c) 2009, Johannes Renner
 *
 * Preferences dialog javascript code
 *****************************************************************************/

// Indices of the single tabs
const TABINDEX_GENERAL = 0;
const TABINDEX_CUSTOMPROXY = 1;

// Set the prefs handler, it will be needed
var prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
    getService().wrappedJSObject;

// JonDoFox-Manager is used for setting the proxy to custom
var jdfManager = Components.classes['@jondos.de/jondofox-manager;1'].
    getService().wrappedJSObject;

// Prefix for custom proxy settings
var prefix = "extensions.jondofox.custom.";

// Define a log method 
function log(msg) {
  dump("Dialog :: " + msg + "\n");
}

// Separately load the prefs into both tabs
function onLoad() {
  log("Init dialog, loading values ..");
  try {
    loadPrefsGeneral();
    loadPrefsCustomProxy();
  } catch (e) {
    log("onLoad(): " + e);    
  }
}

// Load general preferences into the dialog
function loadPrefsGeneral() {
  log("Loading general preferences");
  try {
    // 'set-referrer' is a checkbox
    document.getElementById('set-referrer').checked = 
        prefsHandler.getBoolPref('extensions.jondofox.set_referrer');
    // 'no_proxies_on'
    document.getElementById('no_proxies_on').value = 
        prefsHandler.getStringPref('extensions.jondofox.no_proxies_on');
  } catch (e) {
    log("loadPrefsGeneral(): " + e);    
  }
}

// Write the general preferences
function writePrefsGeneral() {
  log("Write prefs general");
  try {
    prefsHandler.setBoolPref('extensions.jondofox.set_referrer',
        document.getElementById('set-referrer').checked);
    prefsHandler.setStringPref('extensions.jondofox.no_proxies_on',
        document.getElementById('no_proxies_on').value);
  } catch (e) {
    log("writePrefsGeneral(): " + e);
  }
}
 
// Load custom proxy preferences into the dialog
function loadPrefsCustomProxy() {
  log("Loading custom proxy preferences");
  try {
    // Get the custom proxy label
    var label = prefsHandler.getStringPref(prefix + 'label');    
    if (label == "") {
      // If label is empty, get the default label
      label = jdfManager.getString('jondofox.statusbar.label.custom');
    }
    // Set the label to the textfield
    document.getElementById('custom-label').value = label;
    // Get host and port settings for different protocols
    document.getElementById('http_host').value = 
        prefsHandler.getStringPref(prefix + 'http_host');
    document.getElementById('http_port').value = 
        prefsHandler.getIntPref(prefix + 'http_port');
    document.getElementById('ssl_host').value = 
        prefsHandler.getStringPref(prefix + 'ssl_host');
    document.getElementById('ssl_port').value = 
        prefsHandler.getIntPref(prefix + 'ssl_port'); 
    document.getElementById('ftp_host').value = 
        prefsHandler.getStringPref(prefix + 'ftp_host');
    document.getElementById('ftp_port').value = 
        prefsHandler.getIntPref(prefix + 'ftp_port');
    document.getElementById('gopher_host').value = 
        prefsHandler.getStringPref(prefix + 'gopher_host');
    document.getElementById('gopher_port').value = 
        prefsHandler.getIntPref(prefix + 'gopher_port'); 
    document.getElementById('socks_host').value = 
        prefsHandler.getStringPref(prefix + 'socks_host');
    document.getElementById('socks_port').value = 
        prefsHandler.getIntPref(prefix + 'socks_port');        
    // Get socks version
    var version = prefsHandler.getIntPref(prefix + 'socks_version');
    if (version == 4) {
      document.getElementById('socks_version').selectedItem = 
          document.getElementById('version4');
    } else {
      document.getElementById('socks_version').selectedItem = 
          document.getElementById('version5');
    }
    // Get 'all_protocols' and enable/disable components
    document.getElementById('checkbox_all_protocols').checked = 
        prefsHandler.getBoolPref(prefix + 'all_protocols');
    allProtocols();
  } catch (e) {
    log("loadPrefsCustomProxy(): " + e);
  }
}

// Store the values
function writePrefsCustomProxy() {
  log("Write prefs custom proxy"); 
  try {
    // Set the label
    prefsHandler.setStringPref(prefix + 'label',
        document.getElementById('custom-label').value);
    // Set single proxies
    prefsHandler.setStringPref(prefix + 'http_host', 
        document.getElementById('http_host').value);
    prefsHandler.setIntPref(prefix + 'http_port', 
        document.getElementById('http_port').value);
    prefsHandler.setStringPref(prefix + 'ssl_host', 
        document.getElementById('ssl_host').value);
    prefsHandler.setIntPref(prefix + 'ssl_port', 
        document.getElementById('ssl_port').value);
    prefsHandler.setStringPref(prefix + 'ftp_host', 
        document.getElementById('ftp_host').value);
    prefsHandler.setIntPref(prefix + 'ftp_port', 
        document.getElementById('ftp_port').value);
    prefsHandler.setStringPref(prefix + 'gopher_host', 
        document.getElementById('gopher_host').value);
    prefsHandler.setIntPref(prefix + 'gopher_port', 
        document.getElementById('gopher_port').value);
    prefsHandler.setStringPref(prefix + 'socks_host', 
        document.getElementById('socks_host').value);
    prefsHandler.setIntPref(prefix + 'socks_port', 
        document.getElementById('socks_port').value);        
    // Set socks version
    prefsHandler.setIntPref(prefix + 'socks_version', 
        document.getElementById('socks_version').selectedItem.value);
    // Set all protocols
    prefsHandler.setBoolPref(prefix + 'all_protocols', 
        document.getElementById('checkbox_all_protocols').checked);
  } catch (e) {
    log("writePrefsCustomProxy(): " + e);
  }
}

// This is called on clicking the 'accept'-button
function onAccept() {
  try {
    // Store all preferences
    writePrefsGeneral();
    writePrefsCustomProxy();
    // If the current state is 'custom': reset it
    if (prefsHandler.getStringPref('extensions.jondofox.proxy.state') == 
        'custom') {
      setProxyCustom();
    }
  } catch (e) {
    log("onAccept(): " + e);
  }
  // Return true in any case for closing the window
  return true;
}

// Apply preferences from the current tab
function onApply() {
  try {
    // Get the index of the currently selected tab
    var index = document.getElementById('tab-box').selectedIndex;
    // Call the respective write-method
    if (index == TABINDEX_GENERAL) {
      writePrefsGeneral();
    } else if (index == TABINDEX_CUSTOMPROXY) {
      writePrefsCustomProxy();
      setProxyCustom();
    } else {
      // Should not happen
      log("Crazy index: " + index);
    }
  } catch (e) {
    log("onApply(): " + e);
  }
}

// Set the proxy state to 'custom'
function setProxyCustom() {
  try {
    // Enable the custom proxy using jdfManager
    jdfManager.setProxy('custom');
  } catch (e) {
    log("setProxyCustom(): " + e);
  }
}

// Use proxy server for all protocols 
function allProtocols() { 
  try {
    if (document.getElementById('checkbox_all_protocols').checked) {
      var host = document.getElementById("http_host").value;
      var port = document.getElementById("http_port").value;

      document.getElementById("ssl_host").value = host;
      document.getElementById("ssl_port").value = port;
      document.getElementById("ssl_host").disabled = true;
      document.getElementById("ssl_port").disabled = true;

      document.getElementById("ftp_host").value = host;
      document.getElementById("ftp_port").value = port;
      document.getElementById("ftp_host").disabled = true;
      document.getElementById("ftp_port").disabled = true;

      document.getElementById("gopher_host").value = host;
      document.getElementById("gopher_port").value = port;
      document.getElementById("gopher_host").disabled = true;
      document.getElementById("gopher_port").disabled = true;

      document.getElementById("socks_host").value = host;
      document.getElementById("socks_port").value = port;
      document.getElementById("socks_host").disabled = true;
      document.getElementById("socks_port").disabled = true;
    } else {
      // Enable all components
      document.getElementById("ssl_host").disabled = false;
      document.getElementById("ssl_port").disabled = false;
      document.getElementById("ftp_host").disabled = false;
      document.getElementById("ftp_port").disabled = false;
      document.getElementById("gopher_host").disabled = false;
      document.getElementById("gopher_port").disabled = false;
      document.getElementById("socks_host").disabled = false;
      document.getElementById("socks_port").disabled = false;
    } 
  } catch (e) {
    log("allProtocols(): " + e);
  } 
}

// Enable/disable certain dialog elements
// XXX: Currently not needed
function enableOptions() {
  log("Enable/disable elements");
  // Get the type of configuration
  var type = document.getElementById("proxy-configuration-type");
  // Disable is true iff automatic configuration is enabled
  var disable = !(type.value == "1");
  // Set the radio button
  if (disable) {
    type.selectedItem = document.getElementById("auto-configuration");
  } else {
    type.selectedItem = document.getElementById("manual-configuration");
  }
  // TODO: Disable textfields
}

