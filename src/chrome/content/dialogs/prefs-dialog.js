/******************************************************************************
 * Copyright (c) 2009-2012, Johannes Renner, Georg Koppen
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
    loadPrefsTempEmail();
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
    // Plugin setting
    document.getElementById('checkbox_set_plugins').checked =
        prefsHandler.
	getBoolPref('extensions.jondofox.plugin-protection_enabled'); 
    // Certificate Patrol setting
    document.getElementById('checkbox_set_certpatrol').checked = 
        prefsHandler.getBoolPref('extensions.jondofox.certpatrol_enabled');
    // SSL observatory setting
    var obProxy = document.getElementById('observatoryProxy');
    var customProxy = obProxy.getItemAtIndex(2);
    customProxy.setAttribute("label", customProxy.getAttribute("label") + " " +
      getLabel(jdfManager.STATE_CUSTOM));
    obProxy.selectedIndex = 
        prefsHandler.getIntPref('extensions.jondofox.observatory.proxy');
    // Adblock setting
    //document.getElementById('checkbox_set_adblock').checked =
    //    prefsHandler.getBoolPref('extensions.jondofox.adblock_enabled');
    // the warnings are checkboxes as well
    document.getElementById('checkbox_update_warning').checked =
        prefsHandler.getBoolPref('extensions.jondofox.update_warning');
    document.getElementById('checkbox_preferences_warning').checked =
        prefsHandler.getBoolPref('extensions.jondofox.preferences_warning'); 
    document.getElementById('checkbox_proxy_warning').checked =
        prefsHandler.getBoolPref('extensions.jondofox.proxy_warning');
    // Advanced menu in JonDoBrowser
    // TODO: We do not get the jondofox.withinJonDoBrowser from jondofox-gui.js
    // but why other functions work fine?
    if (prefsHandler.isPreferenceSet('extensions.jondofox.browser_version')) {
      document.getElementById('jondofox-menu-row').hidden = false;
      document.getElementById('checkbox_advanced_menu').checked =
        prefsHandler.getBoolPref('extensions.jondofox.advanced_menu');
    }
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
    prefsHandler.
	setBoolPref('extensions.jondofox.plugin-protection_enabled',
      document.getElementById('checkbox_set_plugins').checked); 
    prefsHandler.setBoolPref('extensions.jondofox.certpatrol_enabled',
        document.getElementById('checkbox_set_certpatrol').checked);
    prefsHandler.setIntPref('extensions.jondofox.observatory.proxy',
        document.getElementById('observatoryProxy').selectedIndex); 
         
    //prefsHandler.setBoolPref('extensions.jondofox.adblock_enabled',
//	document.getElementById('checkbox_set_adblock').checked);
    // Now the settings concerning different warnings
    prefsHandler.setBoolPref('extensions.jondofox.update_warning',
        document.getElementById('checkbox_update_warning').checked);
    prefsHandler.setBoolPref('extensions.jondofox.preferences_warning',
        document.getElementById('checkbox_preferences_warning').checked);
    prefsHandler.setBoolPref('extensions.jondofox.proxy_warning',
        document.getElementById('checkbox_proxy_warning').checked);
     // Advanced menu in JonDoBrowser
    if (prefsHandler.isPreferenceSet('extensions.jondofox.browser_version')) {
      prefsHandler.setBoolPref('extensions.jondofox.advanced_menu', 
        document.getElementById('checkbox_advanced_menu').checked);
    } 
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
    // Get the proxy keep-alive status
    document.getElementById('proxyKeepAlive').checked = 
        prefsHandler.getBoolPref(prefix + 'proxyKeepAlive');
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
    // The proxy dialog in FF4 has no Gopher settings anymore. Thus,
    // we remove (i.e. hide) them as well in this case.
    if (jdfManager.ff4) {
      document.getElementById('gopher_row').collapsed = true;
    } else {
      document.getElementById('gopher_host').value = 
        prefsHandler.getStringPref(prefix + 'gopher_host');
      document.getElementById('gopher_port').value = 
        prefsHandler.getIntPref(prefix + 'gopher_port'); 
    }
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
    // Set proxy.keep-alive
    prefsHandler.setBoolPref(prefix + 'proxyKeepAlive',
	document.getElementById('proxyKeepAlive').checked);
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

function loadPrefsTempEmail() {
  try {
  log("Loading temporary E-mail preferences");
  var serviceActivated = prefsHandler.
    getBoolPref("extensions.jondofox.temp.email.activated");
  document.getElementById("tempEmailService").checked = serviceActivated;
  Components.utils.import("resource://jondofox/bloodyVikingsServices.jsm");
  let aboutText = jdfUtils.getString("jondofox.about.label");
  let langText = jdfUtils.getString("jondofox.supported.languages.label");
  let serviceGroup = document.getElementById("selectedService"); 

  var i = 1;

  for (let id in BloodyVikings.Services.serviceList) {
        let linkLabel = "";
        let service = BloodyVikings.Services.getService(id);
        let name    = service.name;
        let infoUrl = service.infoUrl;
	linkLabel = aboutText + " " + name;

        let hbox    = document.createElement("hbox");
        let radio   = document.createElement("radio");
        let spacer  = document.createElement("spacer");
        let link    = document.createElement("label");

        hbox.setAttribute("align", "baseline");

        radio.setAttribute("value", name);
        radio.setAttribute("label", name + ((service.recommended)?" *":""));
	radio.setAttribute("id", "radio" + i);
        
        if (service.recommended && serviceActivated) {
          radio.setAttribute("class", "bloodyvikingsRecommended");
        } else if (service.recommended && !serviceActivated) {
          radio.setAttribute("class", "bloodyvikingsRecDeactivated");
	}
        
        let tooltip = "";
        if (service.languages) {
            for (let lang in service.languages) {
                if (tooltip)
                    tooltip += ",";

		tooltip += " ";
                tooltip += lang;
            }
        } else {
            tooltip = " " + service.defaultLanguage;
        }
        
        radio.setAttribute("tooltiptext", langText + tooltip);
        // radio.disabled does not work here, why?
        radio.setAttribute("disabled", 
	    !document.getElementById("tempEmailService").checked); 

        spacer.setAttribute("flex", 1);

        link.setAttribute("class", "text-link");
        link.setAttribute("href", infoUrl);
        link.setAttribute("tooltiptext", infoUrl);
        link.setAttribute("value", linkLabel);

        hbox.appendChild(radio);
        hbox.appendChild(spacer);
        hbox.appendChild(link);

        serviceGroup.appendChild(hbox);

	i = i + 1;
    }

    serviceGroup.value = 
      prefsHandler.getStringPref("extensions.jondofox.temp.email.selected");
  } catch (e) {
    dump("Error: " + e + "\n");
  } 
}

function writePrefsTempEmail() {
  var radioElement;
  var serviceGroup = document.getElementById("selectedService"); 
  var serviceActivated = document.getElementById("tempEmailService").checked;
  prefsHandler.setStringPref("extensions.jondofox.temp.email.selected", 
    serviceGroup.value);
  prefsHandler.setBoolPref("extensions.jondofox.temp.email.activated", 
    serviceActivated);
  for (var i = 1; i <= 5; i++) {
    radioElement = document.getElementById("radio" + i);
    radioElement.disabled = !serviceActivated;
    if (radioElement.getAttribute("class") === "bloodyvikingsRecommended" &&
	!serviceActivated) {
      radioElement.setAttribute("class", "bloodyvikingsRecDeactivated");
    } else if (radioElement.getAttribute("class") === 
      "bloodyvikingsRecDeactivated" && serviceActivated) {
      radioElement.setAttribute("class", "bloodyvikingsRecommended");  
    } 
  }
}

// This is called on clicking the 'accept'-button
function onAccept() {
  try {
    // Store all preferences
    writePrefsGeneral();
    writePrefsCustomProxy();
    writePrefsTempEmail();
    // Act according to the plugin checkbox
    jdfManager.enforcePluginPref(jdfManager.getState()); 
    // Set proxy exceptions to FF
    proxyManager.setExceptions(prefsHandler.getStringPref(
        'extensions.jondofox.no_proxies_on'));
    // If the current state is 'custom': reset it
    if (prefsHandler.getStringPref('extensions.jondofox.proxy.state') == 
        'custom') {
      setCustomProxy();
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
      //
      // Act according to the plugin checkbox
      jdfManager.enforcePluginPref(jdfManager.getState()); 
      // Set proxy exceptions to FF
      proxyManager.setExceptions(prefsHandler.getStringPref(
          'extensions.jondofox.no_proxies_on'));
    } else if (index == TABINDEX_CUSTOMPROXY) {
      writePrefsCustomProxy();
      setCustomProxy();
      // Changing the label for the observatory custom-proxy menuitem
      //var obProxy = document.getElementById('observatoryProxy');
      //var customProxy = obProxy.getItemAtIndex(2);
      //customProxy.setAttribute("label", customProxy.getAttribute("label") +
      // " " + getLabel(jdfManager.STATE_CUSTOM)); 
    } else {
      // Temporary Emails
      writePrefsTempEmail();
    }
  } catch (e) {
    log("onApply(): " + e);
  }
}

var openFilterListWindow = function() {
  var win = Components.classes['@mozilla.org/appshell/window-mediator;1'].
                 getService(Components.interfaces.nsIWindowMediator).
                 getMostRecentWindow('jondofox:filter-window'); 
  if (!win) {
    // No additional parameters needed WRONG: we need at least centerscreen
    // otherwise the dialog is shown in the left upper corner using JDF 
    // portable
    window.openDialog("chrome://jondofox/content/dialogs/adBlocking.xul",
      "filter-window", "centerscreen,width=640,height=480");
  } else {
    // We have already one window open, focus it!
    win.focus(); 
  }
}

var contextHelp = function(aString) {
  openPageNewTab(aString);
  // We need to delete the "API" part in "observatoryAPI" in order to be able
  // to use the generic hidePopup() call.
  aString = aString.replace("API", "");
  document.getElementById(aString + "Help").hidePopup(); // hide the help popup
} 
