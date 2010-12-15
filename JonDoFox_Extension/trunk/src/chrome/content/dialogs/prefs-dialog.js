/******************************************************************************
 * Copyright (c) 2009-2010, Johannes Renner, Georg Koppen
 *
 * Preferences dialog javascript code
 *****************************************************************************/

// Indices of the single tabs
const TABINDEX_GENERAL = 0;
const TABINDEX_CUSTOMPROXY = 1;

// Set the prefs handler, it will be needed
var prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
    getService().wrappedJSObject;

// Set the proxy manager (only for setting proxy exceptions)
// TODO: Set proxies using the proxy manager and do not edit prefs directly
var proxyManager = Components.classes['@jondos.de/proxy-manager;1'].
    getService().wrappedJSObject;

// JonDoFox-Manager is used for setting the proxy to custom
var jdfManager = Components.classes['@jondos.de/jondofox-manager;1'].
    getService().wrappedJSObject;

var jdfUtils = Components.classes['@jondos.de/jondofox-utils;1'].
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
    loadPrefsCustomProxy(true);
  } catch (e) {
    log("onLoad(): " + e);    
  }
}

// Load general preferences into the dialog
function loadPrefsGeneral() {
  log("Loading general preferences");
  try {
    // 'set_referrer' is a checkbox
    document.getElementById('checkbox_set_referrer').checked = 
        prefsHandler.getBoolPref('extensions.jondofox.set_referrer');
    // SafeCache's setting
    document.getElementById('checkbox_set_safecache').checked =
        prefsHandler.
	getBoolPref('extensions.jondofox.stanford-safecache_enabled');
    // Certificate Patrol setting
    document.getElementById('checkbox_set_certpatrol').checked = 
        prefsHandler.getBoolPref('extensions.jondofox.certpatrol_enabled');
    // the warnings are checkboxes as well
    document.getElementById('checkbox_update_warning').checked =
        prefsHandler.getBoolPref('extensions.jondofox.update_warning');
    document.getElementById('checkbox_preferences_warning').checked =
        prefsHandler.getBoolPref('extensions.jondofox.preferences_warning'); 
    document.getElementById('checkbox_proxy_warning').checked =
        prefsHandler.getBoolPref('extensions.jondofox.proxy_warning');
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
        document.getElementById('checkbox_set_referrer').checked);
    prefsHandler.setBoolPref('extensions.jondofox.stanford-safecache_enabled',
        document.getElementById('checkbox_set_safecache').checked); 
    prefsHandler.setBoolPref('extensions.jondofox.certpatrol_enabled',
        document.getElementById('checkbox_set_certpatrol').checked);
    // Now the settings concerning different warnings
    prefsHandler.setBoolPref('extensions.jondofox.update_warning',
        document.getElementById('checkbox_update_warning').checked);
    prefsHandler.setBoolPref('extensions.jondofox.preferences_warning',
        document.getElementById('checkbox_preferences_warning').checked);
    prefsHandler.setBoolPref('extensions.jondofox.proxy_warning',
        document.getElementById('checkbox_proxy_warning').checked);
    // Setting 'no_proxies_on'
    prefsHandler.setStringPref('extensions.jondofox.no_proxies_on',
        document.getElementById('no_proxies_on').value);
  } catch (e) {
    log("writePrefsGeneral(): " + e);
  }
}
 
