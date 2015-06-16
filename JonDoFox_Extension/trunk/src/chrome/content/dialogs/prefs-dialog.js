/******************************************************************************
 * Copyright (c) 2009-2012, Johannes Renner, Georg Koppen
 *
 * Preferences dialog javascript code
 *****************************************************************************/

// Indices of the single tabs
const TABINDEX_GENERAL = 0;
const TABINDEX_CUSTOMPROXY = 1;

Components.utils.import("resource://jondofox/jdfUtils.jsm", this);

// Set the prefs handler, it will be needed
var prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
    getService().wrappedJSObject;

var XULRuntime = Components.classes["@mozilla.org/xre/app-info;1"].
  getService(Components.interfaces.nsIXULRuntime);

// Set the proxy manager (only for setting proxy exceptions)
// TODO: Set proxies using the proxy manager and do not edit prefs directly
var proxyManager = Components.classes['@jondos.de/proxy-manager;1'].
    getService().wrappedJSObject;

// JonDoFox-Manager is used for setting the proxy to custom
var jdfManager = Components.classes['@jondos.de/jondofox-manager;1'].
    getService().wrappedJSObject;

Components.utils.import("resource://jondofox/jdfUtils.jsm", this);

// Prefix for custom proxy settings
var customPrefix = "extensions.jondofox.custom.";

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
    document.getElementById('checkbox_set_flash').checked =
        prefsHandler.
	getBoolPref('extensions.jondofox.disableAllPluginsJonDoMode');
    // SSL setting
    document.getElementById('checkbox_ssl_cipher').checked =
        prefsHandler.getBoolPref('extensions.jondofox.disable_insecure_ssl_cipher');
    document.getElementById('checkbox_obervatory_tor').checked =
        prefsHandler.getBoolPref('extensions.jondofox.observatory.use_with_tor');
    document.getElementById('checkbox_obervatory_all').checked =
        prefsHandler.getBoolPref('extensions.jondofox.observatory.use_with_without');
    document.getElementById('checkbox_certpatrol').checked =
        prefsHandler.getBoolPref('extensions.jondofox.certpatrol_enabled');

    // SSL observatory setting
    document.getElementById('checkbox_obervatory_jondo').checked =
        prefsHandler.getBoolPref('extensions.jondofox.observatory.use_with_jondo');
    document.getElementById('checkbox_ssl_nego').checked =
        prefsHandler.getBoolPref('extensions.jondofox.disable_insecure_ssl_nego');
    document.getElementById('checkbox_ssl_mixed').checked =
        prefsHandler.getBoolPref('extensions.jondofox.disable_insecure_ssl_mixed');
    
    //Cookie Controller
    document.getElementById('checkbox_reload_cookie').checked = prefsHandler.getBoolPref('extensions.cookieController.reloadPage');
 
    // Advanced menu in JonDoBrowser
    if (prefsHandler.isPreferenceSet('extensions.jondofox.browser_version')) {
      document.getElementById('jondofox-menu-row').hidden = false;
      var updateCheckbox = document.getElementById('checkbox_update_jondonym');
      //if (XULRuntime.OS === "Linux") {
      //  updateCheckbox.hidden = false;
      //}
      document.getElementById('checkbox_advanced_menu').checked =
        prefsHandler.getBoolPref('extensions.jondofox.advanced_menu');
      updateCheckbox.checked = prefsHandler.
        getBoolPref('extensions.jondofox.update_jondonym');
    }
    // allways start in JonDo mode
    document.getElementById('checkbox_alwaysjondo').checked =
        prefsHandler.getBoolPref('extensions.jondofox.alwaysUseJonDo');
    // the warnings are checkboxes as well
    document.getElementById('checkbox_update_warning').checked =
        prefsHandler.getBoolPref('extensions.jondofox.update_warning');
    document.getElementById('checkbox_preferences_warning').checked =
        prefsHandler.getBoolPref('extensions.jondofox.preferences_warning');
    document.getElementById('checkbox_proxy_warning').checked =
        prefsHandler.getBoolPref('extensions.jondofox.proxy_warning');

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
    prefsHandler.setBoolPref('extensions.jondofox.disableAllPluginsJonDoMode',
      document.getElementById('checkbox_set_flash').checked);
    prefsHandler.setBoolPref('extensions.jondofox.disable_insecure_ssl_cipher',
      document.getElementById('checkbox_ssl_cipher').checked);
    prefsHandler.setBoolPref('extensions.jondofox.disable_insecure_ssl_nego',
      document.getElementById('checkbox_ssl_nego').checked);
    prefsHandler.setBoolPref('extensions.jondofox.disable_insecure_ssl_mixed',
      document.getElementById('checkbox_ssl_mixed').checked);
    prefsHandler.setBoolPref('extensions.cookieController.reloadPage',document.getElementById('checkbox_reload_cookie').checked);


    // get man-in.the-middle protection
    prefsHandler.setBoolPref('extensions.jondofox.certpatrol_enabled',
      document.getElementById('checkbox_certpatrol').checked);
    prefsHandler.setBoolPref('extensions.jondofox.observatory.use_with_without',
      document.getElementById('checkbox_obervatory_all').checked);
    prefsHandler.setBoolPref('extensions.jondofox.observatory.use_with_tor',
      document.getElementById('checkbox_obervatory_tor').checked);
    prefsHandler.setBoolPref('extensions.jondofox.observatory.use_with_jondo',
      document.getElementById('checkbox_obervatory_jondo').checked);


    prefsHandler.setIntPref('extensions.jondofox.observatory.proxy',
        document.getElementById('observatoryProxy').selectedIndex);
    if (prefsHandler.getIntPref('extensions.jondofox.observatory.proxy') === 6) {
        prefsHandler.setBoolPref('extensions.jondofox.certpatrol_enabled', true);
    } else {
        prefsHandler.setBoolPref('extensions.jondofox.certpatrol_enabled', false);
    }
   
    // Always start with JonDo
    prefsHandler.setBoolPref('extensions.jondofox.alwaysUseJonDo',
        document.getElementById('checkbox_alwaysjondo').checked);
    // Now the settings concerning different warnings
    prefsHandler.setBoolPref('extensions.jondofox.update_warning',
        document.getElementById('checkbox_update_warning').checked);
    prefsHandler.setBoolPref('extensions.jondofox.preferences_warning',
        document.getElementById('checkbox_preferences_warning').checked);
    prefsHandler.setBoolPref('extensions.jondofox.proxy_warning',
        document.getElementById('checkbox_proxy_warning').checked);
     // Advanced menu etc. in JonDoBrowser
    if (prefsHandler.isPreferenceSet('extensions.jondofox.browser_version')) {
      prefsHandler.setBoolPref('extensions.jondofox.advanced_menu',
        document.getElementById('checkbox_advanced_menu').checked);
      prefsHandler.setBoolPref('extensions.jondofox.update_jondonym',
        document.getElementById('checkbox_update_jondonym').checked);
    }
   
  } catch (e) {
    log("writePrefsGeneral(): " + e);
  }
}

