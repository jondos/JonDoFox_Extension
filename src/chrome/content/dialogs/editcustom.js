// Set the prefs handler, it will be needed
var prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
                                 getService().wrappedJSObject;

// Set the prefs handler, it will be needed
var jdfManager = Components.classes['@jondos.de/jondofox-manager;1'].
                                 getService().wrappedJSObject;

// Prefix for custom proxy settings
var prefix = "extensions.jondofox.custom.";

// Define a log method 
function log(msg) {
  dump("Dialog :: " + msg + "\n");
}
    
// Load values into the dialog's elements
function onLoad() {
  log("Init dialog, loading values ..");
  try {       
    // Get the label of the custom proxy
    var label = prefsHandler.getStringPref(prefix + 'label');    
    if (label == "") {
      // If label is empty, get the default label ..
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
    // Get 'no_proxies_on'
    document.getElementById('no_proxies_on').value = 
                prefsHandler.getStringPref(prefix + 'no_proxies_on');
  } catch (e) {
    log("initDialog(): " + e);
  }     
}
   
// Store the values
function storeValues() {
  log("Store values"); 
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
                    document.getElementById('socks_version').
                       selectedItem.value);
    // Set exceptions
    prefsHandler.setStringPref(prefix + 'no_proxies_on', 
                    document.getElementById('no_proxies_on').value);
  } catch (e) {
    log("storeValues(): " + e);
  }
}

// This is called on clicking the 'accept'-button
function onAccept() {
  try {
    // Store values
    storeValues();
    // If the current state is 'custom', reset the state
    if (prefsHandler.getStringPref('extensions.jondofox.proxy.state') == 
           'custom') {
      enable();
    }
  } catch (e) {
    log("onAccept(): " + e);
  }
  // Return true in any case to close the window
  return true;
}

// Apply configuration
function onApply() {
  try {
    // Store the configuration
    storeValues();
    enable();
  } catch (e) {
    log("onApply(): " + e);
  }
}

// Set the proxy state to 'custom'
function enable() {
  try {
    // Enable the custom proxy from jdfManager
    jdfManager.setProxy('custom');
  } catch (e) {
    log("enable(): " + e);
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