// Load custom proxy preferences into the dialog
function loadPrefsCustomProxy(onLoad) {
  log("Loading custom proxy preferences");
  try {
    // Get the custom proxy label
    var label = prefsHandler.getStringPref(prefix + 'label');    
    if (label == "") {
      // If label is empty, get the default label
      label = jdfUtils.getString('jondofox.statusbar.label.custom');
    }
    // Set the label to the textfield
    document.getElementById('textbox_custom_label').value = label;
    // Get the user agent
    var userAgent = prefsHandler.getStringPref(prefix + 'user_agent');
    if (userAgent == 'jondo') {
      document.getElementById('user_agent').selectedItem =
	  document.getElementById('jondoUA');
    } else if (userAgent == 'tor') {
      document.getElementById('user_agent').selectedItem =
	  document.getElementById('torUA');
    } else {
      document.getElementById('user_agent').selectedItem =
          document.getElementById('normalUA');
    }
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
    // Get 'custom.share_proxy_settings' and enable/disable components
    document.getElementById('checkbox_all_protocols').checked = 
        prefsHandler.getBoolPref(prefix + 'share_proxy_settings');
    shareProxySettings(onLoad); 
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
        document.getElementById('textbox_custom_label').value);
    // Set the user agent
    prefsHandler.setStringPref(prefix + 'user_agent', 
        document.getElementById('user_agent').selectedItem.value);
    // Set single proxies
    prefsHandler.setStringPref(prefix + 'http_host', 
        document.getElementById('http_host').value);
    prefsHandler.setIntPref(prefix + 'http_port', 
        document.getElementById('http_port').value);
    //shareProxySettings();
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
    // Set the preference according to checkbox state
    prefsHandler.setBoolPref(prefix + 'share_proxy_settings',
          document.getElementById('checkbox_all_protocols').checked);
    // We should overwrite our backup with the new settings.
    // Without that, the backup values are displayed all the time.
    var checked = document.getElementById('checkbox_all_protocols').checked;
    if(!checked) {
      prefsHandler.setStringPref(prefix + 'backup.ssl_host', 
        document.getElementById('ssl_host').value);
      prefsHandler.setIntPref(prefix + 'backup.ssl_port', 
        document.getElementById('ssl_port').value);
      prefsHandler.setStringPref(prefix + 'backup.ftp_host', 
        document.getElementById('ftp_host').value);
      prefsHandler.setIntPref(prefix + 'backup.ftp_port', 
        document.getElementById('ftp_port').value);
      prefsHandler.setStringPref(prefix + 'backup.gopher_host', 
        document.getElementById('gopher_host').value);
      prefsHandler.setIntPref(prefix + 'backup.gopher_port', 
        document.getElementById('gopher_port').value);
      prefsHandler.setStringPref(prefix + 'backup.socks_host', 
        document.getElementById('socks_host').value);
      prefsHandler.setIntPref(prefix + 'backup.socks_port', 
        document.getElementById('socks_port').value);        
      // Set socks version
      prefsHandler.setIntPref(prefix + 'backup.socks_version', 
        document.getElementById('socks_version').selectedItem.value);
    }
      // Check if the relevant values are okay for using JonDo, i.e. not
      // empty; the 'empty_proxy' preference will be observed in jondofox-gui.js
      // in order to set the text color of 'custom' properly
    if ((prefsHandler.getStringPref(prefix + 'http_host') &&
          prefsHandler.getIntPref(prefix + 'http_port') &&
	 prefsHandler.getStringPref(prefix + 'ssl_host') &&
          prefsHandler.getIntPref(prefix + 'ssl_port') &&
         prefsHandler.getStringPref(prefix + 'ftp_host') &&
          prefsHandler.getIntPref(prefix + 'ftp_port')) ||
	(prefsHandler.getStringPref(prefix + 'socks_host') &&
	  prefsHandler.getIntPref(prefix + 'socks_port') && 
	  prefsHandler.getIntPref(prefix + 'socks_version') === 5)) {
      prefsHandler.setBoolPref(prefix + 'empty_proxy', false);
    } else {
      prefsHandler.setBoolPref(prefix + 'empty_proxy', true);
    }
  } catch (e) {
    log("writePrefsCustomProxy(): " + e);
  }
}