// Load custom proxy preferences into the dialog
function loadPrefsCustomProxy(onLoad) {
  log("Loading custom proxy preferences");
  try {
    // Get the custom proxy label
    var label = prefsHandler.getStringPref(customPrefix + 'label');
    if (label == "") {
      // If label is empty, get the default label
      label = jdfUtils.getString('jondofox.statusbar.label.custom');
    }
    // Set the label to the textfield
    document.getElementById('textbox_custom_label').value = label;
    // Get the user agent
    var userAgent = prefsHandler.getStringPref(customPrefix + 'user_agent');
    if (userAgent == 'jondo') {
      document.getElementById('user_agent').selectedItem =
	  document.getElementById('jondoUA');
    } else if (userAgent == 'tor') {
      document.getElementById('user_agent').selectedItem =
	  document.getElementById('torUA');
    } else if (userAgent == 'win') {
      document.getElementById('user_agent').selectedItem =
	  document.getElementById('winUA');
    } else {
      document.getElementById('user_agent').selectedItem =
          document.getElementById('normalUA');
    }
    // Get the proxy keep-alive status
    document.getElementById('proxyKeepAlive').checked =
        prefsHandler.getBoolPref(customPrefix + 'proxyKeepAlive');
    // Get host and port settings for different protocols
    document.getElementById('http_host').value =
        prefsHandler.getStringPref(customPrefix + 'http_host');
    document.getElementById('http_port').value =
        prefsHandler.getIntPref(customPrefix + 'http_port');
    document.getElementById('ssl_host').value =
        prefsHandler.getStringPref(customPrefix + 'ssl_host');
    document.getElementById('ssl_port').value =
        prefsHandler.getIntPref(customPrefix + 'ssl_port');
    document.getElementById('ftp_host').value =
      prefsHandler.getStringPref(customPrefix + 'ftp_host');
    document.getElementById('ftp_port').value =
        prefsHandler.getIntPref(customPrefix + 'ftp_port');
    // The proxy dialog in FF4 has no Gopher settings anymore. Thus,
    // we remove (i.e. hide) them as well in this case.
    if (jdfManager.ff4) {
      document.getElementById('gopher_row').collapsed = true;
    } else {
      document.getElementById('gopher_host').value =
        prefsHandler.getStringPref(customPrefix + 'gopher_host');
      document.getElementById('gopher_port').value =
        prefsHandler.getIntPref(customPrefix + 'gopher_port');
    }
    document.getElementById('socks_host').value =
        prefsHandler.getStringPref(customPrefix + 'socks_host');
    document.getElementById('socks_port').value =
        prefsHandler.getIntPref(customPrefix + 'socks_port');
    // Get socks version
    var version = prefsHandler.getIntPref(customPrefix + 'socks_version');
    if (version == 4) {
      document.getElementById('socks_version').selectedItem =
          document.getElementById('version4');
    } else {
      document.getElementById('socks_version').selectedItem =
          document.getElementById('version5');
    }
    // Get 'custom.share_proxy_settings' and enable/disable components
    document.getElementById('checkbox_all_protocols').checked =
        prefsHandler.getBoolPref(customPrefix + 'share_proxy_settings');
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
    prefsHandler.setStringPref(customPrefix + 'label',
        document.getElementById('textbox_custom_label').value);
    // Set the user agent
    prefsHandler.setStringPref(customPrefix + 'user_agent',
        document.getElementById('user_agent').selectedItem.value);
    // Set proxy.keep-alive
    prefsHandler.setBoolPref(customPrefix + 'proxyKeepAlive',
	document.getElementById('proxyKeepAlive').checked);
    // Set single proxies
    prefsHandler.setStringPref(customPrefix + 'http_host',
        document.getElementById('http_host').value);
    prefsHandler.setIntPref(customPrefix + 'http_port',
        document.getElementById('http_port').value);
    //shareProxySettings();
    prefsHandler.setStringPref(customPrefix + 'ssl_host',
        document.getElementById('ssl_host').value);
    prefsHandler.setIntPref(customPrefix + 'ssl_port',
        document.getElementById('ssl_port').value);
    prefsHandler.setStringPref(customPrefix + 'ftp_host',
        document.getElementById('ftp_host').value);
    prefsHandler.setIntPref(customPrefix + 'ftp_port',
        document.getElementById('ftp_port').value);
    prefsHandler.setStringPref(customPrefix + 'gopher_host',
        document.getElementById('gopher_host').value);
    prefsHandler.setIntPref(customPrefix + 'gopher_port',
        document.getElementById('gopher_port').value);
    prefsHandler.setStringPref(customPrefix + 'socks_host',
        document.getElementById('socks_host').value);
    prefsHandler.setIntPref(customPrefix + 'socks_port',
        document.getElementById('socks_port').value);
    // Set socks version
    prefsHandler.setIntPref(customPrefix + 'socks_version',
        document.getElementById('socks_version').selectedItem.value);
    // Set the preference according to checkbox state
    prefsHandler.setBoolPref(customPrefix + 'share_proxy_settings',
          document.getElementById('checkbox_all_protocols').checked);
    // We should overwrite our backup with the new settings.
    // Without that, the backup values are displayed all the time.
    var checked = document.getElementById('checkbox_all_protocols').checked;
    if(!checked) {
      prefsHandler.setStringPref(customPrefix + 'backup.ssl_host',
        document.getElementById('ssl_host').value);
      prefsHandler.setIntPref(customPrefix + 'backup.ssl_port',
        document.getElementById('ssl_port').value);
      prefsHandler.setStringPref(customPrefix + 'backup.ftp_host',
        document.getElementById('ftp_host').value);
      prefsHandler.setIntPref(customPrefix + 'backup.ftp_port',
        document.getElementById('ftp_port').value);
      prefsHandler.setStringPref(customPrefix + 'backup.gopher_host',
        document.getElementById('gopher_host').value);
      prefsHandler.setIntPref(customPrefix + 'backup.gopher_port',
        document.getElementById('gopher_port').value);
      prefsHandler.setStringPref(customPrefix + 'backup.socks_host',
        document.getElementById('socks_host').value);
      prefsHandler.setIntPref(customPrefix + 'backup.socks_port',
        document.getElementById('socks_port').value);
      // Set socks version
      prefsHandler.setIntPref(customPrefix + 'backup.socks_version',
        document.getElementById('socks_version').selectedItem.value);
    }
      // Check if the relevant values are okay for using JonDo, i.e. not
      // empty; the 'empty_proxy' preference will be observed in jondofox-gui.js
      // in order to set the text color of 'custom' properly
    if ((prefsHandler.getStringPref(customPrefix + 'http_host') &&
          prefsHandler.getIntPref(customPrefix + 'http_port') &&
	 prefsHandler.getStringPref(customPrefix + 'ssl_host') &&
          prefsHandler.getIntPref(customPrefix + 'ssl_port') &&
         prefsHandler.getStringPref(customPrefix + 'ftp_host') &&
          prefsHandler.getIntPref(customPrefix + 'ftp_port')) ||
	(prefsHandler.getStringPref(customPrefix + 'socks_host') &&
	  prefsHandler.getIntPref(customPrefix + 'socks_port') &&
	  prefsHandler.getIntPref(customPrefix + 'socks_version') === 5)) {
      prefsHandler.setBoolPref(customPrefix + 'empty_proxy', false);
    } else {
      prefsHandler.setBoolPref(customPrefix + 'empty_proxy', true);
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
        prefsHandler.setStringPref(customPrefix + 'backup.ssl_host',
            document.getElementById('ssl_host').value);
        prefsHandler.setIntPref(customPrefix + 'backup.ssl_port',
            document.getElementById('ssl_port').value);
        prefsHandler.setStringPref(customPrefix + 'backup.ftp_host',
            document.getElementById('ftp_host').value);
        prefsHandler.setIntPref(customPrefix + 'backup.ftp_port',
            document.getElementById('ftp_port').value);
        prefsHandler.setStringPref(customPrefix + 'backup.gopher_host',
            document.getElementById('gopher_host').value);
        prefsHandler.setIntPref(customPrefix + 'backup.gopher_port',
            document.getElementById('gopher_port').value);
        prefsHandler.setStringPref(customPrefix + 'backup.socks_host',
            document.getElementById('socks_host').value);
        prefsHandler.setIntPref(customPrefix + 'backup.socks_port',
            document.getElementById('socks_port').value);
        // and save socks version...
        prefsHandler.setIntPref(customPrefix + 'backup.socks_version',
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
        prefsHandler.getStringPref(customPrefix + 'backup.ssl_host');
      document.getElementById('ssl_port').value =
        prefsHandler.getIntPref(customPrefix + 'backup.ssl_port');
      document.getElementById('ftp_host').value =
        prefsHandler.getStringPref(customPrefix + 'backup.ftp_host');
      document.getElementById('ftp_port').value =
        prefsHandler.getIntPref(customPrefix + 'backup.ftp_port');
      document.getElementById('gopher_host').value =
        prefsHandler.getStringPref(customPrefix + 'backup.gopher_host');
      document.getElementById('gopher_port').value =
        prefsHandler.getIntPref(customPrefix + 'backup.gopher_port');
      document.getElementById('socks_host').value =
        prefsHandler.getStringPref(customPrefix + 'backup.socks_host');
      document.getElementById('socks_port').value =
        prefsHandler.getIntPref(customPrefix + 'backup.socks_port');
      // At last we restore the socks version
      var version = prefsHandler.getIntPref(customPrefix +
        'backup.socks_version');
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
  for (var i = 1; i <= 4; i++) {
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
    jdfManager.enforcePluginPref(jdfManager.getState());
    jdfManager.enforceSSLPref();
    jdfManager.enforceObservatoryEnabled(jdfManager.getState());
 
    writePrefsCustomProxy();
    // If the current state is 'custom': reset it
    if (prefsHandler.getStringPref('extensions.jondofox.proxy.state') == 'custom') {
      setCustomProxy();
    }
  writePrefsTempEmail(); 
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
      // Act according to the plugin checkbox
      jdfManager.enforcePluginPref(jdfManager.getState());
      jdfManager.enforceSSLPref();
      jdfManager.enforceObservatoryEnabled(jdfManager.getState());
    } else if (index == TABINDEX_CUSTOMPROXY) {
      writePrefsCustomProxy();
      if (prefsHandler.getStringPref('extensions.jondofox.proxy.state') == 'custom') {
         setCustomProxy();
      }
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
