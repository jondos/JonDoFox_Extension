/******************************************************************************
 * Copyright 2008-2010, JonDos GmbH
 * Author: Johannes Renner, Georg Koppen
 *
 * JonDoFox extension management and compatibility tasks + utilities
 * TODO: Create another component containing the utils only
 *****************************************************************************/
 
///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

var mDebug = true;

// Log a message
var log = function(message) {
  if (mDebug) dump("JDFManager :: " + message + "\n");
};

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CC = Components.classes;
const CI = Components.interfaces;
const CU = Components.utils;

///////////////////////////////////////////////////////////////////////////////
// Listen for events to delete traces in case of uninstall etc.
///////////////////////////////////////////////////////////////////////////////

// Singleton instance definition
var JDFManager = function(){
  this.wrappedJSObject = this;
};

JDFManager.prototype = {
  
  // Extension version
  VERSION: null,

  // Some preferences
  STATE_PREF: 'extensions.jondofox.proxy.state',
  NO_PROXIES: 'extensions.jondofox.no_proxies_on',
  REF_PREF: 'extensions.jondofox.set_referrer',
  FEEDS_PREF: 'extensions.jondofox.feeds_handler_default',
  AUDIO_FEEDS_PREF: 'extensions.jondofox.audioFeeds_handler_default',
  VIDEO_FEEDS_PREF: 'extensions.jondofox.videoFeeds_handler_default',
 
  // Possible values of the 'STATE_PREF'
  STATE_NONE: 'none',  
  STATE_JONDO: 'jondo',
  STATE_TOR: 'tor',
  STATE_CUSTOM: 'custom',

  // We need this value to compare it to the profile version actually deployed.
  // If there are differences we pop up a warning that the user has to update
  // the profile (if she has not disabled this). 
  JDF_VERSION: "2.3.0",

  // Set this to indicate that cleaning up is necessary
  clean: false,

  // This is set to true if Certificate Patrol is found and our respective 
  // checkbox not checked. It helps to optimize the incorporation of Certificate  // Patrol code. 
  certPatrol: false,

  // Remove jondofox preferences branch on uninstall only
  uninstall: false,

  // Do we have a FF4 or still a FF3?
  ff4: true,

  // In FF4 the asynchronous AddOn-Manager leads to the problem that the found-
  // extensions-dialog appears in the background of the browser window. Thus, 
  // we avoid starting the dialog as early as in FF < 4 but save the found 
  // extensions' names in an array that is checked after the browser window is
  // loaded. If we have extensions that are incompatible we show them in one
  // window and restarting the browser to uninstall them finally after the user
  // clicked on "OK".
  extensionsFound: [],

  noscriptInstalled: true,

  noscriptEnabled: true,

  // Incompatible extensions with their IDs
  extensions: { 
    'CuteMenus':'{63df8e21-711c-4074-a257-b065cadc28d8}',
    'RefControl':'{455D905A-D37C-4643-A9E2-F6FEFAA0424A}',
    'SwitchProxy':'{27A2FD41-CB23-4518-AB5C-C25BAFFDE531}',
    'SafeCache':'{670a77c5-010e-4476-a8ce-d09171318839}',
    'Certificate Patrol':'CertPatrol@PSYC.EU'
  },

  // Necessary security extensions with their IDs
  necessaryExtensions: {
    'NoScript':'{73a6fe31-595d-460b-a920-fcc0f8843232}'    
  },
  
  // The user agent maps...
  // If JonDo is set as proxy take these UA-settings
  jondoUAMap: {
    'general.appname.override':'extensions.jondofox.jondo.appname_override',
    'general.appversion.override':'extensions.jondofox.jondo.appversion_override',
    'general.buildID.override':'extensions.jondofox.jondo.buildID_override',
    'general.oscpu.override':'extensions.jondofox.jondo.oscpu_override',
    'general.platform.override':'extensions.jondofox.jondo.platform_override',
    'general.productsub.override':'extensions.jondofox.jondo.productsub_override',
    'general.useragent.override':'extensions.jondofox.jondo.useragent_override',
    'general.useragent.vendor':'extensions.jondofox.jondo.useragent_vendor',
    'general.useragent.vendorSub':'extensions.jondofox.jondo.useragent_vendorSub'  
  },

  // If Tor is set as proxy take these UA-settings
  torUAMap: {
    'general.appname.override':'extensions.jondofox.tor.appname_override',
    'general.appversion.override':'extensions.jondofox.tor.appversion_override',
    'general.buildID.override':'extensions.jondofox.tor.buildID_override',
    'general.oscpu.override':'extensions.jondofox.tor.oscpu_override',
    'general.platform.override':'extensions.jondofox.tor.platform_override',
    'general.productsub.override':'extensions.jondofox.tor.productsub_override',
    'general.useragent.override':'extensions.jondofox.tor.useragent_override',
    'general.useragent.vendor':'extensions.jondofox.tor.useragent_vendor',
    'general.useragent.vendorSub':'extensions.jondofox.tor.useragent_vendorSub'
  },
  
  // This map of string preferences is given to the prefsMapper
  stringPrefsMap: { 
    'intl.accept_languages':'extensions.jondofox.accept_languages',
    'intl.charset.default':'extensions.jondofox.default_charset',
    'intl.accept_charsets':'extensions.jondofox.accept_charsets',
    'network.http.accept.default':'extensions.jondofox.accept_default',
    'security.default_personal_cert':
    'extensions.jondofox.security.default_personal_cert' 
  },

  // This map of boolean preferences is given to the prefsMapper
  // XXX What about 'network.http.keep_alive'?
  boolPrefsMap: {
    'dom.storage.enabled':'extensions.jondofox.dom_storage_enabled',
    'geo.enabled':'extensions.jondofox.geo_enabled',
    'network.prefetch-next':'extensions.jondofox.network_prefetch-next',
    'network.proxy.socks_remote_dns':'extensions.jondofox.socks_remote_dns',
    'network.http.proxy.keep-alive':'extensions.jondofox.proxy_keep-alive',
    'view_source.editor.external': 'extensions.jondofox.source_editor_external',
    'noscript.contentBlocker':'extensions.jondofox.noscript_contentBlocker',
    'stanford-safecache.enabled':'extensions.jondofox.stanford-safecache_enabled',
    'security.remember_cert_checkbox_default_setting':
    'extensions.jondofox.security.remember_cert_checkbox_default_setting',
    'browser.search.suggest.enabled':
    'extensions.jondofox.search_suggest_enabled'
  },

  //This map of integer preferences is given to the prefsMapper
  intPrefsMap: {
    'network.cookie.cookieBehavior':'extensions.jondofox.cookieBehavior'
  },

  // This map contains those preferences which avoid external apps being opened
  // automatically.
  externalAppWarnings: {
    'network.protocol-handler.warn-external.news':
    'extensions.jondofox.network-protocol-handler.warn_external_news',
    'network.protocol-handler.warn-external.snews':
    'extensions.jondofox.network-protocol-handler.warn_external_snews',
    'network.protocol-handler.warn-external.nntp':
    'extensions.jondofox.network-protocol-handler.warn_external_nntp',
    'network.protocol-handler.warn-external.file':
    'extensions.jondofox.network-protocol-handler.warn_external_file',
    'network.protocol-handler.warn-external.mailto':
    'extensions.jondofox.network-protocol-handler.warn_external_mailto',
    'network.protocol-handler.warn-external-default':
    'extensions.jondofox.network-protocol-handler.warn_external_default'
  },

  fileTypes: [],

  isClearingSearchhistoryEnabled: false,

  // Inititalize services and stringBundle
  init: function() {
    var bundleService;
    log("Initialize JDFManager");
    try {
      // Init services
      JDFManager.prototype.prefsHandler = 
	 CC['@jondos.de/preferences-handler;1'].getService().wrappedJSObject;
      JDFManager.prototype.prefsMapper = CC['@jondos.de/preferences-mapper;1'].
                            getService().wrappedJSObject;
      JDFManager.prototype.proxyManager = CC['@jondos.de/proxy-manager;1'].
                             getService().wrappedJSObject;
      JDFManager.prototype.jdfUtils = CC['@jondos.de/jondofox-utils;1'].
                         getService().wrappedJSObject;
      JDFManager.prototype.rdfService = CC['@mozilla.org/rdf/rdf-service;1'].
	                      getService(CI.nsIRDFService);
      JDFManager.prototype.directoryService = 
       CC['@mozilla.org/file/directory_service;1'].getService(CI.nsIProperties);
      // Determine whether we use FF4 or still some FF3
      this.isFirefox4();
      if (this.ff4) {
        try {
          var extensionListener = {
	    onUninstalling: function(addon) {
              if (addon.id === "{437be45a-4114-11dd-b9ab-71d256d89593}") {
		log("We got the onUninstalling notification...")
                JDFManager.prototype.clean = true;
		JDFManager.prototype.uninstall = true;
	      }
	    },
            onDisabling: function(addon) {
              if (addon.id === "{437be45a-4114-11dd-b9ab-71d256d89593}") {
		log("We got the onDisabling notification...");
                JDFManager.prototype.clean = true;
              }
	    },
	    onOperationCancelled: function(addon) {
              if (addon.id === "{437be45a-4114-11dd-b9ab-71d256d89593}") {
		log("Operation got cancelled!");
                JDFManager.prototype.clean = false;
		JDFManager.prototype.uninstall = false;
              }
	    }
	  }

          CU.import("resource://gre/modules/AddonManager.jsm");
	  this.getVersionFF4();
	  AddonManager.addAddonListener(extensionListener);
	} catch (e) {
          log("There went something with importing the AddonManager: " + 
              e);
	}
      } else {
        JDFManager.prototype.VERSION = this.getVersion();
      }
      // Register the proxy filter
      this.registerProxyFilter();
    } catch (e) {
      log('init(): ' + e);
    }
  },

  // Implement nsIProtocolProxyFilter for being able to bypass 
  // proxies for certain URIs that are on the noProxyList below
  applyFilter: function(ps, uri, proxy) {
    //log("Applying proxy filter for URI: " + uri.spec);
    try {
      //log("Proxy is " + proxy.host + ":" + proxy.port);
      // Lookup the no proxy list
      if (this.noProxyListContains(uri.spec)) {
        log("URI is on the list --> No proxy for " + uri.spec);
        // No proxy
        return null;
      } else {
        return proxy;
      }
    } catch (e) {
      log("applyFilter(): " +e);
    }
  },

  // Register the proxy filter
  registerProxyFilter: function() {
    log("Registering proxy filter ..");
    try {
      // Get the proxy service
      proxyService = CC['@mozilla.org/network/protocol-proxy-service;1'].
                        getService(CI.nsIProtocolProxyService);
      proxyService.registerFilter(this, 0);
      // Example for creating a ProxyInfo object:
      //proxyService.newProxyInfo("direct", "", -1, 0, 0, null);
    } catch (e) {
      log("registerProxyFilter(): " + e);
    }
  },
 
  /**
   * Try to uninstall other extensions that are not compatible
   */ 
  checkExtensions: function() {
    var extension;
    try {
      // Indicate a necessary restart
      // Iterate
      for (extension in this.extensions) {
        log('Checking for ' + extension);
        // If present, uninstall
        if (this.isInstalled(this.extensions[extension])) {
          // XXX: Allow RefControl in some cases
          if (extension === 'RefControl' && 
              !this.prefsHandler.getBoolPref(this.REF_PREF)) {
            log("Ignoring RefControl " + "refControl is " + this.refControl);
          } else if (extension === 'Certificate Patrol' && 
              !this.prefsHandler.
              getBoolPref('extensions.jondofox.certpatrol_enabled')) {
            this.certPatrol = true;
            log("Ignoring Cerificate Patrol");
          } else if (extension === 'SafeCache' || 
                     extension === 'Certificate Patrol' ||
                     extension === 'RefControl') {
            log('Found ' + extension + ', uninstalling ..');
            // Prompt a message window for every extension
            this.jdfUtils.showAlert(this.jdfUtils.
              getString('jondofox.dialog.attention'), this.jdfUtils.
              formatString('jondofox.dialog.message.uninstallExtension',
              [extension]));
              // Uninstall and set restart to true
            this.uninstallExtension(this.extensions[extension]);
            this.restart = true;
	  } else {
            if (this.jdfUtils.showConfirm(this.jdfUtils.
                  getString('jondofox.dialog.attention'), this.jdfUtils.
                  formatString('jondofox.dialog.message.extension', 
                  [extension]))) {
              // Uninstall and set restart to true
              this.uninstallExtension(this.extensions[extension]);
              this.restart = true;
            }
          }
        } else {
          log(extension + ' not found');
          if (extension === 'RefControl' && 
	      !this.prefsHandler.getBoolPref(this.REF_PREF)) {
	    this.prefsHandler.setBoolPref(this.REF_PREF, true); 
          }
        }
      }
      if (this.restart) {
        // Programmatically restart the browser
        this.restartBrowser();
      }
      // Now we check whether necessary extensions are installed...
      for (extension in this.necessaryExtensions) {
        log ('Checking for ' + extension);
        if (!this.isInstalled(this.necessaryExtensions[extension])) {
	  if (this.prefsHandler.
                 getBoolPref('extensions.jondofox.update_warning')) {
           this.jdfUtils.showAlertCheck(this.jdfUtils.
             getString('jondofox.dialog.attention'), this.jdfUtils.
             formatString('jondofox.dialog.message.necessaryExtension', 
	     [extension]), 'update');
	  }
          log(extension + ' is missing');
        } else {
          log(extension + ' is installed');
          //... and if so whether they are enabled.
          if (this.isUserDisabled(this.necessaryExtensions[extension])) {
            if (this.prefsHandler.
	             getBoolPref('extensions.jondofox.update_warning')) {
	      this.jdfUtils.showAlertCheck(this.jdfUtils.
                getString('jondofox.dialog.attention'), this.jdfUtils.
                formatString('jondofox.dialog.message.enableExtension',
                [extension]), 'update');
            }
	    log(extension + ' is disabled by user');
          } else {
	    log(extension + ' is enabled by user');
          }
        }
      }
    } catch (e) {
      log("checkExtensions(): " + e);
    }
  },

  /**
   * Try to uninstall other extensions that are not compatible; FF4 code
   */ 
  checkExtensionsFF4: function() {
    try {
      var extension;
      // Iterate
      for (extension in this.extensions) {
        log('Checking for ' + extension);
	// We have to do this, otherwise we would always get the feedback 
	// related to the latest checked extension. See:
	// https://developer.mozilla.org/en/New_in_JavaScript_1.7 the section
	// concerning the let statement.
	let aExtension = extension;
        AddonManager.getAddonByID(this.extensions[extension],
	function(addon) {
	  if (addon) {
	    log(aExtension  + " was found...");
	    if ((aExtension === "Certificate Patrol") && 
		 !JDFManager.prototype.prefsHandler.
		   getBoolPref("extensions.jondofox.certpatrol_enabled")) {
	      log("...but no problem, as our functionality is not activated."); 
              JDFManager.prototype.certPatrol = true;
            } else if ((aExtension === "RefControl") &&
		 !JDFManager.prototype.prefsHandler.
		   getBoolPref("extensions.jondofox.set_referrer")) {
	      log("...but no problem, as our functionality is not activated."); 
	    } else { 
	      addon.uninstall();
	      JDFManager.prototype.extensionsFound.push(aExtension);
	    }
	  } else {
	    log(aExtension + " was not found!"); 
	  }
	});
      }
      AddonManager.getAddonByID('{73a6fe31-595d-460b-a920-fcc0f8843232}', 
      function(addon) { 
        if (addon) {
          log("Found NoScript, that's good." + 
		    " Checking whether it is enabled...");
          if (addon.isActive) {
            log("NoScript is enabled as well.");
          } else {
            log("NoScript is not enabled!");
            JDFManager.prototype.noscriptEnabled = false;
          }
        } else {
          log("NoScript is missing...");
          JDFManager.prototype.noscriptInstalled = false;
        }
      });
    } catch (e) {
      log("checkExtensionsFF4(): " + e);
    }
  }, 

  // Call this on 'final-ui-startup'
  onUIStartup: function() {
    var p;
    var prefs;
    log("Starting up, checking conditions ..");
    try {
      // Call init() first
      this.init();
      if (this.ff4) {
	// We add this pref just in case we have a FF4 as the old one 
	// (brower.history_expire_days) is replaced by it.
	this.boolPrefsMap['places.history.enabled'] = 
		'extensions.jondofox.history.enabled';
	// For clearity of code we implement a different method to check the
	// installed extension in Firefox4
        this.checkExtensionsFF4();
      } else {
        // In order to avoid unnecessary error messages we just add it to the
	// prefs map if we have a FF3 as it does not exist anymore in FF4.
	this.intPrefsMap['browser.history_expire_days'] =
		'extensions.jondofox.history_expire_days';
        // FF3-check for incompatible extensions and whether the necessary ones
        // are installed and enabled.
        this.checkExtensions();
        // Maybe the proposed UA has changed due to an update. Thus, 
        // we are on the safe side if we set it on startup.
        if (this.VERSION !== 
          this.prefsHandler.getStringPref('extensions.jondofox.last_version')) {
          this.setUserAgent(this.getState());
        }
      }
      // Check whether we have some MIME-types which use external helper apps
      // automatically and if so correct this
      this.firstMimeTypeCheck();
      // Map all preferences
      this.prefsMapper.setStringPrefs(this.stringPrefsMap);
      this.prefsMapper.setBoolPrefs(this.boolPrefsMap);
      // We want to set the external app warnings together with the boolean 
      // prefs (in order to unmap them all properly), thus we add the former 
      // to the letter. We keep them seperated in order to show more 
      // fine-grained warnings if the prefs are changed by the user.
      log("Adding externalAppWarnings to boolean preferences map ..");
      for (p in this.externalAppWarnings) {
	this.boolPrefsMap[p] = this.externalAppWarnings[p];
      }
      this.prefsMapper.setIntPrefs(this.intPrefsMap); 
      this.prefsMapper.map();
      // Add an observer to the main pref branch after setting the prefs
      prefs = this.prefsHandler.prefs;
      prefs.QueryInterface(CI.nsIPrefBranch2);
      prefs.addObserver("", this, false);
      log("Observing privacy-related preferences ..");
      //this.windowWatcher.registerNotification
      // If this is set (MR Tech Toolkit), set it to false       
      if (this.prefsHandler.
                  isPreferenceSet('local_install.showBuildinWindowTitle')) {
        this.prefsHandler.
                setBoolPref('local_install.showBuildinWindowTitle', false);
      }
      // Now, we observe the datasource in order to be able to prevent the user
      // from using external applications automatically.
      this.observeMimeTypes();
      log("Setting initial proxy state ..");
      //If somebody wants to have always JonDo as a proxy she gets it and the 
      //corresponding User Agent setting. Otherwise the last used proxy will be
      // set.
      if (this.prefsHandler.getBoolPref('extensions.jondofox.alwaysUseJonDo')) {
	this.setProxy('jondo');
        this.setUserAgent('jondo');
      } else {
        this.setProxy(this.getState());
        // Setting Tor values...
        if (this.prefsHandler.getStringPref(
            'general.useragent.override') === this.prefsHandler.getStringPref(
            'extensions.jondofox.tor.useragent_override')) {
          this.setUserAgent('tor');
        }
      }
    } catch (e) {
      log("onUIStartup(): " + e);
    }
  },

  // General cleanup function for deinstallation etc.
  cleanup: function() {
    log("Cleaning up ..");
    try {
      // Remove the preferences observer      
      log("Stop observing preferences ..");
      this.prefsHandler.prefs.removeObserver("", this);
      // Unmap preferences
      this.prefsMapper.unmap();     
      // Delete the jondofox prefs branch only on uninstall
      if (this.uninstall) {
        log("Deinstallation, deleting jondofox branch ..");
        this.prefsHandler.deleteBranch('extensions.jondofox');
      } else {
        // On disable, reset the state only
        this.prefsHandler.deletePreference('extensions.jondofox.proxy.state');
      }
    } catch (e) {
      log("onUninstall(): " + e);
    }
  },

  // This is called once on application startup
  registerObservers: function() {
    var observers;
    log("Register observers");
    try {
      observers = CC["@mozilla.org/observer-service;1"].
                         getService(CI.nsIObserverService);
      // Add general observers
      observers.addObserver(this, "final-ui-startup", false);
      observers.addObserver(this, "em-action-requested", false);
      observers.addObserver(this, "quit-application-granted", false);
      observers.addObserver(this, "xul-window-destroyed", false);
      observers.addObserver(this, "domwindowopened", false);
    } catch (e) {
      log("registerObservers(): " + e);
    }
  },

  // Called once on application shutdown
  unregisterObservers: function() {
    var observers;
    log("Unregister observers");
    try {
      observers = CC["@mozilla.org/observer-service;1"].
                         getService(CI.nsIObserverService);
      // Remove general observers
      observers.removeObserver(this, "final-ui-startup");
      observers.removeObserver(this, "em-action-requested");
      observers.removeObserver(this, "quit-application-granted");    
      observers.removeObserver(this, "xul-window-destroyed");
      observers.removeObserver(this, "domwindowopened");
      if (!this.ff4) {
        observers.removeObserver(this, "profile-after-change");
      }
    } catch (e) {
      log("unregisterObservers(): " + e);
    }
  },
 
  // Getting the extension version (FF >= 4)

  getVersionFF4: function() {
    AddonManager.getAddonByID("{437be45a-4114-11dd-b9ab-71d256d89593}", 
	  function(addon) {
	    JDFManager.prototype.VERSION = addon.version;
	    log("Current version is: " + JDFManager.prototype.VERSION);
	    // Maybe the proposed UA has changed due to an update. Thus, 
	    // we are on the safe side if we set it on startup.
	    var lastVersion = JDFManager.prototype.prefsHandler.
		    getStringPref('extensions.jondofox.last_version');
            if (JDFManager.prototype.VERSION !== lastVersion) {
              JDFManager.prototype.setUserAgent(JDFManager.
		      prototype.getState());
            }
          });
  },

  /**
   * Return the version string of this extension (FF < 4)
   */
  getVersion: function() {
    try {
      // Get the extension-manager and rdf-service
      var extMgr = CC["@mozilla.org/extensions/manager;1"].
                    getService(CI.nsIExtensionManager);
      // Our ID
      var extID = "{437be45a-4114-11dd-b9ab-71d256d89593}";
      var version = "";
      // Init ingredients
      var ds = extMgr.datasource;
      var res = this.rdfService.GetResource("urn:mozilla:item:" + extID);
      var prop = this.rdfService.
                  GetResource("http://www.mozilla.org/2004/em-rdf#version");
      // Get the target
      var target = ds.GetTarget(res, prop, true);
      if(target !== null) {
        version = target.QueryInterface(CI.nsIRDFLiteral).Value;
      }
      log("Current version is " + version);
      return version;
    } catch (e) {
      log("getVersion(): " + e);
    }
  },

  /**
   * Return true if a given extension is installed, else return false
   */
  isInstalled: function(eID) {
    //log('Checking for ' + eID);
    var em;
    var loc;
    try {
      // Get the extensions manager
      em = CC['@mozilla.org/extensions/manager;1'].
                  getService(CI.nsIExtensionManager);
      // Try to get the install location
      loc = em.getInstallLocation(eID);
      return loc !== null;
    } catch (e) {
      log("isInstalled(): " + e);
    }    
  },

  /**
   * Check whether a given extension is disabled by an user
   */
  isUserDisabled: function(eID) {
    //log('Checking for ' + eID);
    try { 
      var extensionsDS= CC["@mozilla.org/extensions/manager;1"].
	             getService(CI.nsIExtensionManager).datasource;
      // We have to build the relevant resources to work with the
      // GetTarget function.
      var element = this.rdfService.GetResource("urn:mozilla:item:" + eID);
      var rdfInstall = this.rdfService.
                 GetResource("http://www.mozilla.org/2004/em-rdf#userDisabled");
      var userDisabled = extensionsDS.GetTarget(element, rdfInstall, true);
      // If the extension is disabled by the user "true" should be
      // returned, so we cast our result a little bit.
      var userDisabled = userDisabled.QueryInterface(CI.nsIRDFLiteral).Value;
      return userDisabled; 
      } catch (e) {
        // If the extensions are not disabled just return "false".
	if(e.toString() === "TypeError: userDisabled is null") {
	  return false;
      } else {
	// If there occurred a different error than the above mentioned,
        // print it.
	log("isDisabled(): " + e);
      }
    }
  }, 

  /**
   * Uninstall a given extension
   */
  uninstallExtension: function(eID) {
    log('Uninstalling ' + eID);
    var em;
    try {
      // Get the extensions manager
      em = CC['@mozilla.org/extensions/manager;1'].
                 getService(CI.nsIExtensionManager);
      // Try to get the install location
      em.uninstallItem(eID);
    } catch (e) {
      log("uninstallExtension(): " + e);
    }
  },

  /**
   * Restart the browser using nsIAppStartup
   */
  restartBrowser: function() {
    log("Restarting the application ..");
    var appstart;
    try {
      appStartup = CC['@mozilla.org/toolkit/app-startup;1'].
                          getService(CI.nsIAppStartup);
      // If this does not work, use 'eForceQuit'
      appStartup.quit(CI.nsIAppStartup.eAttemptQuit|CI.nsIAppStartup.eRestart);
    } catch (e) {
      log("restartBrowser(): " + e);
    }
  },

  isFirefox4: function() {
    // Due to some changes in Firefox 4 (notably the replacement of the
    // nsIExtensionmanager by the AddonManager) we check the FF version now
    // to ensure compatibility.
    var appInfo = CC['@mozilla.org/xre/app-info;1'].
	    getService(CI.nsIXULAppInfo);
    var versComp = CC['@mozilla.org/xpcom/version-comparator;1'].
	    getService(CI.nsIVersionComparator);
    if (versComp.compare(appInfo.version, "4.0a1") >= 0) {
      this.ff4 = true;
    } else {
      this.ff4 = false;
    }
  },

  /**
   * Show a warning if the whole profile has to be updated and not just our
   * extension
   */

  checkProfileUpdate: function() {
    log("Checking whether we have to update the profile ..");
    try {
      if (this.prefsHandler.getStringPref(
               'extensions.jondofox.profile_version') !== this.JDF_VERSION &&
          this.prefsHandler.getBoolPref('extensions.jondofox.update_warning')) {
          this.jdfUtils.showAlertCheck(this.jdfUtils.
            getString('jondofox.dialog.attention'), this.jdfUtils.
            getString('jondofox.dialog.message.profileupdate'), 'update');
          return true;
      }
      return false;
    } catch (e) {
      log("checkUpdateProfile(): " + e);
    }
  },

  // Setting the user agent for the different proxy states
  setUserAgent: function(state) {
    var p;
    var userAgent;
    log("Setting user agent for: " + state);
    switch(state) {
      case (this.STATE_JONDO): 
        for (p in this.jondoUAMap) {
          this.prefsHandler.setStringPref(p,
               this.prefsHandler.getStringPref(this.jondoUAMap[p]));
        }
        //Check whether we had a Tor UA before. If so, the value of the pref
        //is not equal to "en-us" and we change it back to JonDoFox values. (Of
        //course, this does not mean that we really had a Tor UA before, maybe
        //the user changed the pref manually (and got a warning). But we can
        //safely ignore this case. 
        if (this.prefsHandler.getStringPref("intl.accept_languages") !== 
            "en-us") {
          this.settingLocationNeutrality("");
        }
	break;
      case (this.STATE_TOR):
        for (p in this.torUAMap) {
          this.prefsHandler.setStringPref(p,
               this.prefsHandler.getStringPref(this.torUAMap[p]));
        }
        if (this.prefsHandler.getStringPref("intl.accept_languages") !== 
            "en-us, en") {
          this.settingLocationNeutrality("tor.");
        }
        break;
      case (this.STATE_CUSTOM):
	userAgent = this.prefsHandler.getStringPref(
			       'extensions.jondofox.custom.user_agent');
        if (userAgent === 'jondo') {
          for (p in this.jondoUAMap) {
            this.prefsHandler.setStringPref(p,
             this.prefsHandler.getStringPref(this.jondoUAMap[p]));
          }
          if (this.prefsHandler.getStringPref("intl.accept_languages") !== 
            "en-us") {
          this.settingLocationNeutrality("");
          }
        } else if (userAgent === 'tor') {
          for (p in this.torUAMap) {
            this.prefsHandler.setStringPref(p,
               this.prefsHandler.getStringPref(this.torUAMap[p]));
	  }
          if (this.prefsHandler.getStringPref("intl.accept_languages") !== 
            "en-us, en") {
          this.settingLocationNeutrality("tor.");
          }
        } else {
	  this.clearUAPrefs();
        }
	break;
      case (this.STATE_NONE):
	this.clearUAPrefs();
	break;
      default:
	log("We should not be here!");
        break;
    }
  },

  // We get the original values (needed for proxy = none and if the user 
  // chooses the unfaked UA for her custom proxy) if we clear the relevant
  // preferences.
  clearUAPrefs: function() {
    var branch;
    try {
      // We only have to reset the values if this has not yet been done.
      // For instance, if there was no previous proxy set before and now the 
      // user uses a not well configured custom one, the values are already set.
      if (this.prefsHandler.getStringPref('general.useragent.override') !==
          null) {
        branch = CC['@mozilla.org/preferences-service;1']
                   .getService(CI.nsIPrefBranch);
        branch.clearUserPref('general.useragent.override');
        branch.clearUserPref('general.appname.override');
        branch.clearUserPref('general.appversion.override');
        branch.clearUserPref('general.useragent.vendor');
        branch.clearUserPref('general.useragent.vendorSub');
        branch.clearUserPref('general.platform.override');
        branch.clearUserPref('general.oscpu.override');
        branch.clearUserPref('general.buildID.override');
        branch.clearUserPref('general.productsub.override');
        if (this.prefsHandler.getStringPref("intl.accept_languages") !== 
            "en-us") {
          this.settingLocationNeutrality("");
        }
      }
    } catch (e) {
      log("clearUAPrefs(): " + e);
    }
  },

  settingLocationNeutrality: function(torString) {
    this.prefsHandler.setStringPref("intl.accept_languages", 
         this.prefsHandler.getStringPref(
         "extensions.jondofox." + torString + "accept_languages"));
    this.prefsHandler.setStringPref("intl.accept_charsets", 
         this.prefsHandler.getStringPref(
         "extensions.jondofox." + torString + "accept_charsets"));
  },

  // First, we check the mimetypes.rdf in order to prevent the user from
  // opening automatically an external helper app. If we find a MIME-type 
  // which is opened automatically we correct this. 
  // Second, we look if someone has set his feed prefs in a way that they 
  // are automatically passed to an external reader. If this is the case, we
  // set the value silently back to "ask".
  // If it is the first start after a new installation, we do not show the
  // warning in order to not confuse the user.

  firstMimeTypeCheck: function() {
    try {
      var feedType =  [this.jdfUtils.getString('jondofox.feed'),
                       this.jdfUtils.getString('jondofox.audiofeed'),
                       this.jdfUtils.getString('jondofox.videofeed')];
      var feedArray = ["feeds", "audioFeeds", "videoFeeds"];
      if (this.prefsHandler.getBoolPref('extensions.jondofox.new_profile')) {
        this.correctExternalApplications(true);
        for (i = 0; i < 3; i++) {
          if (this.prefsHandler.getStringPref(
	      'browser.' + feedArray[i] + '.handler') === "reader" && 
	      this.prefsHandler.getStringPref(
              'browser.' + feedArray[i] + '.handler.default') === "client") {
            this.prefsHandler.setStringPref(
              'browser.'+ feedArray[i] + '.handler', "ask");
	  }
        }
        this.prefsHandler.setBoolPref('extensions.jondofox.new_profile', false);
      } else {
        this.correctExternalApplications(false);
        for (i = 0; i < 3; i++) {
          if (this.prefsHandler.getStringPref(
	      'browser.' + feedArray[i] + '.handler') === "reader" && 
	      this.prefsHandler.getStringPref(
              'browser.' + feedArray[i] + '.handler.default') === "client") {
            this.prefsHandler.setStringPref(
                'browser.'+ feedArray[i] + '.handler', "ask");
            if (this.prefsHandler.getBoolPref(
                              'extensions.jondofox.preferences_warning')) {
              this.jdfUtils.showAlert(this.jdfUtils.
                getString('jondofox.dialog.attention'), this.jdfUtils.
                formatString('jondofox.dialog.message.automaticAction',
		[feedType[i]])); 
	    } 
          }
        }
      }
    } catch (e) {
      log("firstMimeTypeCheck(): " + e);
    }
  },

  // First, we check whether we found the unknownContentType dialog. If so
  // we add two eventlisteners, one to the checkbox and one to the radiobutton.
  // The reason is that we need both, otherwise the users could just select
  // the 'save'-radiobutton then select the checkbox and finally select the
  // 'open'-radiobutton.
  // If we did not find the dialog we try to find the other external app
  // dialog. If this does not succeed, we remove the eventlistener
  // because we got the wrong dialog...
   
  getUnknownContentTypeDialog: function() {
    try {
      this.removeEventListener("load", JDFManager.prototype.
		      getUnknownContentTypeDialog, false);
      var dialogParam; 
      var dialogMessage; 
      var checkbox = this.document.getElementById("rememberChoice");
      var checkboxNews = this.document.getElementById("remember");
      var radioOpen = this.document.getElementById("open");
      var radioSave = this.document.getElementById("save");
      var type = this.document.getElementById("type");
      var handlerInfo;
      if (checkbox && radioOpen) {
          // We need a Timeout here because type.value or getting the 
          // MIME-/filetype via the filename gives null back if executed at 
          // once. But without getting the type we cannot discriminate between
          // showing the different overlays...
	  this.setTimeout(JDFManager.prototype.showUnknownContentTypeWarnings, 5, 
                          type, checkbox, radioOpen, radioSave, this);
      } else if (checkboxNews) {
        // 10 arguments are passed to this external app window. We take the
        // seventh, the handlerInfo to show the file type to the user. For 
        // details, see: chrome://mozapps/content/handling/dialog.js
        handlerInfo = this.arguments[7].QueryInterface(CI.nsIHandlerInfo);
        type = handlerInfo.type;
        if (type !== "mailto") { 
	  this.document.loadOverlay(
               "chrome://jondofox/content/external-appDialog.xul", null);
          this.setTimeout(JDFManager.showWarning, 50, this, true, true);
          checkboxNews.addEventListener("click", function() {JDFManager.
		    checkboxNewsChecked(checkboxNews, type);}, false);
        }
      } else if (this.arguments[0]) {
        log("We got probably a commonDialog...");
        dialogParam = this.arguments[0].QueryInterface(CI.nsIDialogParamBlock);
        log("Let's check whether we've got a NoScript pdf-dialog...");
        dialogMessage = dialogParam.GetString(0).substr(0,10000).trim().
                        toLowerCase();
        if (dialogMessage.indexOf(".pdf") !== -1) {
          this.document.loadOverlay(
               "chrome://jondofox/content/external-pdfPlugin.xul", null);
          this.setTimeout(JDFManager.prototype.showWarning, 200, this, true, false);
        }
      } else {
        log("Nothing found...");
      } 
    } catch (e) {
       log("getUnknownContentTypeDialog(): " + e);
    }
  },

  showUnknownContentTypeWarnings: function(type, checkbox, radioOpen,
                                           radioSave, window) {
    try {
      var i;
      var normalBox;
      var fileTypeExists = false;
      normalBox = window.document.getElementById("normalBox").
	      getAttribute("collapsed");
      var titleString = window.document.title.trim().toLowerCase();
      var fileExtension = titleString.substring(titleString.length - 4, 
                          titleString.length);

      // We cannot just use the MIME-Type here because it is set according
      // to the delivered content-type header and some other sophisticated means
      // (see nsURILoader.cpp and nsExternalHelperAppService.cpp). Some servers
      // suck and deliver the wrong MIME-Type (e.g. application/octetstream)
      // but the file is a .pdf or a .doc, though. In this case checking the 
      // MIME-Type would not result in showing the proper warning dialog. 
      // It is, therefore, safer to use the title of the window which contains
      // the filename and its extension.
      // If the XUL-window is collapsed then we only see a "Save file" and a
      // "Cancel"-Button. This happens e.g. if the file is a binary or a DOS-
      // executable. Hence, we do not need to show the warning. Besides checking
      // whether the normalBox is collapsed we check in the first else if 
      // clause other file extensions. These are part of a whitelist whose 
      // members are not dangerous if one opens them directly. Thus, again,
      // no sign of a warning.

      if (fileExtension === ".pdf") {
        window.document.loadOverlay("chrome://jondofox/content/external-pdf.xul",
                                    null);
        window.setTimeout(JDFManager.prototype.showWarning, 200, window, false, false);
      } else if (fileExtension === ".doc" || fileExtension === ".rtf") {
        window.document.loadOverlay("chrome://jondofox/content/external-doc.xul",
                                    null);
        window.setTimeout(JDFManager.prototype.showWarning, 50, window, false, false);
      } else if (normalBox ||
                 fileExtension === ".tex") {
      //do nothing: we do not want any warning here because the user cannot
      //open these files directly or they are not dangerous, thus we return
	return;
      } else {
        window.document.loadOverlay("chrome://jondofox/content/external-app.xul",
                                    null);
        window.setTimeout(JDFManager.prototype.showWarning, 50, window, false, false);
      }
        checkbox.addEventListener("click",function() {JDFManager.prototype.
	     checkboxChecked(radioOpen, checkbox, type, window);}, false);
        radioOpen.addEventListener("click", function() {JDFManager.prototype.
	     checkboxChecked(radioOpen, checkbox, type, window);}, false);
    } catch (e) {
      log("showUnknownContentTypeWarnings(): " + e);
    }
  },

  /*overlayObserver: { 
    observe: function(subject, topic, data) {
      switch (topic) {
        case 'xul-overlay-merged':
          var uri = subject.QueryInterface(CI.nsIURI);
          log("uri.spec ist: " + uri.spec);
          if (uri.spec == "chrome://jondofox/content/
          break;
        default:
          log("Something went wrong concerning the overlayObserver: " + topic);
         break;
      }
    }
  },*/

  showWarning: function(window, modifyStyle, appDialog) {
    try {
      var warningHidden;
      if (modifyStyle) {
        var windowWidth;
        var style;
        windowWidth = window.innerWidth;
        log("The width of the window is: " + windowWidth);
        style = window.document.getElementById("warning").getAttribute("style");
        style = style + "width: " + windowWidth + "px;";
        window.document.getElementById("warning").setAttribute("style", style);
        if (appDialog) {
          var persist = "screenX screenY";
          window.document.getElementById("handling").setAttribute("persist",
                                                                   persist);
          persist = window.document.getElementById("handling").
                    getAttribute("persist");
          log("The persist Attribute is now: " + persist);
        }
      }
      window.document.getElementById("warning").hidden = false;
      warningHidden = window.document.getElementById("warning").hidden;
      log("The hidden attribute is now set to: " + warningHidden);
      window.sizeToContent();
    } catch (e) {
      log("showWarning(): " +e);
    }
  },

  // Let's see whether the checkbox and the approproate radiobutton is selected.
  // If so we show a warning dialog and disable the checkbox.
  
  checkboxChecked: function(radioOpen, checkbox, type, window) {
    var settingsChange = window.document.getElementById("settingsChange");
    if (checkbox.checked && radioOpen.selected) {
      JDFManager.prototype.jdfUtils.showAlert(JDFManager.prototype.jdfUtils.
        getString('jondofox.dialog.attention'), JDFManager.prototype.jdfUtils.
        formatString('jondofox.dialog.message.automaticAction', [type.value]));
      checkbox.checked = false;
      //If the settingschange element is still shown, hide it again in a way
      //it is normally done. This "feature" is just here in order to give the
      //user the ordinary experience concerning the unknowcontenttype-dialog.
      if (!settingsChange.hidden) {
        settingsChange.hidden = true; 
        window.sizeToContent();
      }
    }
  },         

  // Well, and the other dialog concerning external apps contains no Open-
  // button and is therefore treated a bit differently...

  checkboxNewsChecked: function(checkboxNews, type) {
    if (checkboxNews.checked) {
      JDFManager.prototype.jdfUtils.showAlert(JDFManager.prototype.jdfUtils.
        getString('jondofox.dialog.attention'), JDFManager.prototype.jdfUtils.
        formatString('jondofox.dialog.message.automaticAction', [type]));
      checkboxNews.checked = false;
    }
  },

  observeMimeTypes: function() {
    var rdfObserver = {
      onChange : function(aData, aRes, aProp, aOldTarget, aNewTarget) {
        try {
	  var correctedValue;
          var wm;
          var applicationPane;
	  var newTargetValue = aNewTarget.QueryInterface(CI.nsIRDFLiteral).Value;
          if (aProp.Value === "http://home.netscape.com/NC-rdf#alwaysAsk" &&
              newTargetValue === "false") {
	    correctedValue = JDFManager.prototype.
		    correctExternalApplications(false);
            if (correctedValue) {
	      wm = CC['@mozilla.org/appshell/window-mediator;1']
		          .getService(CI.nsIWindowMediator);
              applicationPane = wm.getMostRecentWindow(null);
              // Is the recent window really the application pane?
              if (applicationPane.document.getElementById("handlersView")) {
                applicationPane.addEventListener("unload", function()
                    {JDFManager.prototype.appPaneReload(applicationPane);}, false);
                applicationPane.close(); 
              }
            }
          }
        } catch (e) {
	  log("rdfObserver: " + e);
        }
      }
    }
    
    // For the following few lines of code see nsHandlerService.js
    if (!this.mimeTypesDs) {
	var mimeFile = this.directoryService.get("UMimTyp", CI.nsIFile);
        var ioService = CC['@mozilla.org/network/io-service;1'].
	                   getService(CI.nsIIOService);
        var fileHandler = ioService.getProtocolHandler("file").
	                  QueryInterface(CI.nsIFileProtocolHandler);
        this.mimeTypesDs = this.rdfService.GetDataSourceBlocking(fileHandler.
					   getURLSpecFromFile(mimeFile));
        
    }
    this.mimeTypesDs.AddObserver(rdfObserver);
  },

  // After changing back to a safe value we have to correct the label as well.
  // The only method I am aware of at this moment is to close and reload the
  // applictaion pane. The result is not exactly the same as correcting the
  // label but it is less confusing than doing nothing... This does not work
  // regarding feeds because they are pref-based and do not use mimetypes.rdf.

  appPaneReload: function(applicationPane) {
    applicationPane.openDialog(
	      "chrome://browser/content/preferences/preferences.xul");
    applicationPane.removeEventListener("unload", function()
                           {JDFManager.prototype.appPaneReload(applicationPane);}, false);
  },

  correctExternalApplications: function(firstProgramStart) {
    try {
      var changedValue = false;
      var handlerService = CC['@mozilla.org/uriloader/handler-service;1'].
	                       getService(CI.nsIHandlerService);
      var handledMimeTypes = handlerService.enumerate();
      while (handledMimeTypes.hasMoreElements()) {
        var handledMimeType = handledMimeTypes.getNext().
            QueryInterface(CI.nsIHandlerInfo);
        var mimeType = handledMimeType.type;
        if (!handledMimeType.alwaysAskBeforeHandling && 
            mimeType !== "mailto" && handledMimeType.preferredAction > 1) {
	  if (!firstProgramStart) {
            this.jdfUtils.showAlert(this.jdfUtils.
              getString('jondofox.dialog.attention'), this.jdfUtils.
              formatString('jondofox.dialog.message.automaticAction', 
              [mimeType]));
          }
          handledMimeType.alwaysAskBeforeHandling = true;
          handlerService.store(handledMimeType);
          changedValue = true;
        }        
      }
      if (changedValue) {
        return true;
      } else {
	return false;
      }
    } catch (e) {
      log("correctExternalApplications(): " + e);
    }
  },

  // 'No proxy list' implementation ///////////////////////////////////////////

  // A list of URIs
  noProxyList: [],

  // Check if 'uri' is on the list
  noProxyListContains: function(uri) {
    //log("Lookup URI: " + uri);
    try {
      if (uri in this.convert(this.noProxyList)) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      log("noProxyListContains(): " + e);
    }
  },
 
  // XXX: Rather use RegExp here for performance reasons?
  // Enable value lookup by converting array to hashmap
  convert: function(a) {
    var i;
    var o = {};
    for(i=0; i<a.length; i++) {
      o[a[i]]='';
    }
    return o;
  },

  // Add an element to the list
  noProxyListAdd: function(uri) {
    log("No proxy list add: " + uri); 
    try {
      // Add URI if it is not already on the list
      if (!this.noProxyListContains(uri)) {
        this.noProxyList.push(uri);
      } else {
        log("NOT adding " + uri + " since it is already on the list");
      }
    } catch (e) {
      log("noProxyListAdd(): " + e);
    }
  },

  // Remove an URI from the list
  noProxyListRemove: function(uri) {
    log("No proxy list remove: " + uri);
    try {
      this.noProxyList.splice(this.noProxyList.indexOf(uri), 1);
    } catch (ex) {
      log("noProxyListRemove(): " + ex);
    } 
  },

  // Proxy and state management ///////////////////////////////////////////////

  // Set the value of the 'STATE_PREF'  
  setState: function(state) {
    try {
      this.prefsHandler.setStringPref(this.STATE_PREF, state);
    } catch (e) {
      log("setState(): " + e);
    }  
  },
  
  // Return the value of the 'STATE_PREF'
  getState: function() {
    try {
      return this.prefsHandler.getStringPref(this.STATE_PREF);
    } catch (e) {
      log("getState(): " + e);
    }
  },

  // Set state to NONE and disable the proxy
  disableProxy: function() {
    try {
      // Set the state and call disable on the proxy manager
      this.setState(this.STATE_NONE);
      this.proxyManager.disableProxy();
    } catch (e) {
      log("disableProxy(): " + e);
    }
  },

  // Set the JonDoFox-extension into a certain proxy state
  // Return true if the state has changed, false otherwise
  setProxy: function(state) {
    log("Setting proxy state to '" + state + "'");
    try {
      // Store the previous state to detect state changes
      var previousState = this.getState();
      // STATE_NONE --> straight disable
      if (state === this.STATE_NONE) {
        this.disableProxy();
      } else {
        // State is not 'STATE_NONE' --> enable
        switch (state) {
          case this.STATE_JONDO:
            // Ensure that share_proxy_settings is unset
            this.prefsHandler.setBoolPref("network.proxy.share_proxy_settings", false);
            // Set proxies for all protocols but SOCKS
            this.proxyManager.setProxyAll('127.0.0.1', 4001);
            this.proxyManager.setProxySOCKS('', 0, 5);
            // Set default exceptions
            this.proxyManager.setExceptions(this.prefsHandler.
                                 getStringPref(this.NO_PROXIES));
            break; 
 
          case this.STATE_TOR:
	    var prefix = "extensions.jondofox.tor."
            // Ensure that share_proxy_settings is unset
            this.prefsHandler.setBoolPref("network.proxy.share_proxy_settings", false);
            this.proxyManager.setProxyAll('', 0);
            // Set SOCKS or if the user wishes a HTTP/S-proxy additionally
	    this.proxyManager.setProxyHTTP(
                 this.prefsHandler.getStringPref(prefix + "http_host"),
		 this.prefsHandler.getIntPref(prefix + "http_port"));
	    this.proxyManager.setProxySSL(
		 this.prefsHandler.getStringPref(prefix + "ssl_host"),
		 this.prefsHandler.getIntPref(prefix + "ssl_port"));
            this.proxyManager.setProxySOCKS("127.0.0.1", 9050, 5);
            this.proxyManager.setSocksRemoteDNS(true);
            // Set default exceptions
            this.proxyManager.setExceptions(this.prefsHandler.
                                 getStringPref(this.NO_PROXIES));
            break;

          case this.STATE_CUSTOM:
            var prefix = "extensions.jondofox.custom.";
            // Set share_proxy_settings to custom.share_proxy_settings
            this.prefsHandler.setBoolPref("network.proxy.share_proxy_settings", 
                this.prefsHandler.getBoolPref(prefix + "share_proxy_settings"));
            this.proxyManager.setProxyHTTP(
                this.prefsHandler.getStringPref(prefix + "http_host"),
                this.prefsHandler.getIntPref(prefix + "http_port"));
            this.proxyManager.setProxySSL(
                this.prefsHandler.getStringPref(prefix + "ssl_host"),
                this.prefsHandler.getIntPref(prefix + "ssl_port"));
            this.proxyManager.setProxyFTP(
                this.prefsHandler.getStringPref(prefix + "ftp_host"),
                this.prefsHandler.getIntPref(prefix + "ftp_port"));
            this.proxyManager.setProxyGopher(
                this.prefsHandler.getStringPref(prefix + "gopher_host"),
                this.prefsHandler.getIntPref(prefix + "gopher_port"));
            this.proxyManager.setProxySOCKS(
                this.prefsHandler.getStringPref(prefix + "socks_host"),
                this.prefsHandler.getIntPref(prefix + "socks_port"),
                this.prefsHandler.getIntPref(prefix + "socks_version"));
            this.proxyManager.setExceptions(
                this.prefsHandler.getStringPref(this.NO_PROXIES));
            break;

          default:
            log("!! Unknown proxy state: " + state);
            return false;
        }
        // Set the state first and then enable
        this.setState(state);
        this.proxyManager.enableProxy();
      }
      // Return true if the state has changed, false otherwise
      if (previousState === state) {
        return false;
      } else {
        return true;
      }
    } catch (e) {
      log("setProxy(): " + e);
    }
  },

  // Clear all cookies, e.g. when switching from one state to another
  clearAllCookies: function() {
    log("Clearing all cookies");
    try {
      CC["@mozilla.org/cookiemanager;1"].getService(CI.nsICookieManager).
                                            removeAll();
    } catch (e) {
      log("clearAllCookies(): " + e);
    }
  },

  // Implement nsIObserver ////////////////////////////////////////////////////
  
  observe: function(subject, topic, data) {
    try {
      switch (topic) {        
        // Just for FF < 4 
	case 'app-startup':
	  log("Got topic --> " + topic);
          var observers = CC['@mozilla.org/observer-service;1'].
	                    getService(CI.nsIObserverService);
          observers.addObserver(this, "profile-after-change", true);	  
          break;	

        case 'profile-after-change':
          log("Got topic --> " + topic);
          this.registerObservers();
          break;
        
        case 'quit-application-granted':
          log("Got topic --> " + topic);
          // Clear preferences on shutdown after uninstall
          if (this.clean) {
            this.cleanup();
          }
          // Unregister observers
          this.unregisterObservers();
          break;
        
        case 'final-ui-startup':
          log("Got topic --> " + topic);
          // Check conditions on startup
          this.onUIStartup();
          log("Finished UI startup");
          break;

        case 'em-action-requested':
          // Filter on the item ID here to detect deinstallation etc.
          subject.QueryInterface(CI.nsIUpdateItem);
          if (subject.id === "{437be45a-4114-11dd-b9ab-71d256d89593}") {
            log("Got topic --> " + topic + ", data --> " + data);
            if (data === "item-uninstalled" || data === "item-disabled") {
              // Uninstall or disable
              this.clean = true;
              // If we are going to uninstall .. remove jondofox pref branch
              if (data === "item-uninstalled") {
                this.uninstall = true;
              }
            } else if (data === "item-cancel-action") {
              // Cancellation ..
              this.clean = false;
              this.uninstall = false;
            }
          }
          break;
        
        // We are trying to get the unknownContentType dialog in order to 
        // prevent the user from choosing an external helper app automatically.
        // Unfortunatley there is no special notification (really?), so we have
        // to do it this way...

        case 'domwindowopened':
	subject.addEventListener("load", JDFManager.prototype.getUnknownContentTypeDialog, false);
	  break;

        case 'xul-window-destroyed':
          // Get the index of the closed window
          //var i = this.getWindowCount();
          //log("Window " + i + " --> " + topic);
          
          // Not necessary since closing the last window will also cause
          // 'quit-application-granted' .. let the code stay here though:
          //   http://forums.mozillazine.org/viewtopic.php?t=308369
          /* if (i == 0 && this.clean) { 
            this.cleanup(); 
            this.unregisterObservers()
          } */
          break;

        case 'nsPref:changed':
          // If someone wants to change the Tor prefs manually we have to 
	  // reset the proxy accordingly
          if (data === 'extensions.jondofox.tor.http_host' ||
	      data === 'extensions.jondofox.tor.http_port') {
            this.proxyManager.setProxyHTTP(
	        this.prefsHandler.
		     getStringPref("extensions.jondofox.tor.http_host"),
                this.prefsHandler.
		     getIntPref("extensions.jondofox.tor.http_port"));
          }

	  else if (data === 'extensions.jondofox.tor.ssl_host' ||
                   data === 'extensions.jondofox.tor.ssl_port') {
            this.proxyManager.setProxySSL(
                this.prefsHandler.
		     getStringPref("extensions.jondofox.tor.ssl_host"),
                this.prefsHandler.
		     getIntPref("extensions.jondofox.tor.ssl_port"));
          }

          // Do not allow to accept ALL cookies
          else if (data === 'network.cookie.cookieBehavior') {
	    if (this.prefsHandler.getIntPref(data) === 0) {
	      this.prefsHandler.setIntPref(data, 1);
              // Warn the user if she has not disabled preference warnings
              if (this.prefsHandler.
                    getBoolPref('extensions.jondofox.preferences_warning')) {
                this.jdfUtils.showAlertCheck(this.jdfUtils.
                  getString('jondofox.dialog.attention'), this.jdfUtils.
                  getString('jondofox.dialog.message.cookies'), 'preferences');
              }
            } 
	  }
	  // Do not allow to disable Safecache function
	  else if (data === 'stanford-safecache.enabled') {
	    if (!this.prefsHandler.getBoolPref(data)) {
	      this.prefsHandler.setBoolPref(data, true);
              // Warn the user if she has not disabled preference warnings
              if (this.prefsHandler.
                    getBoolPref('extensions.jondofox.preferences_warning')) {
                this.jdfUtils.showAlertCheck(this.jdfUtils.
                  getString('jondofox.dialog.attention'), this.jdfUtils.
                  getString('jondofox.dialog.message.safecache'), 
                  'preferences');
              }
            } 
	  }
	  
          // Feeds are regulated by prefs, so we have to handle them (feeds, 
          // audiofeeds and videofeeds) here...
          else if (data === 'browser.feeds.handler') {
	    if (this.prefsHandler.getStringPref(data) !== "ask" &&
                this.prefsHandler.
                getStringPref('browser.feeds.handler.default') === "client") {
              this.jdfUtils.showAlert(this.jdfUtils.
                getString('jondofox.dialog.attention'), this.jdfUtils.
                formatString('jondofox.dialog.message.automaticAction', 
		[this.jdfUtils.getString('jondofox.feed')]));
	      this.prefsHandler.setStringPref('browser.feeds.handler', "ask");  
            }
	  }

	  else if (data === 'browser.feeds.handler.default') {
	    if (this.prefsHandler.getStringPref(data) === "client" && 
                this.prefsHandler.getStringPref('browser.feeds.handler') !==
                "ask") {
              this.jdfUtils.showAlert(this.jdfUtils.
                getString('jondofox.dialog.attention'), this.jdfUtils.
                formatString('jondofox.dialog.message.automaticAction',
		[this.jdfUtils.getString('jondofox.feed')]));
              this.prefsHandler.setStringPref(data, 
		   this.prefsHandler.getStringPref(this.FEEDS_PREF));
	    }
            // Now we adjust the last selected value of the pref...
            this.prefsHandler.setStringPref(this.FEEDS_PREF, 
		 this.prefsHandler.getStringPref(data));
          }

          // The same as above applies to 'browser.audioFeeds.handler' and 
          // 'browser.audioFeeds.handler.default' respectively.
          else if (data === 'browser.audioFeeds.handler') {
	    if (this.prefsHandler.getStringPref(data) !== "ask" &&
                this.prefsHandler.getStringPref(
                     'browser.audioFeeds.handler.default') === "client") {
              this.jdfUtils.showAlert(this.jdfUtils.
                getString('jondofox.dialog.attention'), this.jdfUtils.
                formatString('jondofox.dialog.message.automaticAction', 
		[this.jdfUtils.getString('jondofox.audiofeed')]));
              this.prefsHandler.setStringPref('browser.audioFeeds.handler',
                "ask");   
            }
	  }

          else if (data === 'browser.audioFeeds.handler.default') {
	    if (this.prefsHandler.getStringPref(data) === "client" && 
                this.prefsHandler.
                     getStringPref('browser.audioFeeds.handler') !== "ask") {
              this.jdfUtils.showAlert(this.jdfUtils.
                getString('jondofox.dialog.attention'), this.jdfUtils.
                formatString('jondofox.dialog.message.automaticAction',
		[this.jdfUtils.getString('jondofox.audiofeed')]));
              this.prefsHandler.setStringPref(data, 
		   this.prefsHandler.getStringPref(this.AUDIO_FEEDS_PREF));
              
	    }
	    this.prefsHandler.setStringPref(this.AUDIO_FEEDS_PREF, 
		 this.prefsHandler.getStringPref(data));
	  }

          // And yes, the same applies to 'browser.audioFeeds.handler' and 
          // 'browser.vudioFeeds.handler.default' respectively.
          else if (data === 'browser.videoFeeds.handler') {
	    if (this.prefsHandler.getStringPref(data) !== "ask" &&
                this.prefsHandler.getStringPref(
                'browser.videoFeeds.handler.default') === "client") {
              this.jdfUtils.showAlert(this.jdfUtils.
                getString('jondofox.dialog.attention'),  this.jdfUtils.
                formatString('jondofox.dialog.message.automaticAction',
		[this.jdfUtils.getString('jondofox.videofeed')]));       
              this.prefsHandler.setStringPref('browser.videoFeeds.handler',
                "ask");   
            }
	  }

	  else if (data === 'browser.videoFeeds.handler.default') {
	    if (this.prefsHandler.getStringPref(data) === "client" && 
                this.prefsHandler.
                     getStringPref('browser.videoFeeds.handler') !== "ask") {
              this.jdfUtils.showAlert(this.jdfUtils.
                getString('jondofox.dialog.attention'), this.jdfUtils.
                formatString('jondofox.dialog.message.automaticAction',
		[this.jdfUtils.getString('jondofox.videofeed')]));
              this.prefsHandler.setStringPref(data,
		   this.prefsHandler.getStringPref( this.VIDEO_FEEDS_PREF));
	    }
	    this.prefsHandler.setStringPref(this.VIDEO_FEEDS_PREF, 
		 this.prefsHandler.getStringPref(data));
	  }
          
          else if ((data === 'intl.accept_languages' || 
            data === 'intl.accept_charsets') && this.prefsHandler.
            getStringPref('general.useragent.override') === this.prefsHandler.
            getStringPref('extensions.jondofox.tor.useragent_override')) {
            // Do nothing here because the pref changed but it was for 
            // imitating Tor properly after the Tor UA has been activated.
          }

          // Check if the changed preference is on the stringprefsmap...
          else if (data in this.stringPrefsMap) {
            log("Pref '" + data + "' is on the string prefsmap!");
            // If the new value is not the recommended ..
            if (this.prefsHandler.getStringPref(data) !== 
                 this.prefsHandler.getStringPref(this.stringPrefsMap[data]) &&
                 this.prefsHandler.
                 getBoolPref('extensions.jondofox.preferences_warning')) {
              // ... warn the user
              this.jdfUtils.showAlertCheck(this.jdfUtils.
                getString('jondofox.dialog.attention'), this.jdfUtils.
                getString('jondofox.dialog.message.prefchange'), 'preferences');
            } else {
              log("All good!");
            }
          }
          // Now we have all the external app warnings...
          else if (data in this.externalAppWarnings) {
	    log("Pref '" + data + "' is on the external app warning map!");
            if (!this.prefsHandler.getBoolPref(data) && this.prefsHandler.
		      getBoolPref('extensions.jondofox.preferences_warning')) {
               // ... warn the user
              this.jdfUtils.showAlertCheck(this.jdfUtils.
                getString('jondofox.dialog.attention'), this.jdfUtils.
                getString('jondofox.dialog.message.appWarning'), 'preferences');
              this.prefsHandler.setBoolPref(data, true);
            } else {
              log("All good!");
            }
          }
	  // or on the boolean prefsmap...
          else if (data in this.boolPrefsMap) {
            log("Pref '" + data + "' is on the boolean prefsmap!");
            // If the new value is not the recommended ..
            if (this.prefsHandler.getBoolPref(data) !== this.prefsHandler.
                     getBoolPref(this.boolPrefsMap[data]) && this.prefsHandler.
                     getBoolPref('extensions.jondofox.preferences_warning')) {
              // ... warn the user
              this.jdfUtils.showAlertCheck(this.jdfUtils.
                getString('jondofox.dialog.attention'), this.jdfUtils.
                getString('jondofox.dialog.message.prefchange'), 'preferences');
	    
            } else {
              log("All good!");
            }
          }
	  // or on the integer prefsmap (with the cookie-pref is already dealt).
	  else if (data in this.intPrefsMap && data !== 
                   'network.cookie.cookieBehavior') {
            log("Pref '" + data + "' is on the integer prefsmap!");
            // If the new value is not the recommended ..
            if (this.prefsHandler.getIntPref(data) !== this.prefsHandler.
                   getIntPref(this.intPrefsMap[data]) && this.prefsHandler.
                   getBoolPref('extensions.jondofox.preferences_warning')) {
              // ... warn the user
              this.jdfUtils.showAlertCheck(this.jdfUtils.
                getString('jondofox.dialog.attention'), this.jdfUtils.
                getString('jondofox.dialog.message.prefchange'), 'preferences');
            } else {
              log("All good!");
            }
          }
	  break;
        default:
          log("!! Topic not handled --> " + topic);
          break;
      }
    } catch (ex) {
      log("observe: " + ex);
    }
  },
  
  classDescription: "JonDoFox-Manager",
  classID:          Components.ID("{b5eafe36-ff8c-47f0-9449-d0dada798e00}"),
  contractID:       "@jondos.de/jondofox-manager;1",

  // We need this category only for compatibility to versions < FF4 as the
  // 'profile-after-change'-notification declared in this place does not 
  // work.
  _xpcom_categories: [{
    category: "app-startup",
    service: true
  }],

  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports, CI.nsIObserver,
				  CI.nsISupportsWeakReference, 
				  CI.nsIDialogParamBlock])
};

// XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
// XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([JDFManager]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([JDFManager]);

 