// Use proxy server for all protocols 
function shareProxySettings(onLoad) { 
  try {
    var checked = document.getElementById('checkbox_all_protocols').checked; 
    if (checked) {
      if (!onLoad) {
        // Mirroring Firefox' behaviour, we save the old proxy values first
        // but not during startup... 
        prefsHandler.setStringPref(prefix + 'backup.ssl_host', 
            document.getElementById('ssl_host').value);
        prefsHandler.setIntPref(prefix + 'backup.ssl_port', 
            document.getElementById('ssl_port').value);
        prefsHandler.setStringPref(prefix + 'backup.ftp_host', 
            document.getElementById('ftp_host').value);
        prefsHandler.setIntPref(prefix + 'backup.ftp_port', 
            document.getElementById('ftp_port').value);
        prefsHandler.setStringPref(prefix + 'backup.gopher_host', 
            document.getElementById('gopher_host').value);
        prefsHandler.setIntPref(prefix + 'backup.gopher_port', 
            document.getElementById('gopher_port').value);
        prefsHandler.setStringPref(prefix + 'backup.socks_host', 
            document.getElementById('socks_host').value);
        prefsHandler.setIntPref(prefix + 'backup.socks_port', 
            document.getElementById('socks_port').value);        
        // and save socks version...
        prefsHandler.setIntPref(prefix + 'backup.socks_version', 
            document.getElementById('socks_version').selectedItem.value);
      }
      var host = document.getElementById("http_host").value;
      var port = document.getElementById("http_port").value;
      // Set host and port for all protocols
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
      // And now we are going to restore everything...
      document.getElementById('ssl_host').value = 
        prefsHandler.getStringPref(prefix + 'backup.ssl_host');
      document.getElementById('ssl_port').value = 
        prefsHandler.getIntPref(prefix + 'backup.ssl_port'); 
      document.getElementById('ftp_host').value = 
        prefsHandler.getStringPref(prefix + 'backup.ftp_host');
      document.getElementById('ftp_port').value = 
        prefsHandler.getIntPref(prefix + 'backup.ftp_port');
      document.getElementById('gopher_host').value = 
        prefsHandler.getStringPref(prefix + 'backup.gopher_host');
      document.getElementById('gopher_port').value = 
        prefsHandler.getIntPref(prefix + 'backup.gopher_port'); 
      document.getElementById('socks_host').value = 
        prefsHandler.getStringPref(prefix + 'backup.socks_host');
      document.getElementById('socks_port').value = 
        prefsHandler.getIntPref(prefix + 'backup.socks_port');        
      // At last we restore the socks version
      var version = prefsHandler.getIntPref(prefix + 'backup.socks_version');
      if (version == 4) {
        document.getElementById('socks_version').selectedItem = 
          document.getElementById('version4');
      } else {
        document.getElementById('socks_version').selectedItem = 
          document.getElementById('version5');
      }
    }
  } catch (e) {
    log("shareProxySettings(): " + e);
  } 
}

// This is called on clicking the 'accept'-button
function onAccept() {
  try {
    // Store all preferences
    writePrefsGeneral();
    writePrefsCustomProxy();
    // Set proxy exceptions to FF
    proxyManager.setExceptions(prefsHandler.getStringPref(
        'extensions.jondofox.no_proxies_on'));
    // If the current state is 'custom': reset it
    if (prefsHandler.getStringPref('extensions.jondofox.proxy.state') == 
        'custom') {
      window.opener.setCustomProxy();
    }
  } catch (e) {
    log("onAccept(): " + e);
  }
  // Return true in any case for closing the window
  return true;
}

// Apply the current tab's preferences
function onApply() {
  try {
    // Get the index of the currently selected tab
    var index = document.getElementById('tab-box').selectedIndex;
    // Call the respective write-method
    if (index == TABINDEX_GENERAL) {
      writePrefsGeneral();
      // Set proxy exceptions to FF
      proxyManager.setExceptions(prefsHandler.getStringPref(
          'extensions.jondofox.no_proxies_on'));
    } else if (index == TABINDEX_CUSTOMPROXY) {
      writePrefsCustomProxy();
      window.opener.setCustomProxy();
    } else {
      // Should not happen
      log("Crazy index: " + index);
    }
  } catch (e) {
    log("onApply(): " + e);
  }
}
