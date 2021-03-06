/******************************************************************************
 * Copyright 2008-2015, JonDos GmbH
 *
 * JonDoFox extension management and compatibility tasks + utilities
 * TODO: Create another component containing the utils only
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CC = Components.classes;
const CI = Components.interfaces;
const CU = Components.utils;

CU.import("resource://gre/modules/commonjs/toolkit/require.js");

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

var m_debug = CC["@mozilla.org/preferences-service;1"].
  getService(CI.nsIPrefService).getBranch("extensions.jondofox.").
  getBoolPref("debug.enabled");

// Log a message
var log = function(message) {
  if (m_debug) dump("JDFManager :: " + message + "\n");
};

CU.import("resource://gre/modules/XPCOMUtils.jsm");

///////////////////////////////////////////////////////////////////////////////
// Listen for events to delete traces in case of uninstall etc.
///////////////////////////////////////////////////////////////////////////////

// Singleton instance definition
var JDFManager = function() {
  this.wrappedJSObject = this;
  // That CU call has to be here, otherwise it would not work. See:
  // https://developer.mozilla.org/en/JavaScript/Code_modules/Using section
  // "Custom modules and XPCOM components"
  CU.import("resource://jondofox/log4moz.js", this);
  CU.import("resource://jondofox/jdfUtils.jsm", this);
  this.jdfUtils.init();
  var formatter = new this.Log4Moz.BasicFormatter();
  var root = this.Log4Moz.repository.rootLogger;
  log("Created a rootLogger!\n");
  if (m_debug) {
    // We want to have output to standard out.
    var dapp = new this.Log4Moz.DumpAppender(formatter);
    dapp.level = this.Log4Moz.Level["Debug"];
    root.addAppender(dapp);
  }
  // We may want to have JS error console output as well...
  var capp = new this.Log4Moz.ConsoleAppender(formatter);
  capp.level = this.Log4Moz.Level["Info"];
  root.addAppender(capp);

  // Now we are adding a specific logger (JDFManager)...
  this.logger = this.Log4Moz.repository.getLogger("JonDoFox Manager");
  this.logger.level = this.Log4Moz.Level["Debug"];
};

JDFManager.prototype = {
  // Extension version
  VERSION: null,

  // Some preferences
  STATE_PREF: 'extensions.jondofox.proxy.state',
  REF_PREF: 'extensions.jondofox.set_referrer',
  FEEDS_PREF: 'extensions.jondofox.feeds_handler_default',
  AUDIO_FEEDS_PREF: 'extensions.jondofox.audioFeeds_handler_default',
  VIDEO_FEEDS_PREF: 'extensions.jondofox.videoFeeds_handler_default',

  // Possible values of the 'STATE_PREF'
  STATE_NONE: 'none',
  STATE_JONDO: 'jondo',
  STATE_TOR: 'tor',
  STATE_CUSTOM: 'custom',

  // Set this to indicate that cleaning up is necessary
  clean: false,

  // This is set to true if Certificate Patrol is found and our respective
  // checkbox not checked. It helps to optimize the incorporation of Certificate  // Patrol code.
  certPatrol: false,

  // Remove jondofox preferences branch on uninstall only
  uninstall: false,

  // Can we use our improved HTTP Auth defense (available since FF12)?
  ff12: null,

  // In FF 18 the central |getOriginatingURI()| method used to determine
  // whether a resource is third party or not is gone :-/
  notFF18 : null,

  // We need it to enforce privacy.donottrackheader.value
  ff22 : null,

  // We need it for new plugin handling
  ff23 : null,

  // We need it to disable gamepad API
  ff24 : null,


  // We need it to switch to javascript.options.typeinference.content
  ff26 : null,

  ff27 : null,

  // websockets are ready to use for ff29
  ff29 : null,

  // disable loop in ff34
  ff34: null,

  // enable indexed DB in ff35
  ff35: null,

  // disable indexed DB in ff36 again
  ff36: null,

  // disable heartbeat URL and Webspeech in ff37
  ff37: null,
  
  // Used by clear Cache function
  // Set to false to only check minor versions
  isOld : false,
  
  // Used to check if FF >= 38
  // To set specific Prefs at the init function
  isAboveFF38 : true,

  // Do we have already checked whether JonDoBrowser is up-to-date
  jdbCheck: false,

  // Part of a hack to show reliably the about:jondofox page in FF4 after a new
  // version was detected.
  newVersionDetected: false,

  // In FF4 the asynchronous AddOn-Manager leads to the problem that the found-
  // extensions-dialog appears in the background of the browser window. Thus,
  // we avoid starting the dialog as early as in FF < 4 but save the found
  // extensions' names in an array that is checked after the browser window is
  // loaded. If we have extensions that are incompatible we show them in one
  // window and restarting the browser to uninstall them finally after the user
  // clicked on "OK".
  extensionsFound: [],

  filterList: [],

  isNoScriptInstalled: true,

  isCMInstalled: true,

  isCMEnabled: true,

  isNoScriptEnabled: true,

  os: "unsupported",

  jondoProcess: null,

  isJondoInstalled: false,

  jondoExecutable: null,

  jondoArgs: [],

  // Incompatible extensions with their IDs
  extensions: {
    'CuteMenus':'{63df8e21-711c-4074-a257-b065cadc28d8}',
    'RefControl':'{455D905A-D37C-4643-A9E2-F6FEFAA0424A}',
    'SwitchProxy':'{27A2FD41-CB23-4518-AB5C-C25BAFFDE531}',
    'SafeCache':'{670a77c5-010e-4476-a8ce-d09171318839}',
    'Certificate Patrol':'CertPatrol@PSYC.EU',
    'Cookie Monster':'{45d8ff86-d909-11db-9705-005056c00008}',
    // 'UnPlug':'unplug@compunach'
  },

  // Necessary security extensions with their IDs
  necessaryExtensions: {
    'NoScript':'{73a6fe31-595d-460b-a920-fcc0f8843232}',
    'Cookie Controller':'{ac2cfa60-bc96-11e0-962b-0800200c9a66}'
  },

  // If JonDo is set as proxy take these UA-settings
  jondoUAMap: {
    'general.appname.override':'extensions.jondofox.jondo.appname_override',
    'general.appversion.override':'extensions.jondofox.jondo.appversion_override',
    'general.buildID.override':'extensions.jondofox.jondo.buildID_override',
    'general.oscpu.override':'extensions.jondofox.jondo.oscpu_override',
    'general.platform.override':'extensions.jondofox.jondo.platform_override',
    'general.productSub.override':'extensions.jondofox.jondo.productsub_override',
    'general.useragent.override':'extensions.jondofox.jondo.useragent_override',
    'general.useragent.vendor':'extensions.jondofox.jondo.useragent_vendor',
    'general.useragent.vendorSub':'extensions.jondofox.jondo.useragent_vendorSub',
    'intl.accept_languages':'extensions.jondofox.jondo.accept_languages',
    'network.http.accept.default':'extensions.jondofox.jondo.accept_default',
    'image.http.accept':'extensions.jondofox.jondo.image_http_accept',
    'network.http.accept-encoding':'extensions.jondofox.jondo.http.accept_encoding',
    'intl.charset.default':'extensions.jondofox.jondo.default_charset'
  },

  // If Tor is set as proxy take these UA-settings
  torUAMap: {
    'general.appname.override':'extensions.jondofox.tor.appname_override',
    'general.appversion.override':'extensions.jondofox.tor.appversion_override',
    'general.buildID.override':'extensions.jondofox.tor.buildID_override',
    'general.oscpu.override':'extensions.jondofox.tor.oscpu_override',
    'general.platform.override':'extensions.jondofox.tor.platform_override',
    'general.productSub.override':'extensions.jondofox.tor.productsub_override',
    'general.useragent.override':'extensions.jondofox.tor.useragent_override',
    'general.useragent.vendor':'extensions.jondofox.tor.useragent_vendor',
    'general.useragent.vendorSub':'extensions.jondofox.tor.useragent_vendorSub',
    'intl.accept_languages':'extensions.jondofox.tor.accept_languages',
    'network.http.accept.default':'extensions.jondofox.tor.accept_default',
    'image.http.accept':'extensions.jondofox.tor.image_http_accept',
    'network.http.accept-encoding':'extensions.jondofox.tor.http.accept_encoding',
    'intl.charset.default':'extensions.jondofox.tor.default_charset'
  },

  // UA-settings for Windows fake
  windowsUAMap: {
    'general.appname.override':'extensions.jondofox.windows.appname_override',
    'general.appversion.override':'extensions.jondofox.windows.appversion_override',
    'general.buildID.override':'extensions.jondofox.windows.buildID_override',
    'general.oscpu.override':'extensions.jondofox.windows.oscpu_override',
    'general.platform.override':'extensions.jondofox.windows.platform_override',
    'general.productSub.override':'extensions.jondofox.windows.productsub_override',
    'general.useragent.override':'extensions.jondofox.windows.useragent_override',
    'general.useragent.vendor':'extensions.jondofox.windows.useragent_vendor',
    'general.useragent.vendorSub':'extensions.jondofox.windows.useragent_vendorSub',
    'intl.accept_languages':'extensions.jondofox.windows.accept_languages',
    'network.http.accept.default':'extensions.jondofox.windows.accept_default',
    'image.http.accept':'extensions.jondofox.windows.image_http_accept',
    'network.http.accept-encoding':'extensions.jondofox.windows.http.accept_encoding',
    'intl.charset.default':'extensions.jondofox.windows.default_charset'
  },

  // Adding a uniform URLs concerning safebrowsing functionality to not
  // leak information.
  safebrowseMap: {
    'browser.safebrowsing.provider.0.gethashURL':
      'extensions.jondofox.safebrowsing.provider.0.gethashURL',
    'browser.safebrowsing.provider.0.keyURL':
      'extensions.jondofox.safebrowsing.provider.0.keyURL',
    'browser.safebrowsing.provider.0.lookupURL':
      'extensions.jondofox.safebrowsing.provider.0.lookupURL',
    'browser.safebrowsing.provider.0.reportErrorURL':
      'extensions.jondofox.safebrowsing.provider.0.reportErrorURL',
    'browser.safebrowsing.provider.0.reportGenericURL':
      'extensions.jondofox.safebrowsing.provider.0.reportGenericURL',
    'browser.safebrowsing.provider.0.reportMalwareErrorURL':
      'extensions.jondofox.safebrowsing.provider.0.reportMalwareErrorURL',
    'browser.safebrowsing.provider.0.reportMalwareURL':
      'extensions.jondofox.safebrowsing.provider.0.reportMalwareURL',
    'browser.safebrowsing.provider.0.reportPhishURL':
      'extensions.jondofox.safebrowsing.provider.0.reportPhishURL',
    'browser.safebrowsing.provider.0.reportURL':
      'extensions.jondofox.safebrowsing.provider.0.reportURL',
    'browser.safebrowsing.provider.0.updateURL':
      'extensions.jondofox.safebrowsing.provider.0.updateURL',
    'browser.safebrowsing.warning.infoURL':
      'extensions.jondofox.safebrowsing.warning.infoURL',
    'browser.safebrowsing.malware.reportURL':
      'extensions.jondofox.safebrowsing.malware.reportURL',
    'browser.safebrowsing.appRepURL': 
      'extensions.jondofox.safebrowsing.appRepURL'
  },

  // This map of string preferences is given to the prefsMapper
  stringPrefsMap: {
    'security.default_personal_cert':
      'extensions.jondofox.security.default_personal_cert',
    'network.proxy.no_proxies_on':
      'extensions.jondofox.network_no_proxies_on',
    'browser.aboutHomeSnippets.updateUrl':
      'extensions.jondofox.snippet_url',
    'browser.newtab.url':
      'extensions.jondofox.newtabpage.url',
    'plugins.enumerable_names':
      'extensions.jondofox.plugins_enumerable_names',
  },

  // This map of boolean preferences is given to the prefsMapper
  boolPrefsMap: {
    'browser.zoom.siteSpecific':'extensions.jondofox.browser.zoom.siteSpecific',
    'plugin.expose_full_path':'extensions.jondofox.plugin.expose_full_path',
    'browser.send_pings':'extensions.jondofox.browser_send_pings',
    'beacon.enabled':'extensions.jondofox.browser_send_pings',
    'geo.enabled':'extensions.jondofox.geo_enabled',
    'network.prefetch-next':'extensions.jondofox.network_prefetch-next',
    'network.proxy.socks_remote_dns':'extensions.jondofox.socks_remote_dns',
    'view_source.editor.external':'extensions.jondofox.source_editor_external',
    'security.remember_cert_checkbox_default_setting':
       'extensions.jondofox.security.remember_cert_checkbox_default_setting',
    'browser.search.suggest.enabled':
       'extensions.jondofox.search_suggest_enabled',
    'privacy.sanitize.sanitizeOnShutdown':
       'extensions.jondofox.sanitize_onShutdown',
    'privacy.clearOnShutdown.history':
       'extensions.jondofox.clearOnShutdown_history',
    'places.history.enabled':
       'extensions.jondofox.places_history_enabled',
    'privacy.clearOnShutdown.offlineApps':
       'extensions.jondofox.clearOnShutdown_offlineApps',
    'dom.enable_performance':'extensions.jondofox.navigationTiming.enabled',
    'dom.battery.enabled':'extensions.jondofox.battery.enabled',
    'dom.network.enabled':'extensions.jondofox.dom.network.enabled',
    'dom.event.clipboardevents.enabled':
       'extensions.jondofox.event.clipboardevents.enabled',
    'browser.pagethumbnails.capturing_disabled':
       'extensions.jondofox.pagethumbnails.disabled',
    'browser.newtabpage.enabled':'extensions.jondofox.newtabpage.enabled',
    'extensions.blocklist.enabled':'extensions.jondofox.blocklist.enabled',
    'media.peerconnection.enabled':'extensions.jondofox.peerconnection.enabled',
    'noscript.doNotTrack.enabled':'extensions.jondofox.noscript_dnt_enabled',
    'noscript.forbidIFrames':'extensions.jondofox.iframes_disabled',
    'webgl.disabled':'extensions.jondofox.webgl.disabled',
    'dom.storage.enabled':'extensions.jondofox.dom_storage_enabled',
    
    'media.video_stats.enabled':'extensions.jondofox.video_stats_enabled',
       
    'browser.download.manager.addToRecentDocs':
       'extensions.jondofox.download_manager_addToRecentDocs',
    'browser.formfill.enable':'extensions.jondofox.formfill.enable',
    'network.dns.disablePrefetch':'extensions.jondofox.network_dns_disablePrefetch',

    'javascript.options.ion': 'extensions.jondofox.javascript.options.ion',
    'javascript.options.baselinejit': 'extensions.jondofox.javascript.options.baselinejit',
    'javascript.options.asmjs': 'extensions.jondofox.javascript.options.asmjs',
    'gfx.direct2d.disabled': 'extensions.jondofox.gfx.direct2d.disabled',
    'layers.acceleration.disabled': 'extensions.jondofox.layers.acceleration.disabled',

    // Safebrowsing disabled
    'browser.safebrowsing.enabled': 'extensions.jondofox.safebrowsing_enabled',
    'browser.safebrowsing.malware.enabled': 'extensions.jondofox.safebrowsing_enabled',

    // disable experiments
    'experiments.supported':'extensions.jondofox.experiments_enabled',
    'experiments.enabled':'extensions.jondofox.experiments_enabled',

    // enforce ABE settings for NoScript
    'noscript.ABE.enabled':'extensions.jondofox.ABE.enabled',
    'noscript.ABE.wanIpAsLocal':'extensions.jondofox.ABE.wanIpAsLocal',

    'security.ssl.treat_unsafe_negotiation_as_broken' :
       'extensions.jondofox.display_insecure_ssl_nego',

    'dom.workers.sharedWorkers.enabled' : 'extensions.jondofox.sharedWorkers_enabled',

    // Health report
    'datareporting.healthreport.service.enabled' : 'extensions.jondofox.healthreport_enabled',
    'datareporting.healthreport.uploadEnabled' : 'extensions.jondofox.healthreport_enabled',
    'datareporting.policy.dataSubmissionEnabled' : 'extensions.jondofox.healthreport_enabled',
  },
   
  //This map of integer preferences is given to the prefsMapper
  intPrefsMap: {
    'network.cookie.cookieBehavior':'extensions.jondofox.cookieBehavior',
    'browser.display.use_document_fonts':'extensions.jondofox.use_document_fonts',
    'browser.sessionhistory.max_entries':'extensions.jondofox.sessionhistory.max_entries',
    'browser.sessionstore.privacy_level':'extensions.jondofox.sessionstore_privacy_level',
    'network.http.speculative-parallel-limit':'extensions.jondofox.network_speculative-parallel-limit'
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

  envSrv: null,

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
      JDFManager.prototype.rdfService = CC['@mozilla.org/rdf/rdf-service;1'].
	                      getService(CI.nsIRDFService);
      JDFManager.prototype.directoryService =
       CC['@mozilla.org/file/directory_service;1'].getService(CI.nsIProperties);
      this.envSrv = CC["@mozilla.org/process/environment;1"].
        getService(CI.nsIEnvironment);
      // Determine whether we use FF4 or 7 or 12 or 17 still some FF3
      this.isFirefox4or7or12orNot18();
    
        try {
          var extensionListener = {
	    onUninstalling: function(addon, needsRestart) {
              if (addon.id === "{437be45a-4114-11dd-b9ab-71d256d89593}") {
		log("We got the onUninstalling notification...")
                JDFManager.prototype.clean = true;
		JDFManager.prototype.uninstall = true;
		JDFManager.prototype.removeJDFPrefs();
	      }
	    },
            onDisabling: function(addon, needsRestart) {
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
	  };

          CU.import("resource://gre/modules/AddonManager.jsm");
	  this.getVersionFF4();
	  AddonManager.addAddonListener(extensionListener);
	} catch (e) {
          log("There went something with importing the AddonManager: " + e);
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
   * Try to uninstall other extensions that are not compatible; FF4+ code
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
            JDFManager.prototype.isNoScriptEnabled = false;
          }
        } else {
          log("NoScript is missing...");
          JDFManager.prototype.isNoScriptInstalled = false;
        }
      });
      AddonManager.getAddonByID('{ac2cfa60-bc96-11e0-962b-0800200c9a66}',
      function(addon) {
        if (addon) {
          log("Found Cookie Controller, that's good." +
		    " Checking whether it is enabled...");
          if (addon.isActive) {
            log("Cookie Controller is enabled as well.");
          } else {
            log("Cookie Controller is not enabled! That's bad.");
            JDFManager.prototype.isCMEnabled = false;
          }
        } else {
          log("Cookie Controller is missing...");
          JDFManager.prototype.isCMInstalled = false;
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
      
      // Set shadow prefs on every startup
      this.applyShadowPrefs();

      // Check the OS
      var xulRuntime = CC["@mozilla.org/xre/app-info;1"].getService(CI.nsIXULRuntime); 
      if (xulRuntime.OS === "WINNT") {
         this.os = "windows";
      } else if (xulRuntime.OS === "Linux") {
         this.os = "linux";
      } else if ((xulRuntime.OS === "FreeBSD") ||
                 (xulRuntime.OS === "OpenBSD") ||
                 (xulRuntime.OS === "NetBSD")) {
         this.os = "linux";
         // disable update, because it is not done by compile options
         this.prefsHandler.setBoolPref('app.update.enabled', false);
      } else if (xulRuntime.OS === "Darwin") {
         this.os = "darwin";
      }
      
      // Set prefereces at first start
      if (this.prefsHandler.getBoolPref("extensions.jondofox.firstStart")) {
         this.first_start();
      }
      // enforce cache and SSL settings
      this.enforceCachePref();
      this.enforceSSLPref();

      // Disable gamepad API
      if (this.ff24) {
          this.boolPrefsMap['dom.gamepad.enabled'] = 'extensions.jondofox.gamepad.enabled';
      }

      // Disable Loop
      if (this.ff34) {
          this.boolPrefsMap['loop.enabled'] = 'extensions.jondofox.loop_enabled';
          this.boolPrefsMap['security.ssl.disable_session_identifiers'] = 'extensions.jondofox.disable_session_identifiers';
      }

     // Enable Indexed DB for FF 35 because of a bug
      if (this.ff35 && !this.ff36) {
           this.boolPrefsMap['dom.indexedDB.enabled'] = 'extensions.jondofox.indexedDB.enabled35';
      } else {
         this.boolPrefsMap['dom.indexedDB.enabled'] = 'extensions.jondofox.indexedDB.enabled';
      }

      // Disable SSL session identifiers
      if (this.ff37) {
          this.stringPrefsMap['browser.selfsupport.url'] = 'extensions.jondofox.selfsupport.url';
      }
 
      // For clearity of code we implement a different method to check the
      // installed extension in Firefox4
      this.checkExtensionsFF4();
      // We do not want to ping Mozilla once per day for different updates
      // of Add-On Metadata and other stuff (duration of last startup...).
      this.prefsHandler.setBoolPref('extensions.getAddons.cache.enabled',
           this.prefsHandler.getBoolPref('extensions.jondofox.getAddons.cache.enabled'));
 
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
      // If somebody wants to have always JonDo as a proxy she gets it and the 
      // corresponding User Agent setting. Otherwise the last used proxy will be
      // set.
      if (this.prefsHandler.getBoolPref('extensions.jondofox.alwaysUseJonDo')) {
          this.setProxy('jondo');
      } else {
        this.setProxy(this.getState());
      }
      // We need to estimate the JonDo path anyway in order to show the user
      // later on the proper help if she accidentally shut JonDo down.
      // Therefore, we are doing it right now...
      /*this.jondoExecutable = this.getJonDoPath();
      if (this.jondoExecutable) {
        this.jondoProcess = CC["@mozilla.org/process/util;1"].
                           createInstance(CI.nsIProcess); 
        // Now we are starting JonDo if it was not already started and the user
        // wants it to get started.
        if (this.prefsHandler.
            getBoolPref('extensions.jondofox.autostartJonDo') && 
            this.getState() === 'jondo') {
          log("Starting JonDo...");
          this.startJondo();
        }
      }*/

      // A convenient method to set user prefs that change from proxy to proxy.
      // We should nevertheless make the settings of userprefs in broader way
      // dependant on the chosen proxy. This would include the call to 
      // prefsMapper.map() in this function and should be more flexible and
      // transparent.
      this.setUserAgent(true, this.getState());
  
     if (!(this.prefsHandler.getIntPref('extensions.jondofox.observatory.proxy') === 10)) {
      // fix Certificate Patrol and Observatory settings at first run
      if (this.prefsHandler.getIntPref('extensions.jondofox.observatory.proxy') === 6) {
         this.prefsHandler.setBoolPref('extensions.jondofox.certpatrol_enabled', true);
      } else {
         this.prefsHandler.setBoolPref('extensions.jondofox.certpatrol_enabled', false);
      }
      if ((this.prefsHandler.getIntPref('extensions.jondofox.observatory.proxy') === 0) ||
          (this.prefsHandler.getIntPref('extensions.jondofox.observatory.proxy') === 2) ||
          (this.prefsHandler.getIntPref('extensions.jondofox.observatory.proxy') === 3) ||
          (this.prefsHandler.getIntPref('extensions.jondofox.observatory.proxy') === 4)) {
         this.prefsHandler.setBoolPref('extensions.jondofox.observatory.use_with_jondo', true);
      } else {
         this.prefsHandler.setBoolPref('extensions.jondofox.observatory.use_with_jondo', false);
      }
      if ((this.prefsHandler.getIntPref('extensions.jondofox.observatory.proxy') === 1) ||
          (this.prefsHandler.getIntPref('extensions.jondofox.observatory.proxy') === 2) ||
          (this.prefsHandler.getIntPref('extensions.jondofox.observatory.proxy') === 3) ||
          (this.prefsHandler.getIntPref('extensions.jondofox.observatory.proxy') === 4)) {
         this.prefsHandler.setBoolPref('extensions.jondofox.observatory.use_with_tor', true);
      } else {
         this.prefsHandler.setBoolPref('extensions.jondofox.observatory.use_with_tor', false);
      }
      if (this.prefsHandler.getIntPref('extensions.jondofox.observatory.proxy') === 4) {
         this.prefsHandler.setBoolPref('extensions.jondofox.observatory.use_with_without', true);
      } else {
         this.prefsHandler.setBoolPref('extensions.jondofox.observatory.use_with_without', false);
      }
      this.prefsHandler.setIntPref('extensions.jondofox.observatory.proxy', 10);
     }
    } catch (e) {
      log("onUIStartup(): " + e);
    }
  },

  /*getJonDoPath: function() {
  try {
    var subKey;
    var jondoPath;
    var component;
    var jondoExecFile = CC["@mozilla.org/file/local;1"].
                            createInstance(CI.nsILocalFile);
    //Getting the OS first...
    var xulRuntime = CC["@mozilla.org/xre/app-info;1"].getService(CI.
                     nsIXULRuntime); 
    if (xulRuntime.OS === "WINNT") {
      this.os = "windows";
      // We are trying to find the JRE using the registry. First, JonDo
      // and second JAP, sigh.
      var wrk = CC["@mozilla.org/windows-registry-key;1"].
                createInstance(CI.nsIWindowsRegKey);
      wrk.open(wrk.ROOT_KEY_LOCAL_MACHINE, "SOFTWARE", 
        wrk.ACCESS_READ);
      if (wrk.hasChild("JonDo")) {
	subKey = wrk.openChild("JonDo", wrk.ACCESS_READ);
        jondoPath = subKey.readStringValue("LinkPath");
	subKey.close();
	if (!jondoPath) {
          log("Missing JonDo path.");
        }
      } else if (wrk.hasChild("JAP")) {
        log("Missing JonDo Registry key. Checking whether there is a JAP key.");
        subKey = wrk.openChild("JAP", wrk.ACCESS_READ);
        jondoPath = subKey.readStringValue("LinkPath");
	subKey.close();
	if (!jondoPath) {
          log("Missing JAP path.");
        }  
      } else {
        log("Found neither a JonDo nor a JAP key... Checking for a portable " +
          "version...");
        // We need to check that here as __LOCATION__ is undefined in FF4.
        // No! Only if one does not use the unpack flag!?
	if (typeof(__LOCATION__) !== "undefined") {
	  component = __LOCATION__;
	} else {
          // Thanks to FoxyProxy for this idea...
	  var componentFilename = Components.Exception().filename; 
	  // Just in case we have the file path starting with "jar:" we replace 
	  // it.
	  componentFilename = componentFilename.replace(/^jar:/, "");
          var fileProtHand = CC["@mozilla.org/network/protocol;1?name=file"].
            getService(CI.nsIFileProtocolHandler); 
          component = fileProtHand.getFileFromURLSpec(componentFilename);
	}
        var rootDir = component.parent.parent.parent.parent.parent.parent.parent;
	rootDir.append("JonDoPortable");
	try {
	  if (rootDir.isDirectory() && rootDir.exists()) {
            rootDir.append("JonDoPortable.exe"); 
	    if (rootDir.isFile() && rootDir.exists()) {
              jondoPath = rootDir.path;
	    } else {
              log("Found no JonDoPortable.exe");
	    }
	  } 
	} catch (e) {
          log("No JonDoPortable found either. Thus, no JonDo starting here...");
        }
      }
      wrk.close();
      if (jondoPath) {
	// Why does 'return jondoExecFile.initWithPath(jondoPath);' not work?
        jondoExecFile.initWithPath(jondoPath); 
	return jondoExecFile;
      } else {
	return null;
      }
    } else if (xulRuntime.OS === "Linux") {
      this.os = "linux";
      jondoExecFile.initWithPath("/usr/bin");
      jondoExecFile.append("jondo");
      if (jondoExecFile.exists() && jondoExecFile.isFile()) {
	return jondoExecFile;
      } else {
        jondoExecFile.initWithPath("/usr/bin");
        jondoExecFile.append("java"); 
        if (jondoExecFile.exists() && jondoExecFile.isFile()) {
          // Found a java executable returning it and we check the path of
          // the JAP.jar in the callee (that seems the easiest way...
          return jondoExecFile;
        } else {
          log("No 'java' or 'jondo' file found.");
	  return null;
	}  
      }
    } else if (xulRuntime.OS === "Darwin") {
      this.os = "darwin";
      jondoExecFile.initWithPath("/Applications/JAP.app/Contents/MacOS");
      jondoExecFile.append("JAP");
      if (jondoExecFile.exists() && jondoExecFile.isFile()) {
	return jondoExecFile;
      } else {
        return null;
      } 
    } else {
      log("Found an unhandled operating system: " + xulRuntime.OS);
    } 
  } catch(e) {
    log("Error while locking for JonDo Executable: " + e);
  }
  },

  startJondo : function() {
    try {
      this.jondoProcess.init(this.jondoExecutable); 
      if (this.jondoExecutable.path !== "/usr/bin/java") {
        this.jondoArgs = ["--try"];
      } else {
        // Checking for a JAP.jar in the home directory. If we find it we 
        // start JonDo if not then just the browser starts up. 
        var dirService = CC["@mozilla.org/file/directory_service;1"].
          getService(CI.nsIProperties); 
        var homeDirFile = dirService.get("Home", CI.nsIFile);
          homeDirFile.append("JAP.jar");
        if (homeDirFile.exists() && homeDirFile.isFile()) {
          var JAPPath = homeDirFile.path;
          this.jondoArgs = ["-jar", JAPPath, "--try"];
        } else {
          // No JAP.jar found, thus returning...
          return;
        } 
      }
    } catch (e if e.name === "NS_ERROR_ALREADY_INITIALIZED") {
      log("Process as already initialized. Just restarting...");
    }
    this.isJondoInstalled = true; 
    // We do not need to start the process twice.
    if (!this.jondoProcess.isRunning) {
      if (!this.ff4) {
        this.jondoProcess.run(false, this.jondoArgs, this.jondoArgs.length);
      } else {
        // There were problems with unicode filenames and path's that got
        // fixed in FF4. See: 
        // https://bugzilla.mozilla.org/show_bug.cgi?id=411511. If somebody
        // with FF < 4 got hit by this bug she has to upgrade. 
        this.jondoProcess.runw(false, this.jondoArgs, this.jondoArgs.length); 
      } 
    }
  },*/

  // Taken with some minor modifications from Torbutton (torbutton.js).
  setTimezone: function(startup, mode) {
    log("Setting timezone at " + startup + " for mode " + mode);

    // For TZ info, see:
    // http://www-01.ibm.com/support/docview.wss?rs=0&uid=swg21150296
    // and 
    // http://msdn.microsoft.com/en-us/library/90s5c885.aspx
    if (startup) {
      // Save Date() string to pref
      var d = new Date();
      var offset = d.getTimezoneOffset();
      var offStr = "";
      if (d.getTimezoneOffset() < 0) {
        offset = -offset;
        offStr = "-";
      } else {
        offStr = "+";
      }
      var minutes = offset % 60;
      // Division in JS gives always floating point results we do not want.
      // And Math.floor() is not working properly for negative values.
      if ((offset - minutes) / 60 < 10) {
        offStr += "0";
      }
      offStr += ((offset - minutes) / 60) + ":";
      if ((minutes) < 10) {
        offStr += "0";
      }
      offStr += (minutes);

      // Regex match for 3 letter code
      var re = new RegExp('\\((\\S+)\\)', "gm");
      match = re.exec(d.toString());
      // Parse parens. If parseable, use. Otherwise set TZ=""
      var set = ""
      if (match) {
        set = match[1] + offStr;
      } else {
        // If we get no 3 letter code we set the pref at least to "" in
        // order to have at least a small chance to get the timezone properly
        // set after proxy switching.
        // Just taking the offset does not work (at least on the Windows
        // machine I had for testing).
      }
      this.prefsHandler.setStringPref("extensions.jondofox.tz_string", set);
    }
    if (mode === "custom") {
      var userAgent = this.prefsHandler.
        getStringPref("extensions.jondofox.custom.user_agent");
    }

    if (mode === "jondo" || mode === "tor" ||
        (mode === "custom" && (userAgent === "jondo" || userAgent === "tor"))) {
      log("Setting timezone to UTC");
      this.envSrv.set("TZ", "UTC");
    } else {
      // 1. If startup TZ string, reset.
      log("Unsetting timezone.");
      // FIXME: Tears.. This will not update during daylight switch for
      // linux+mac users. Windows users will be fine though, because tz_string
      // should be empty for them.
      this.envSrv.set("TZ",
        this.prefsHandler.getStringPref("extensions.jondofox.tz_string"));
    }
  },


  first_start: function() {
     try {
     
        //shadow-pref settings
        this.prefsHandler.setStringPref("extensions.jondofox.network.http.accept-encoding.secure", "gzip, deflate");
        
        this.isFirefox4or7or12orNot18();
     
        // set non-privacy relevant parameters
        this.prefsHandler.setIntPref("accessibility.typeaheadfind.flashBar", 0);
        this.prefsHandler.setBoolPref("bcpm.Button.Shown", true);
        this.prefsHandler.setBoolPref("app.update.auto", false);

        this.prefsHandler.setBoolPref("browser.download.hide_plugins_without_extensions", false);
        this.prefsHandler.setBoolPref("browser.download.manager.alertOnEXEOpen", true);
        this.prefsHandler.setIntPref("browser.download.manager.retention", 0);
        this.prefsHandler.setBoolPref("browser.download.useDownloadDir", false);
        this.prefsHandler.setStringPref("browser.newtab.url", "about:blank");
        this.prefsHandler.setBoolPref("browser.newtabpage.enabled", false);
        this.prefsHandler.setStringPref("browser.feeds.handler", "bookmarks");
        this.prefsHandler.setStringPref("browser.feeds.handler.default", "bookmarks");
        this.prefsHandler.setBoolPref("browser.feeds.showFirstRunUI", false);
        this.prefsHandler.setBoolPref("browser.fixup.alternate.enabled", false);
        this.prefsHandler.setIntPref("browser.history_expire_days", 0);
        this.prefsHandler.setIntPref("browser.history_expire_days.mirror", 180);
        this.prefsHandler.setBoolPref("browser.microsummary.enabled", false);
        this.prefsHandler.setIntPref("browser.migration.version", 1);
        this.prefsHandler.setBoolPref("browser.offline", false);
        this.prefsHandler.setBoolPref("browser.offline-apps.notify", false);
        this.prefsHandler.setBoolPref("browser.places.importBookmarksHTML", false);
        this.prefsHandler.setBoolPref("browser.places.importDefaults", false);
        this.prefsHandler.setIntPref("browser.places.leftPaneFolderId", -1);
        this.prefsHandler.setBoolPref("browser.places.migratePostDataAnnotations", false);
        this.prefsHandler.setIntPref("browser.places.smartBookmarksVersion", 2);
        this.prefsHandler.setBoolPref("browser.places.updateRecentTagsUri", false);
        this.prefsHandler.setIntPref("browser.preferences.advanced.selectedTabIndex", 0);
        this.prefsHandler.setIntPref("browser.preferences.privacy.selectedTabIndex", 5);
        this.prefsHandler.setBoolPref("browser.rights.3.shown", true);
        this.prefsHandler.setStringPref("browser.search.selectedEngine", "Startpage HTTPS");
        this.prefsHandler.setBoolPref("browser.search.update", false);
        this.prefsHandler.setBoolPref("browser.search.useDBForOrder", true);
        this.prefsHandler.setBoolPref("browser.sessionstore.enabled", false);
        this.prefsHandler.setIntPref("browser.sessionstore.privacy_level", 2);
        this.prefsHandler.setBoolPref("browser.sessionstore.resume_from_crash", false);
        this.prefsHandler.setBoolPref("browser.shell.checkDefaultBrowser", false);
        this.prefsHandler.setStringPref("browser.startup.homepage", "about:home");
        this.prefsHandler.setIntPref("browser.startup.page", 0);
        this.prefsHandler.setStringPref("browser.throbber.url", "http://www.mozilla.org/");
        
        if (this.isAboveFF38 == true){
        
           this.prefsHandler.setStringPref("browser.search.countryCode", "US");
           this.prefsHandler.setBoolPref("browser.search.geoSpecificDefaults", false);
           this.prefsHandler.setStringPref("browser.search.geoip.url", "");
        
        }

        this.prefsHandler.setStringPref("capability.policy.allowclipboard.Clipboard.cutcopy", "allAccess");
        this.prefsHandler.setStringPref("capability.policy.allowclipboard.Clipboard.paste", "allAccess");
        this.prefsHandler.setStringPref("capability.policy.allowclipboard.sites", "");
        this.prefsHandler.setStringPref("capability.policy.maonoscript.javascript.enabled", "allAccess");
        this.prefsHandler.setStringPref("capability.policy.maonoscript.sites", "about: about:blocked about:certerror about:config about:neterror about:plugins about:privatebrowsing about:sessionrestore chrome: resource:");
        this.prefsHandler.setStringPref("capability.policy.policynames", "allowclipboard");
        this.prefsHandler.setBoolPref("compact.menu.firstrun", false);
        this.prefsHandler.setBoolPref("copyplaintext.default", false);
        this.prefsHandler.setBoolPref("copyplaintext.formatting.extra.newline", true);
        this.prefsHandler.setBoolPref("copyplaintext.formatting.extra.space", true);
        this.prefsHandler.setBoolPref("copyplaintext.formatting.trim", true);

        // Data reporting
        this.prefsHandler.setBoolPref("datareporting.healthreport.service.enabled", false);
        this.prefsHandler.setBoolPref("datareporting.healthreport.uploadEnabled", false);
        this.prefsHandler.setBoolPref("datareporting.policy.dataSubmissionEnabled", false);
        this.prefsHandler.setBoolPref("datareporting.policy.dataSubmissionEnabled", false);

        this.prefsHandler.setIntPref("dom.max_chrome_script_run_time", 60);
        this.prefsHandler.setBoolPref("dom.event.clipboardevents.enabled", false);
        
        if (this.isAboveFF38 == true){
        
           this.prefsHandler.setBoolPref("dom.enable_resource_timing", false);
           this.prefsHandler.setBoolPref("dom.enable_user_timing", false);
           this.prefsHandler.setBoolPref("dom.keyboardevent.code.enabled", false);
           this.prefsHandler.setBoolPref("dom.beforeAfterKeyboardEvent.enabled", false);
           this.prefsHandler.setBoolPref("dom.keyboardevent.dispatch_during_composition", false);
        
        }

         // VideoDownloadHelper
        this.prefsHandler.setBoolPref("dwhelper.conversion-enabled", false);
        this.prefsHandler.setBoolPref("dwhelper.disable-dwcount-cookie", true);
        this.prefsHandler.setIntPref("dwhelper.download-count", 1);
        this.prefsHandler.setBoolPref("dwhelper.download-counter", false);
        this.prefsHandler.setStringPref("dwhelper.download-mode", "onebyone");
        this.prefsHandler.setBoolPref("dwhelper.extended-download-menu", false);
        this.prefsHandler.setBoolPref("dwhelper.first-time", false);
        this.prefsHandler.setBoolPref("dwhelper.icon-animation", false);
        this.prefsHandler.setStringPref("dwhelper.icon-click", "open-popup");
        this.prefsHandler.setBoolPref("dwhelper.safe-mode", false);
        this.prefsHandler.setBoolPref("dwhelper.share-blacklist", false);
        this.prefsHandler.setBoolPref("dwhelper.smartnamer.auto-share", false);
        this.prefsHandler.setBoolPref("dwhelper.smartnamer.fname.keep-nonascii", false);
        this.prefsHandler.setBoolPref("dwhelper.smartnamer.fname.keep-spaces", false);
        this.prefsHandler.setBoolPref("dwhelper.social-share.enabled", false);
        this.prefsHandler.setBoolPref("dwhelper.socialshare.enabled", false);

        // Extensions
        this.prefsHandler.setIntPref("extensions.autoDisableScopes", 14);
        this.prefsHandler.setIntPref("extensions.autoDisableScopes", 14);

        // AdBlock Plus
        this.prefsHandler.setBoolPref("extensions.adblockplus.checkedadblockinstalled", true);
        this.prefsHandler.setBoolPref("extensions.adblockplus.checkedtoolbar", true);
        this.prefsHandler.setBoolPref("extensions.adblockplus.correctTyposAsked", true);
        this.prefsHandler.setIntPref("extensions.adblockplus.patternsbackups", 0);
        this.prefsHandler.setBoolPref("extensions.adblockplus.showinstatusbar", false);
        this.prefsHandler.setBoolPref("extensions.adblockplus.showintoolbar", true);
        this.prefsHandler.setBoolPref("extensions.adblockplus.showsubscriptions", false);
        this.prefsHandler.setBoolPref("extensions.adblockplus.subscriptions_exceptionscheckbox", false);
        this.prefsHandler.setBoolPref("extensions.adblockplus.subscriptions_autoupdate", false);
        this.prefsHandler.setBoolPref("extensions.adblockplus.savestats", false);
        this.prefsHandler.setBoolPref("extensions.https_everywhere._observatory.popup_shown", true);
        this.prefsHandler.setBoolPref("extensions.https_everywhere.toolbar_hint_shown", true);

        this.prefsHandler.setBoolPref("extensions.shownSelectionUI", true);
        this.prefsHandler.setStringPref("extensions.ui.lastCategory", "addons://list/extension");
        this.prefsHandler.setBoolPref("extensions.update.notifyUser", false);
    
        if (this.os === "linux") {
            this.prefsHandler.setStringPref("font.name.serif.x-western", "Liberation Sans");
            this.prefsHandler.setStringPref("font.name.sans-serif.x-western", "Liberation Sans");
        } else {
            this.prefsHandler.setStringPref("font.name.serif.x-western", "Arial");
            this.prefsHandler.setStringPref("font.name.sans-serif.x-western", "Arial");
        }
        this.prefsHandler.setBoolPref("keyword.enabled", false);
        this.prefsHandler.setBoolPref("local_install.addonsEnabled", true);
        this.prefsHandler.setStringPref("local_install.addons_view_override", "installs");
        this.prefsHandler.setBoolPref("local_install.disableInstallDelay", false);
        this.prefsHandler.setBoolPref("local_install.enableInstall", true);
        this.prefsHandler.setBoolPref("local_install.hideToolsBuildID", true);
        this.prefsHandler.setBoolPref("local_install.hideToolsExtensionOptionsMenu", true);
        this.prefsHandler.setBoolPref("local_install.hideToolsMyConfig", true);
        this.prefsHandler.setBoolPref("local_install.hideToolsOpenProfile", true);
        this.prefsHandler.setBoolPref("local_install.hideToolsOptionsMenu", true);
        this.prefsHandler.setBoolPref("local_install.hideToolsThemeSwitcherMenu", true);
        this.prefsHandler.setBoolPref("local_install.prompt_disableInstallDelay", false);
        this.prefsHandler.setBoolPref("local_install.promptingToAutoUninstall", true);
        this.prefsHandler.setIntPref("local_install.selected_settings_sub_tab3", 4);
        this.prefsHandler.setIntPref("local_install.selected_settings_sub_tab4", 5);
        this.prefsHandler.setBoolPref("local_install.showAddonsMyConfigImage", false);
        this.prefsHandler.setBoolPref("local_install.showEMMenuButton", false);
        this.prefsHandler.setBoolPref("local_install.showTMMenuButton", false);

        this.prefsHandler.setIntPref("network.cookie.cookieBehavior", 2);
        this.prefsHandler.setBoolPref("network.cookie.prefsMigrated", true);
        this.prefsHandler.setStringPref("network.http.accept.default", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
        this.prefsHandler.setIntPref("network.http.max-persistent-connections-per-proxy", 12);
        this.prefsHandler.setIntPref("network.http.pipelining.maxrequests", 6);
        this.prefsHandler.setBoolPref("network.http.proxy.keep-alive", false);
        this.prefsHandler.setBoolPref("network.prefetch-next", false);
        this.prefsHandler.setBoolPref("network.protocol-handler.warn-external.file", true);
        this.prefsHandler.setBoolPref("network.protocol-handler.warn-external.mailto", true);
        this.prefsHandler.setBoolPref("network.protocol-handler.warn-external.news", true);
        this.prefsHandler.setBoolPref("network.protocol-handler.warn-external.nntp", true);
        this.prefsHandler.setBoolPref("network.protocol-handler.warn-external.snews", true);
        
        if (this.isAboveFF38 == true){
        
           this.prefsHandler.setIntPref("network.http.speculative-parallel-limit", 0);
           
        }

        // NoScript
        this.prefsHandler.setBoolPref("noscript.ABE.wanIpAsLocal", false);
        this.prefsHandler.setBoolPref("noscript.autoReload", true);
        this.prefsHandler.setBoolPref("noscript.blockNSWB", true);
        this.prefsHandler.setBoolPref("noscript.canonicalFQDN", false);
        this.prefsHandler.setBoolPref("noscript.contentBlocker", true);
        this.prefsHandler.setBoolPref("noscript.ctxMenu", false);
        this.prefsHandler.setBoolPref("noscript.doNotTrack.enabled", false);
        this.prefsHandler.setStringPref("noscript.filterXExceptions", "^https?://([a-z]+)\\.google\\.(?:[a-z]{1,3}\\.)?[a-z]+/(?:search|custom|\\1)\\?\n^https?://([a-z]*)\\.?search\\.yahoo\\.com/search(?:\\?|/\\1\\b)\n^https?://[a-z]+\\.wikipedia\\.org/wiki/[^\"<>\\?%]+$\n^https?://translate\\.google\\.com/translate_t[^\"'<>\\?%]+$\n^https://secure\\.wikimedia\\.org/wikipedia/[a-z]+/wiki/[^\"<>\\?%]+$\n^https://www\\.cashu\\.com/cgi-bin/pcashu\\.cgi$");
        this.prefsHandler.setBoolPref("noscript.firstRunRedirection", false);
        this.prefsHandler.setBoolPref("noscript.forbidBookmarklets", true);
        this.prefsHandler.setStringPref("noscript.gtemp", "");
        this.prefsHandler.setStringPref("noscript.httpsForcedExceptions", "");
        this.prefsHandler.setStringPref("noscript.options.tabSelectedIndexes", "3,0,0");
        this.prefsHandler.setStringPref("noscript.policynames", "allowclipboard");
        this.prefsHandler.setBoolPref("noscript.showAllowPage", false);
        this.prefsHandler.setBoolPref("noscript.showBlockedObjects", false);
        this.prefsHandler.setBoolPref("noscript.showDistrust", false);
        this.prefsHandler.setBoolPref("noscript.showDomain", false);
        this.prefsHandler.setBoolPref("noscript.showGlobal", false);
        this.prefsHandler.setBoolPref("noscript.showPermanent", false);
        this.prefsHandler.setBoolPref("noscript.showRecentlyBlocked", false);
        this.prefsHandler.setBoolPref("noscript.showTempAllowPage", false);
        this.prefsHandler.setBoolPref("noscript.showUntrustedPlaceholder", false);
        this.prefsHandler.setBoolPref("noscript.showUntrusted", false);
        this.prefsHandler.setStringPref("noscript.temp", "");
        this.prefsHandler.setIntPref("noscript.toolbarToggle", 1);
        this.prefsHandler.setStringPref("noscript.untrusted", "falkag.net google-analytics.com googlesyndication.com doubleclick.net doubleclick.com");

        this.prefsHandler.setBoolPref("pref.advanced.images.disable_button.view_image", false);
        this.prefsHandler.setBoolPref("pref.advanced.javascript.disable_button.advanced", false);
        this.prefsHandler.setBoolPref("pref.browser.homepage.disable_button.current_page", false);
        this.prefsHandler.setBoolPref("pref.browser.language.disable_button.remove", false);
        this.prefsHandler.setBoolPref("pref.browser.language.disable_button.up", false);
        this.prefsHandler.setBoolPref("pref.privacy.disable_button.cookie_exceptions", false);
        this.prefsHandler.setBoolPref("pref.privacy.disable_button.view_cookies", false);
        this.prefsHandler.setBoolPref("privacy.clearOnShutdown.passwords", true);
        this.prefsHandler.setBoolPref("privacy.cpd.cookies", false);
        this.prefsHandler.setBoolPref("privacy.item.passwords", true);
        this.prefsHandler.setBoolPref("privacy.sanitize.didShutdownSanitize", true);
        this.prefsHandler.setBoolPref("privacy.sanitize.migrateFx3Prefs", true);
        this.prefsHandler.setBoolPref("privacy.sanitize.promptOnSanitize", false);
        this.prefsHandler.setBoolPref("privacy.sanitize.sanitizeOnShutdown", true);

        // Profilswitcher 
        this.prefsHandler.setIntPref("profileswitcher.close_before_launch", 0);
        this.prefsHandler.setIntPref("profileswitcher.where_show_name", 0);

        this.prefsHandler.setBoolPref("pttl.menu-add-bookmark", false);
        this.prefsHandler.setBoolPref("pttl.menu-append", false);
        this.prefsHandler.setBoolPref("pttl.menu-complete-menu", true);
        this.prefsHandler.setBoolPref("pttl.menu-def-open", false);
        this.prefsHandler.setBoolPref("pttl.menu-def-save", false);
        this.prefsHandler.setBoolPref("pttl.menu-save-in-file", false);
        this.prefsHandler.setBoolPref("pttl.menu-search-groups-tab", false);
        this.prefsHandler.setBoolPref("pttl.menu-search-groups-win", false);
        this.prefsHandler.setBoolPref("pttl.menu-send-mail-to", false);
        this.prefsHandler.setBoolPref("pttl.menu-send-text-to", false);
        this.prefsHandler.setBoolPref("pttl.menu-translate", false);
        this.prefsHandler.setIntPref("pttl.open-type", 2);
        this.prefsHandler.setStringPref("pttl.save-directory-default", "");
        this.prefsHandler.setStringPref("pttl.save-extension-default", ".txt");
        this.prefsHandler.setBoolPref("pttl.save-with-UTF8", false);
        this.prefsHandler.setBoolPref("reloadSearchPlugins", false);
        this.prefsHandler.setBoolPref("security.disable_button.openCertManager", false);
        this.prefsHandler.setBoolPref("security.disable_button.openDeviceManager", false);

        
        this.prefsHandler.setIntPref("security.OCSP.enabled", 0);

        this.prefsHandler.setBoolPref("signon.rememberSignons", false);
        this.prefsHandler.setIntPref("toolkit.telemetry.prompted", 2);
        this.prefsHandler.setBoolPref("toolkit.telemetry.rejected", true);

        this.prefsHandler.setStringPref("xpinstall.whitelist.add", "");
        this.prefsHandler.setStringPref("xpinstall.whitelist.add.103", "");

        // restore default privacy settings
        this.prefsHandler.deletePreference('extensions.jondofox.security.default_personal_cert');
        this.prefsHandler.deletePreference('extensions.jondofox.network_no_proxies_on');
        this.prefsHandler.deletePreference('extensions.jondofox.browser.zoom.siteSpecific');
        this.prefsHandler.deletePreference('extensions.jondofox.plugin.expose_full_path');
        this.prefsHandler.deletePreference('extensions.jondofox.browser_send_pings');
        this.prefsHandler.deletePreference('extensions.jondofox.dom_storage_enabled');
        this.prefsHandler.deletePreference('extensions.jondofox.geo_enabled');
        this.prefsHandler.deletePreference('extensions.jondofox.network_prefetch-next');
        this.prefsHandler.deletePreference('extensions.jondofox.socks_remote_dns');
        this.prefsHandler.deletePreference('extensions.jondofox.source_editor_external');
        this.prefsHandler.deletePreference('extensions.jondofox.security.remember_cert_checkbox_default_setting');
        this.prefsHandler.deletePreference('extensions.jondofox.search_suggest_enabled');
        this.prefsHandler.deletePreference('extensions.jondofox.sanitize_onShutdown');
        this.prefsHandler.deletePreference('extensions.jondofox.clearOnShutdown_history');
        this.prefsHandler.deletePreference('extensions.jondofox.clearOnShutdown_offlineApps');
        this.prefsHandler.deletePreference('extensions.jondofox.tls_session_tickets');
        this.prefsHandler.deletePreference('extensions.jondofox.battery.enabled');
        this.prefsHandler.deletePreference('extensions.jondofox.dom.network.enabled');
        this.prefsHandler.deletePreference('extensions.jondofox.event.clipboardevents.enabled');
        this.prefsHandler.deletePreference('extensions.jondofox.pagethumbnails.disabled');
        this.prefsHandler.deletePreference('extensions.jondofox.blocklist.enabled');
        this.prefsHandler.deletePreference('extensions.jondofox.peerconnection.enabled');
        this.prefsHandler.deletePreference('extensions.jondofox.noscript_dnt_enabled');
        this.prefsHandler.deletePreference('extensions.jondofox.cookieBehavior');
        this.prefsHandler.deletePreference('extensions.jondofox.use_document_fonts');
        this.prefsHandler.deletePreference('extensions.jondofox.indexedDB.enabled');
        this.prefsHandler.deletePreference('extensions.jondofox.webgl.disabled');
        this.prefsHandler.deletePreference('extensions.jondofox.gamepad.enabled');
        this.prefsHandler.deletePreference('extensions.jondofox.sessionhistory.max_entries');
        this.prefsHandler.deletePreference('extensions.jondofox.network_dns_disablePrefetch');
        this.prefsHandler.deletePreference('extensions.jondofox.download_manager_addToRecentDocs');
        this.prefsHandler.deletePreference('extensions.jondofox.formfill.enable');
        this.prefsHandler.deletePreference('extensions.jondofox.browser_cache_memory_capacity');
        
        //deactivate WebIDE
        if (this.isAboveFF38 == true){
        
           this.prefsHandler.setBoolPref("devtools.webide.enabled", false);
           this.prefsHandler.setBoolPref("devtools.webide.autoinstallADBHelper", false);
           this.prefsHandler.setBoolPref("devtools.webide.autoinstallFxdtAdapters", false);
        
        }
        
        //limit standart-fonts to 3 on Windows
        this.prefsHandler.setStringPref("font.blacklist.underline_offset", "");
        
        //fix accept-encoding Header on SSL in FF >= 44
        this.prefsHandler.setStringPref("network.http.accept-encoding.secure", "gzip, deflate");

     } catch (e) {
      log("first_start(): " + e);
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
      observers.removeObserver(this, "domwindowopened");
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
	      // Start of a hack as the reliable detection of a difference
	      // bewtween old and new version does not work in JDF-overlay
	      // observer code.
	      JDFManager.prototype.newVersionDetected = true;
	      JDFManager.prototype.prefsHandler.
	        setStringPref('extensions.jondofox.last_version', JDFManager.
		  prototype.VERSION);
            }
          });
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
  
  applyShadowPrefs: function() {
  
    this.prefsHandler.setStringPref("network.http.accept-encoding.secure", this.prefsHandler.getStringPref("extensions.jondofox.network.http.accept-encoding.secure"));
  
  },
  
  removeJDFPrefs: function() {
  
    // Mozilla requires us to leave no trace after uninstalling the XPI
    // thus we remove all our prefs in about:config
    
    //Disable warning popups
    
    JDFManager.prototype.prefsHandler.setBoolPref("extensions.jondofox.preferences_warning", false);
    JDFManager.prototype.prefsHandler.setBoolPref("extensions.jondofox.proxy_warning", false);
    JDFManager.prototype.prefsHandler.setBoolPref("extensions.jondofox.update_warning", false);
    
    //Create Array to hold all prefs
    
    var prefs_to_reset = new Array(319);
    
    prefs_to_reset[0] = "beacon.enabled";
    prefs_to_reset[1] = "browser.display.use_document_fonts";
    prefs_to_reset[2] = "browser.sessionstore.upgradeBackup.latestBuildID";
    prefs_to_reset[3] = "browser.slowStartup.averageTime";
    prefs_to_reset[4] = "browser.slowStartup.samples";
    prefs_to_reset[5] = "datareporting.healthreport.lastDataSubmissionRequestedTime";
    prefs_to_reset[6] = "datareporting.healthreport.pendingDeleteRemoteData";
    prefs_to_reset[7] = "datareporting.sessions.current.clean";
    prefs_to_reset[8] = "dwhelper.conversion-enabled";
    prefs_to_reset[9] = "dwhelper.disable-dwcount-cookie";
    prefs_to_reset[10] = "dwhelper.download-count";
    prefs_to_reset[11] = "dwhelper.download-counter";
    prefs_to_reset[12] = "dwhelper.download-mode";
    prefs_to_reset[13] = "dwhelper.extended-download-menu";
    prefs_to_reset[14] = "dwhelper.first-time";
    prefs_to_reset[15] = "dwhelper.icon-animation";
    prefs_to_reset[16] = "dwhelper.icon-click";
    prefs_to_reset[17] = "dwhelper.safe-mode";
    prefs_to_reset[18] = "dwhelper.share-blacklist";
    prefs_to_reset[19] = "dwhelper.smartnamer.auto-share";
    prefs_to_reset[20] = "dwhelper.smartnamer.fname.keep-nonascii";
    prefs_to_reset[21] = "dwhelper.smartnamer.fname.keep-spaces";
    prefs_to_reset[22] = "dwhelper.social-share.enabled";
    prefs_to_reset[23] = "dwhelper.socialshare.enabled";
    prefs_to_reset[24] = "extensions.CanvasBlocker@kkapsner.de.askOnlyOnce";
    prefs_to_reset[25] = "extensions.CanvasBlocker@kkapsner.de.blockMode";
    prefs_to_reset[26] = "extensions.CanvasBlocker@kkapsner.de.whiteList";
    prefs_to_reset[27] = "extensions.adblockplus.blockableItemsSize";
    prefs_to_reset[28] = "extensions.adblockplus.patternsbackups";
    prefs_to_reset[29] = "extensions.adblockplus.savestats";
    prefs_to_reset[30] = "extensions.adblockplus.showinstatusbar";
    prefs_to_reset[31] = "extensions.adblockplus.subscriptions_autoupdate";
    prefs_to_reset[32] = "extensions.adblockplus.subscriptions_exceptionscheckbox";
    prefs_to_reset[33] = "extensions.autoDisableScopes";
    prefs_to_reset[34] = "extensions.cookieController.1stPartyOnlyCount";
    prefs_to_reset[35] = "extensions.cookieController.startOff";
    prefs_to_reset[36] = "extensions.getAddons.cache.enabled";
    prefs_to_reset[37] = "extensions.https_everywhere._observatory.enabled";
    prefs_to_reset[38] = "extensions.https_everywhere._observatory.popup_shown";
    prefs_to_reset[39] = "extensions.https_everywhere._observatory.proxy_host";
    prefs_to_reset[40] = "extensions.https_everywhere._observatory.proxy_port";
    prefs_to_reset[41] = "extensions.https_everywhere._observatory.proxy_type";
    prefs_to_reset[42] = "extensions.https_everywhere._observatory.use_custom_proxy";
    prefs_to_reset[43] = "extensions.https_everywhere._observatory.use_tor_proxy";
    prefs_to_reset[44] = "extensions.https_everywhere.toolbar_hint_shown";
    prefs_to_reset[45] = "extensions.ui.dictionary.hidden";
    prefs_to_reset[46] = "extensions.ui.experiment.hidden";
    prefs_to_reset[47] = "extensions.ui.lastCategory";
    prefs_to_reset[48] = "extensions.ui.locale.hidden";
    prefs_to_reset[49] = "extensions.update.notifyUser";
    prefs_to_reset[50] = "noscript.ABE.migration";
    prefs_to_reset[51] = "noscript.autoReload";
    prefs_to_reset[52] = "noscript.canonicalFQDN";
    prefs_to_reset[53] = "noscript.contentBlocker";
    prefs_to_reset[54] = "noscript.ctxMenu";
    prefs_to_reset[55] = "noscript.filterXExceptions";
    prefs_to_reset[56] = "noscript.firstRunRedirection";
    prefs_to_reset[57] = "noscript.forbidBookmarklets";
    prefs_to_reset[58] = "noscript.gtemp";
    prefs_to_reset[59] = "noscript.showAllowPage";
    prefs_to_reset[60] = "noscript.showBlockedObjects";
    prefs_to_reset[61] = "noscript.showDistrust";
    prefs_to_reset[62] = "noscript.showDomain";
    prefs_to_reset[63] = "noscript.showGlobal";
    prefs_to_reset[64] = "noscript.showPermanent";
    prefs_to_reset[65] = "noscript.showRecentlyBlocked";
    prefs_to_reset[66] = "noscript.showTempAllowPage";
    prefs_to_reset[67] = "noscript.showUntrusted";
    prefs_to_reset[68] = "noscript.showUntrustedPlaceholder";
    prefs_to_reset[69] = "noscript.subscription.lastCheck";
    prefs_to_reset[70] = "noscript.temp";
    prefs_to_reset[71] = "noscript.toolbarToggle";
    prefs_to_reset[72] = "font.name.sans-serif.x-western";
    prefs_to_reset[73] = "font.name.serif.x-western";
    prefs_to_reset[74] = "general.productSub.override";
    prefs_to_reset[75] = "intl.accept_languages";
    prefs_to_reset[76] = "intl.charset.default";
    prefs_to_reset[77] = "media.cache_size";
    prefs_to_reset[78] = "network.http.spdy.enabled";
    prefs_to_reset[79] = "network.seer.enabled";
    prefs_to_reset[80] = "plugin.state.flash";
    prefs_to_reset[81] = "plugin.state.java";
    prefs_to_reset[82] = "plugin.state.npctrl";
    prefs_to_reset[83] = "plugin.state.npdeployjava";
    prefs_to_reset[84] = "plugin.state.npgoogleupdate";
    prefs_to_reset[85] = "plugin.state.npintelwebapiipt";
    prefs_to_reset[86] = "plugin.state.npintelwebapiupdater";
    prefs_to_reset[87] = "plugin.state.npitunes";
    prefs_to_reset[88] = "plugin.state.nplwaplugin";
    prefs_to_reset[89] = "plugin.state.nppdf";
    prefs_to_reset[90] = "plugin.state.npspwrap";
    prefs_to_reset[91] = "plugins.hide_infobar_for_missing_plugin";
    prefs_to_reset[92] = "pref.advanced.images.disable_button.view_image";
    prefs_to_reset[93] = "pref.advanced.javascript.disable_button.advanced";
    prefs_to_reset[94] = "pref.privacy.disable_button.cookie_exceptions";
    prefs_to_reset[95] = "security.ssl3.dhe_dss_aes_128_sha";
    prefs_to_reset[96] = "security.ssl3.dhe_dss_aes_256_sha";
    prefs_to_reset[97] = "security.ssl3.dhe_rsa_aes_128_sha";
    prefs_to_reset[98] = "security.ssl3.dhe_rsa_aes_256_sha";
    prefs_to_reset[99] = "security.ssl3.dhe_rsa_camellia_128_sha";
    prefs_to_reset[100] = "security.ssl3.dhe_rsa_camellia_256_sha";
    prefs_to_reset[101] = "security.ssl3.dhe_rsa_des_ede3_sha";
    prefs_to_reset[102] = "security.ssl3.ecdhe_ecdsa_rc4_128_sha";
    prefs_to_reset[103] = "security.ssl3.ecdhe_rsa_des_ede3_sha";
    prefs_to_reset[104] = "security.ssl3.ecdhe_rsa_rc4_128_sha";
    prefs_to_reset[105] = "security.ssl3.rsa_des_ede3_sha";
    prefs_to_reset[106] = "security.ssl3.rsa_rc4_128_md5";
    prefs_to_reset[107] = "security.ssl3.rsa_rc4_128_sha";
    prefs_to_reset[108] = "toolkit.startup.last_success";
    prefs_to_reset[109] = "accessibility.typeaheadfind.flashBar";
    prefs_to_reset[110] = "app.update.auto";
    prefs_to_reset[111] = "app.update.lastUpdateTime.addon-background-update-timer";
    prefs_to_reset[112] = "app.update.lastUpdateTime.background-update-timer";
    prefs_to_reset[113] = "app.update.lastUpdateTime.blocklist-background-update-timer";
    prefs_to_reset[114] = "app.update.lastUpdateTime.microsummary-generator-update-timer";
    prefs_to_reset[115] = "app.update.lastUpdateTime.places-maintenance-timer";
    prefs_to_reset[116] = "app.update.lastUpdateTime.restart-nag-timer";
    prefs_to_reset[117] = "app.update.lastUpdateTime.search-engine-update-timer";
    prefs_to_reset[118] = "app.update.never.3.6";
    prefs_to_reset[119] = "bcpm.Button.Shown";
    prefs_to_reset[120] = "browser.aboutHomeSnippets.updateUrl";
    prefs_to_reset[121] = "browser.cache.disk.capacity";
    prefs_to_reset[122] = "browser.cache.disk.enable";
    prefs_to_reset[123] = "browser.cache.disk_cache_ssl";
    prefs_to_reset[124] = "browser.cache.memory.capacity";
    prefs_to_reset[125] = "browser.cache.offline.enable";
    prefs_to_reset[126] = "browser.cache.compression_level";
    prefs_to_reset[127] = "browser.download.hide_plugins_without_extensions";
    prefs_to_reset[128] = "browser.download.manager.alertOnEXEOpen";
    prefs_to_reset[129] = "browser.download.manager.addToRecentDocs";
    prefs_to_reset[130] = "browser.download.manager.retention";
    prefs_to_reset[131] = "browser.download.useDownloadDir";
    prefs_to_reset[132] = "browser.newtab.url";
    prefs_to_reset[133] = "browser.newtabpage.enabled";
    prefs_to_reset[134] = "browser.feeds.handler";
    prefs_to_reset[135] = "browser.feeds.handler.default";
    prefs_to_reset[136] = "browser.feeds.showFirstRunUI";
    prefs_to_reset[137] = "browser.fixup.alternate.enabled";
    prefs_to_reset[138] = "browser.formfill.enable";
    prefs_to_reset[139] = "browser.history_expire_days";
    prefs_to_reset[140] = "browser.history_expire_days.mirror";
    prefs_to_reset[141] = "browser.microsummary.enabled";
    prefs_to_reset[142] = "browser.migration.version";
    prefs_to_reset[143] = "browser.offline";
    prefs_to_reset[144] = "browser.offline-apps.notify";
    prefs_to_reset[145] = "browser.places.importBookmarksHTML";
    prefs_to_reset[146] = "browser.places.importDefaults";
    prefs_to_reset[147] = "browser.places.leftPaneFolderId";
    prefs_to_reset[148] = "browser.places.migratePostDataAnnotations";
    prefs_to_reset[149] = "browser.places.smartBookmarksVersion";
    prefs_to_reset[150] = "browser.places.updateRecentTagsUri";
    prefs_to_reset[151] = "browser.preferences.advanced.selectedTabIndex";
    prefs_to_reset[152] = "browser.preferences.privacy.selectedTabIndex";
    prefs_to_reset[153] = "browser.rights.3.shown";
    prefs_to_reset[154] = "browser.search.defaultenginename";
    prefs_to_reset[155] = "browser.search.hiddenOneOffs";
    prefs_to_reset[156] = "browser.search.selectedEngine";
    prefs_to_reset[157] = "browser.search.update";
    prefs_to_reset[158] = "browser.search.useDBForOrder";
    prefs_to_reset[159] = "browser.sessionstore.enabled";
    prefs_to_reset[160] = "browser.sessionstore.resume_from_crash";
    prefs_to_reset[161] = "browser.shell.checkDefaultBrowser";
    prefs_to_reset[162] = "browser.startup.page";
    prefs_to_reset[163] = "browser.throbber.url";
    prefs_to_reset[164] = "font.name.serif.x-western";
    prefs_to_reset[165] = "font.name.sans-serif.x-western";
    prefs_to_reset[166] = "general.appname.override";
    prefs_to_reset[167] = "general.appversion.override";
    prefs_to_reset[168] = "general.buildID.override";
    prefs_to_reset[169] = "general.oscpu.override";
    prefs_to_reset[170] = "general.platform.override";
    prefs_to_reset[171] = "general.productsub.override";
    prefs_to_reset[172] = "general.useragent.override";
    prefs_to_reset[173] = "general.useragent.vendor";
    prefs_to_reset[174] = "general.useragent.vendorSub";
    prefs_to_reset[175] = "capability.policy.allowclipboard.Clipboard.cutcopy";
    prefs_to_reset[176] = "capability.policy.allowclipboard.Clipboard.paste";
    prefs_to_reset[177] = "capability.policy.allowclipboard.sites";
    prefs_to_reset[178] = "capability.policy.maonoscript.javascript.enabled";
    prefs_to_reset[179] = "capability.policy.maonoscript.sites";
    prefs_to_reset[180] = "capability.policy.policynames";
    prefs_to_reset[181] = "compact.menu.firstrun";
    prefs_to_reset[182] = "copyplaintext.default";
    prefs_to_reset[183] = "copyplaintext.formatting.extra.newline";
    prefs_to_reset[184] = "copyplaintext.formatting.extra.space";
    prefs_to_reset[185] = "copyplaintext.formatting.trim";
    prefs_to_reset[186] = "datareporting.healthreport.service.enabled";
    prefs_to_reset[187] = "datareporting.healthreport.uploadEnabled";
    prefs_to_reset[188] = "datareporting.policy.dataSubmissionEnabled";
    prefs_to_reset[189] = "dom.max_chrome_script_run_time";
    prefs_to_reset[190] = "dom.event.clipboardevents.enabled";
    prefs_to_reset[191] = "dom.storage.enabled";
    prefs_to_reset[192] = "geo.enabled";
    prefs_to_reset[193] = "intl.accept_languages";
    prefs_to_reset[194] = "ipv6ident.color";
    prefs_to_reset[195] = "ipv6ident.colorv4";
    prefs_to_reset[196] = "ipv6ident.colorv6";
    prefs_to_reset[197] = "ipv6ident.hiddentab";
    prefs_to_reset[198] = "ipv6ident.ipv4style";
    prefs_to_reset[199] = "ipv6ident.newtab";
    prefs_to_reset[200] = "ipv6ident.urls";
    prefs_to_reset[201] = "keyword.enabled";
    prefs_to_reset[202] = "gecko.buildID";
    prefs_to_reset[203] = "gecko.mstone";
    prefs_to_reset[204] = "javascript.options.ion.content";
    prefs_to_reset[205] = "javascript.options.baselinejit.content";
    prefs_to_reset[206] = "javascript.options.asmjs";
    prefs_to_reset[207] = "javascript.options.typeinference";
    prefs_to_reset[208] = "gfx.direct2d.disabled";
    prefs_to_reset[209] = "layers.acceleration.disabled";
    prefs_to_reset[210] = "local_install.addonsEnabled";
    prefs_to_reset[211] = "local_install.addons_view_override";
    prefs_to_reset[212] = "local_install.disableInstallDelay";
    prefs_to_reset[213] = "local_install.enableInstall";
    prefs_to_reset[214] = "local_install.hideToolsBuildID";
    prefs_to_reset[215] = "local_install.hideToolsExtensionOptionsMenu";
    prefs_to_reset[216] = "local_install.hideToolsMyConfig";
    prefs_to_reset[217] = "local_install.hideToolsOpenProfile";
    prefs_to_reset[218] = "local_install.hideToolsOptionsMenu";
    prefs_to_reset[219] = "local_install.hideToolsThemeSwitcherMenu";
    prefs_to_reset[220] = "local_install.prompt_disableInstallDelay";
    prefs_to_reset[221] = "local_install.promptingToAutoUninstall";
    prefs_to_reset[222] = "local_install.selected_settings_sub_tab3";
    prefs_to_reset[223] = "local_install.selected_settings_sub_tab4";
    prefs_to_reset[224] = "local_install.showAddonsMyConfigImage";
    prefs_to_reset[225] = "local_install.showEMMenuButton";
    prefs_to_reset[226] = "local_install.showTMMenuButton";
    prefs_to_reset[227] = "network.cookie.cookieBehavior";
    prefs_to_reset[228] = "network.dns.disablePrefetch";
    prefs_to_reset[229] = "network.http.accept.default";
    prefs_to_reset[230] = "network.http.max-persistent-connections-per-proxy";
    prefs_to_reset[231] = "network.http.pipelining.maxrequests";
    prefs_to_reset[232] = "network.http.proxy.keep-alive";
    prefs_to_reset[233] = "network.prefetch-next";
    prefs_to_reset[234] = "network.protocol-handler.warn-external.file";
    prefs_to_reset[235] = "network.protocol-handler.warn-external.mailto";
    prefs_to_reset[236] = "network.protocol-handler.warn-external.news";
    prefs_to_reset[237] = "network.protocol-handler.warn-external.nntp";
    prefs_to_reset[238] = "network.protocol-handler.warn-external.snews";
    prefs_to_reset[239] = "network.proxy.ftp";
    prefs_to_reset[240] = "network.proxy.ftp_port";
    prefs_to_reset[241] = "network.proxy.gopher";
    prefs_to_reset[242] = "network.proxy.gopher_port";
    prefs_to_reset[243] = "network.proxy.http";
    prefs_to_reset[244] = "network.proxy.http_port";
    prefs_to_reset[245] = "network.proxy.socks_remote_dns";
    prefs_to_reset[246] = "network.proxy.ssl";
    prefs_to_reset[247] = "network.proxy.ssl_port";
    prefs_to_reset[248] = "network.proxy.socks";
    prefs_to_reset[249] = "network.proxy.socks_port";
    prefs_to_reset[250] = "network.proxy.type";
    prefs_to_reset[251] = "network.websocket.enabled";
    prefs_to_reset[252] = "pref.advanced.images.disable_button.view_image";
    prefs_to_reset[253] = "pref.advanced.javascript.disable_button.advanced";
    prefs_to_reset[254] = "pref.browser.homepage.disable_button.current_page";
    prefs_to_reset[255] = "pref.browser.language.disable_button.remove";
    prefs_to_reset[256] = "pref.browser.language.disable_button.up";
    prefs_to_reset[257] = "pref.privacy.disable_button.cookie_exceptions";
    prefs_to_reset[258] = "pref.privacy.disable_button.view_cookies";
    prefs_to_reset[259] = "privacy.clearOnShutdown.passwords";
    prefs_to_reset[260] = "privacy.cpd.cookies";
    prefs_to_reset[261] = "privacy.item.passwords";
    prefs_to_reset[262] = "privacy.sanitize.didShutdownSanitize";
    prefs_to_reset[263] = "privacy.sanitize.migrateFx3Prefs";
    prefs_to_reset[264] = "privacy.sanitize.promptOnSanitize";
    prefs_to_reset[265] = "privacy.sanitize.sanitizeOnShutdown";
    prefs_to_reset[266] = "profileswitcher.close_before_launch";
    prefs_to_reset[267] = "profileswitcher.where_show_name";
    prefs_to_reset[268] = "pttl.menu-add-bookmark";
    prefs_to_reset[269] = "pttl.menu-append";
    prefs_to_reset[270] = "pttl.menu-complete-menu";
    prefs_to_reset[271] = "pttl.menu-def-open";
    prefs_to_reset[272] = "pttl.menu-def-save";
    prefs_to_reset[273] = "pttl.menu-save-in-file";
    prefs_to_reset[274] = "pttl.menu-search-groups-tab";
    prefs_to_reset[275] = "pttl.menu-search-groups-win";
    prefs_to_reset[276] = "pttl.menu-send-mail-to";
    prefs_to_reset[277] = "pttl.menu-send-text-to";
    prefs_to_reset[278] = "pttl.menu-translate";
    prefs_to_reset[279] = "pttl.open-type";
    prefs_to_reset[280] = "pttl.save-directory-default";
    prefs_to_reset[281] = "pttl.save-extension-default";
    prefs_to_reset[282] = "pttl.save-with-UTF8";
    prefs_to_reset[283] = "reloadSearchPlugins";
    prefs_to_reset[284] = "security.disable_button.openCertManager";
    prefs_to_reset[285] = "security.disable_button.openDeviceManager";
    prefs_to_reset[286] = "security.enable_ssl3";
    prefs_to_reset[287] = "security.tls.version.min";
    prefs_to_reset[288] = "security.OCSP.enabled";
    prefs_to_reset[289] = "signon.rememberSignons";
    prefs_to_reset[290] = "toolkit.telemetry.prompted";
    prefs_to_reset[291] = "toolkit.telemetry.rejected";
    prefs_to_reset[292] = "xpinstall.whitelist.add";
    prefs_to_reset[293] = "xpinstall.whitelist.add.103";
    prefs_to_reset[294] = "extensions.adblockplus.checkedadblockinstalled";
    prefs_to_reset[295] = "extensions.adblockplus.checkedtoolbar";
    prefs_to_reset[296] = "extensions.adblockplus.correctTyposAsked";
    prefs_to_reset[297] = "extensions.adblockplus.showintoolbar";
    prefs_to_reset[298] = "extensions.adblockplus.showsubscriptions";
    prefs_to_reset[299] = "noscript.blockNSWB";
    prefs_to_reset[300] = "noscript.httpsForcedExceptions";
    prefs_to_reset[301] = "noscript.options.tabSelectedIndexes";
    prefs_to_reset[302] = "noscript.policynames";
    prefs_to_reset[303] = "noscript.untrusted";
    prefs_to_reset[304] = "dom.enable_resource_timing";
    prefs_to_reset[305] = "dom.enable_user_timing";
    prefs_to_reset[306] = "dom.keyboardevent.code.enabled";
    prefs_to_reset[307] = "dom.beforeAfterKeyboardEvent.enabled";
    prefs_to_reset[308] = "dom.keyboardevent.dispatch_during_composition";
    prefs_to_reset[309] = "browser.search.countryCode";
    prefs_to_reset[310] = "browser.search.geoSpecificDefaults";
    prefs_to_reset[311] = "browser.search.geoip.url";
    prefs_to_reset[312] = "network.http.speculative-parallel-limit";
    prefs_to_reset[313] = "devtools.webide.enabled";
    prefs_to_reset[314] = "devtools.webide.autoinstallADBHelper";
    prefs_to_reset[315] = "devtools.webide.autoinstallFxdtAdapters";
    prefs_to_reset[316] = "font.blacklist.underline_offset";
    prefs_to_reset[317] = "network.http.accept-encoding.secure";
    prefs_to_reset[318] = "extensions.jondofox.network.http.accept-encoding.secure";
    
    for(var i = 0; i <= prefs_to_reset.length; i++){
    
       require("sdk/preferences/service").reset(prefs_to_reset[i]);
    
    }
  
  },

  isFirefox4or7or12orNot18: function() {
    // Due to some changes in Firefox 4 (notably the replacement of the
    // nsIExtensionmanager by the AddonManager) we check the FF version now
    // to ensure compatibility.
    var appInfo = CC['@mozilla.org/xre/app-info;1'].
	    getService(CI.nsIXULAppInfo);
    var versComp = CC['@mozilla.org/xpcom/version-comparator;1'].
	    getService(CI.nsIVersionComparator);
    var ffVersion = appInfo.version;
 
    if (versComp.compare(ffVersion, "4.0a1") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "7.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "12.0") >= 0) {
      this.ff12 = true;
      isOld = true;
      isAboveFF38 = false;
    } else {
      this.ff12 = false;
    }
    if (versComp.compare(ffVersion, "19.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "19.0.1") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "19.0.2") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "20.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "20.0.1") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "21.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "22.0") >= 0) {
      this.ff22 = true;
      isOld = true;
      isAboveFF38 = false;
    } else {
      this.ff22 = false;
    }
    if (versComp.compare(ffVersion, "23.0") >= 0) {
      this.ff23 = true;
      isOld = true;
      isAboveFF38 = false;
    } else {
      this.ff23 = false;
    }
    if (versComp.compare(ffVersion, "23.0.1") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "24.0") >= 0) {
      this.ff24 = true;
      isOld = true;
      isAboveFF38 = false;
    } else {
      this.ff24 = false;
    }
    if (versComp.compare(ffVersion, "24.5.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "24.7.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "24.3.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "24.2.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "24.8.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "24.1.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "24.4.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "24.6.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "24.8.1") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "24.1.1") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "25.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "25.0.1") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "26.0") >= 0) {
      this.ff26 = true;
      isOld = true;
      isAboveFF38 = false;
    } else {
      this.ff26 = false;
    }
    if (versComp.compare(ffVersion, "27.0") >= 0) {
      this.ff27 = true;
      isOld = true;
      isAboveFF38 = false;
    } else {
      this.ff27 = false;
    }
    if (versComp.compare(ffVersion, "27.0.1") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "28.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "18.0a1") < 0) {
      this.notFF18 = true;
      isOld = true;
      isAboveFF38 = false;
    } else {
      this.notFF18 = false;
    }
    if (versComp.compare(ffVersion, "29.0") >= 0) {
      this.ff29 = true;
      isOld = true;
      isAboveFF38 = false;
    } else {
      this.ff29 = false;
    }
    if (versComp.compare(ffVersion, "29.0.1") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "30.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "31.5.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "31.4.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "31.3.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "31.2.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "31.1.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "31.1.1") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "31.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "32.0") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "32.0.1") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "32.0.2") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "32.0.3") >= 0) {
       isOld = true;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "33.0") >= 0) {
       isOld = false;
       isAboveFF38 = false;
    }
    if (versComp.compare(ffVersion, "34.0") >= 0) {
      this.ff34 = true;
      isAboveFF38 = false;
    } else {
      this.ff34 = false;
    }
    if (versComp.compare(ffVersion, "35.0") >= 0) {
      this.ff35 = true;
      isAboveFF38 = false;
    } else {
      this.ff35 = false;
    }
    if (versComp.compare(ffVersion, "36.0") >= 0) {
      this.ff36 = true;
      isAboveFF38 = false;
    } else {
      this.ff36 = false;
    }
    if (versComp.compare(ffVersion, "37.0") >= 0) {
      this.ff37 = true;
      isAboveFF38 = false;
    } else {
      this.ff37 = false;
    }

  },

  /**
   * Show a warning if the whole profile has to be updated and not just our
   * extension
   */

  checkProfileUpdate: function() {
    log("Checking whether we have to update the profile ..");
    try {
      var curr_profile_version_string = this.prefsHandler.getStringPref('extensions.jondofox.profile_version');
      
      // If Version is something like 2.11.0 and not 2.11 (need to cut last '.')
      // IMPORTANT: Versions like 2.11.0.1 are not supported and will most likely break this function!!!!!
      if(curr_profile_version_string.indexOf(".") !== curr_profile_version_string.lastIndexOf(".")){
      
         var a = curr_profile_version_string.slice(0, curr_profile_version_string.lastIndexOf("."));
         var b = curr_profile_version_string.slice(curr_profile_version_string.lastIndexOf(".")+1, curr_profile_version_string.length);
      
         curr_profile_version_string = a + b;
      
      }
      
      var curr_profile_version = Number.parseFloat(curr_profile_version_string);
      
      if (curr_profile_version < 2.110 &&
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

  savePluginSettings: function() {
    log("Saving plugins...");
    var pluginHost = CC["@mozilla.org/plugin/host;1"].getService(CI.nsIPluginHost);
    var plugins = pluginHost.getPluginTags();
    var oldPlugins = {};
    for (var i = 0; i < plugins.length; i++) {
      var p = plugins[i];
      if ("enabledState" in p) {
         log(p.name + " : " + p.enabledState);
         oldPlugins[p.name] = p.enabledState;
      } else {
         log(p.name + " : " + p.disabled);
         oldPlugins[p.name] = p.disabled;
      }
    }
    var pluginJSON = JSON.stringify(oldPlugins);
    this.prefsHandler.setStringPref("extensions.jondofox.saved_plugin_settings",
      pluginJSON);
  },

  enforceCachePref: function() {
        // Set cache preferences     
        this.prefsHandler.setBoolPref("browser.cache.disk.enable", false);
        this.prefsHandler.setBoolPref("browser.cache.disk_cache_ssl", false);
        this.prefsHandler.setBoolPref("browser.cache.memory.enable", true);
        this.prefsHandler.setBoolPref("browser.cache.offline.enable", false);
        this.prefsHandler.setIntPref("media.cache_size", 0);
      
        this.prefsHandler.setIntPref("browser.cache.compression_level", 1);
        this.prefsHandler.setIntPref("image.cache.size", 5242880);     
  },

  enforceSSLPref: function() {

      if (this.prefsHandler.getBoolPref("extensions.jondofox.disable_insecure_ssl_cipher")) {
        if (this.ff24) {
           this.prefsHandler.setIntPref("security.tls.version.min", 1);
           this.prefsHandler.setIntPref("security.tls.version.max", 3);
        } else {
           this.prefsHandler.setBoolPref("security.enable_ssl3", false);
        }
        // not for latest FF anymore
        this.prefsHandler.deletePreference("security.ssl3.ecdh_ecdsa_rc4_128_sha");
        this.prefsHandler.deletePreference("security.ssl3.ecdh_rsa_rc4_128_sha");
        this.prefsHandler.setBoolPref("security.ssl3.ecdhe_ecdsa_rc4_128_sha", false);
        this.prefsHandler.setBoolPref("security.ssl3.ecdhe_rsa_rc4_128_sha", false);
        this.prefsHandler.setBoolPref("security.ssl3.rsa_rc4_128_md5", false);
        this.prefsHandler.setBoolPref("security.ssl3.rsa_rc4_128_sha", false);
        this.prefsHandler.setBoolPref("security.ssl3.dhe_rsa_des_ede3_sha", false);
        this.prefsHandler.setBoolPref("security.ssl3.ecdhe_rsa_des_ede3_sha", false);
        this.prefsHandler.setBoolPref("security.ssl3.rsa_des_ede3_sha", false);
        this.prefsHandler.setBoolPref("security.ssl3.dhe_dss_aes_128_sha", false);
        this.prefsHandler.setBoolPref("security.ssl3.dhe_dss_aes_256_sha", false);
        this.prefsHandler.setBoolPref("security.ssl3.dhe_rsa_aes_128_sha", false);
        this.prefsHandler.setBoolPref("security.ssl3.dhe_rsa_aes_256_sha", false);
        this.prefsHandler.setBoolPref("security.ssl3.dhe_rsa_camellia_128_sha", false);
        this.prefsHandler.setBoolPref("security.ssl3.dhe_rsa_camellia_256_sha", false);



        this.prefsHandler.deletePreference("security.ssl3.rsa_fips_des_ede3_sha");
        this.prefsHandler.deletePreference("security.ssl3.rsa_seed_sha");

     
      } else {
        if (this.ff24) {
           this.prefsHandler.deletePreference("security.tls.version.min");
           this.prefsHandler.deletePreference("security.tls.version.max");
        } else {
           this.prefsHandler.deletePreference("security.enable_ssl3");
        }
        this.prefsHandler.deletePreference("security.ssl3.ecdh_ecdsa_rc4_128_sha");
        this.prefsHandler.deletePreference("security.ssl3.ecdh_rsa_rc4_128_sha");
        this.prefsHandler.deletePreference("security.ssl3.ecdhe_ecdsa_rc4_128_sha");
        this.prefsHandler.deletePreference("security.ssl3.ecdhe_rsa_rc4_128_sha");
        this.prefsHandler.deletePreference("security.ssl3.rsa_rc4_128_md5");
        this.prefsHandler.deletePreference("security.ssl3.rsa_rc4_128_sha");

        this.prefsHandler.deletePreference("security.ssl3.rsa_des_ede3_sha");
        this.prefsHandler.deletePreference("security.ssl3.rsa_fips_des_ede3_sha");
        this.prefsHandler.deletePreference("security.ssl3.ecdhe_rsa_des_ede3_sha");
        this.prefsHandler.deletePreference("security.ssl3.ecdhe_ecdsa_des_ede3_sha");
        this.prefsHandler.deletePreference("security.ssl3.dhe_rsa_des_ede3_sha");
        this.prefsHandler.deletePreference("security.ssl3.ecdh_ecdsa_des_ede3_sha");
        this.prefsHandler.deletePreference("security.ssl3.dhe_dss_des_ede3_sha");
        this.prefsHandler.deletePreference("security.ssl3.ecdh_rsa_des_ede3_sha");
        this.prefsHandler.deletePreference("security.ssl3.dhe_rsa_aes_128_sha");
        this.prefsHandler.deletePreference("security.ssl3.dhe_rsa_aes_256_sha");
        this.prefsHandler.deletePreference("security.ssl3.dhe_rsa_camellia_128_sha");
        this.prefsHandler.deletePreference("security.ssl3.dhe_rsa_camellia_256_sha");

        this.prefsHandler.deletePreference("security.ssl3.rsa_seed_sha");
        this.prefsHandler.deletePreference("security.ssl3.dhe_dss_aes_128_sha");
        this.prefsHandler.deletePreference("security.ssl3.dhe_dss_aes_256_sha");
   
        this.prefsHandler.deletePreference("security.ssl3.rsa_fips_des_ede3_sha");
        this.prefsHandler.deletePreference("security.ssl3.rsa_seed_sha");

      }

      if (this.prefsHandler.getBoolPref("extensions.jondofox.disable_insecure_ssl_nego")) {
        this.prefsHandler.setBoolPref("security.ssl.require_safe_negotiation", true);
      } else {
        this.prefsHandler.setBoolPref("security.ssl.require_safe_negotiation", false);
      }

      if (this.prefsHandler.getBoolPref("extensions.jondofox.disable_insecure_ssl_mixed")) {
        this.prefsHandler.setBoolPref("security.mixed_content.block_display_content", true);
      } else {
        this.prefsHandler.setBoolPref("security.mixed_content.block_display_content", false);
      }

      this.prefsHandler.setBoolPref("security.ssl.enable_false_start", true);
  },

  clearMemoryCache: function() {

      this.prefsHandler.setIntPref("image.cache.size", 0);
      this.prefsHandler.setBoolPref("browser.cache.memory.enable", false);

      // clear DNS cache
      var olddns= null;
      if (this.prefsHandler.isPreferenceSet("network.dnsCacheExpiration")) {
         olddns= this.prefsHandler.getIntPref("network.dnsCacheExpiration");
      }
      this.prefsHandler.setIntPref("network.dnsCacheExpiration", 0);
      if (olddns != null) {
           this.prefsHandler.setIntPref("network.dnsCacheExpiration", olddns);
      } else {
           this.prefsHandler.deletePreference("network.dnsCacheExpiration");
      }
  },

  enforceObservatoryEnabled: function(state) {
      if (state === this.STATE_JONDO) {
         this.prefsHandler.setBoolPref("extensions.https_everywhere._observatory.enabled",
             this.prefsHandler.getBoolPref("extensions.jondofox.observatory.use_with_jondo"));
      }
      if (state === this.STATE_TOR) {
         this.prefsHandler.setBoolPref("extensions.https_everywhere._observatory.enabled",
             this.prefsHandler.getBoolPref("extensions.jondofox.observatory.use_with_tor"));
      }
      if (state === this.STATE_CUSTOM) {
         this.prefsHandler.setBoolPref("extensions.https_everywhere._observatory.enabled",
             this.prefsHandler.getBoolPref("extensions.jondofox.observatory.use_with_custom"));
      }
      if (state === this.STATE_NONE) {
         this.prefsHandler.setBoolPref("extensions.https_everywhere._observatory.enabled",
             this.prefsHandler.getBoolPref("extensions.jondofox.observatory.use_with_without"));
      }
  },

  enforcePluginPref: function(state) {
    var anz = new Object();
    var pluginHost = CC["@mozilla.org/plugin/host;1"].getService(CI.nsIPluginHost);
    var plugins = pluginHost.getPluginTags(anz);
    var userAgent = this.prefsHandler.getStringPref('extensions.jondofox.custom.user_agent');

    if ((state === this.STATE_JONDO) || 
        ((state ===  this.STATE_CUSTOM) && (userAgent === "jondo") ))  {
      for (var i = 0; i < anz.value; i++) {
        var p=plugins[i];
        if (/^Shockwave.*Flash/i.test(p.name)) {
          // We are disabling Flash if a user of the JonDoFox-Profile wanted to
          if (this.prefsHandler.getBoolPref("extensions.jondofox.disableAllPluginsJonDoMode")) {
              if (this.ff23) {
                  p.enabledState = CI.nsIPluginTag.STATE_DISABLED;
              } else {
                  p.disabled = true;
              }
          } else {
            // We need this if we are coming from Tor mode
             if (this.ff23) {
                  p.enabledState = CI.nsIPluginTag.STATE_ENABLED;
              } else {
                  p.disabled = false;
              }
          }
        } else {
           if (this.ff23) {
              p.enabledState = CI.nsIPluginTag.STATE_DISABLED;
           } else {
              p.disabled = true;
           }
        }
      }
      // We do not want to show a warning about missing plugins. No plugins
      // no security risk stemming from them.
      this.prefsHandler.setBoolPref("plugins.hide_infobar_for_missing_plugin", true);
      log("Enforce plug-ins settings for JonDo");

    } else if ((state === this.STATE_TOR) || 
               ((state ===  this.STATE_CUSTOM) && (userAgent === "tor") ))  {
      for (var i = 0; i < anz.value; i++) {
        // The TorBrowserBundle blocks all plugins by default
        var p = plugins[i];
        if (this.ff23) {
           p.enabledState = CI.nsIPluginTag.STATE_DISABLED;
        } else {
           p.disabled = true;
        }
      }
      // The same as for JonDo mode...
      this.prefsHandler.setBoolPref("plugins.hide_infobar_for_missing_plugin", true);
      log("Disabled all plug-ins for Tor");
 
    } else {
      for (var i = 0; i < anz.value; i++) {
        var p=plugins[i];
        if (/^Shockwave.*Flash/i.test(p.name)) {
          // Flash is set to click_to_play
          if (this.ff23) {
                  p.enabledState = CI.nsIPluginTag.STATE_ENABLED;
          } else {
                  p.disabled = false;
          }
        } else {
           // all other plugins are disabled
           if (this.ff23) {
              p.enabledState = CI.nsIPluginTag.STATE_DISABLED;
           } else {
              p.disabled = true;
           }
        }
      }
    }
  },

  setUserAgent_Jondo: function() {
        for (p in this.jondoUAMap) {
          this.prefsHandler.setStringPref(p,
               this.prefsHandler.getStringPref(this.jondoUAMap[p]));
        }
        //  Disable SPDY
        this.prefsHandler.setBoolPref('network.http.spdy.enabled', false);
        
	if (this.ff29) {
            // disable seer
            this.prefsHandler.setBoolPref('network.seer.enabled', false);
        } else {
            this.prefsHandler.setBoolPref('network.websocket.enabled', false);
	}
  },

  setUserAgent_Tor: function() {
       for (p in this.torUAMap) {
          this.prefsHandler.setStringPref(p,
               this.prefsHandler.getStringPref(this.torUAMap[p]));
        }
        //  Disable SPDY for Tor
        this.prefsHandler.setBoolPref('network.http.spdy.enabled', false);
        if (this.ff29) {
            // disable seer
            this.prefsHandler.setBoolPref('network.seer.enabled', false);
        } else {
            this.prefsHandler.setBoolPref('network.websocket.enabled', false);
	} 
  },

  // TODO: Transfor this function in a more general prefs setting function
  // depending on the proxy state.
  // Setting the user agent for the different proxy states
  setUserAgent: function(startup, state) {
    var p;
    var userAgent;
    var acceptLang = this.prefsHandler.getStringPref("intl.accept_languages");

    log("Setting user agent and other stuff for: " + state);
    // First the plugin pref
    this.enforcePluginPref(state);

    switch(state) {
      case (this.STATE_JONDO):
        this.setUserAgent_Jondo();
        break;

      case (this.STATE_TOR):
        this.setUserAgent_Tor();
        break;

      case (this.STATE_CUSTOM):
        userAgent = this.prefsHandler.getStringPref('extensions.jondofox.custom.user_agent');
        if (userAgent === 'jondo') {
          this.setUserAgent_Jondo();
          
        } else if (userAgent === 'tor') {
          this.setUserAgent_Tor();

        } else if (userAgent === 'win') {
          for (p in this.windowsUAMap) {
              this.prefsHandler.setStringPref(p,
               this.prefsHandler.getStringPref(this.windowsUAMap[p]));
          }
        
          //  Enable SPDY, because it is default for Firefox
          this.prefsHandler.setBoolPref('network.http.spdy.enabled', true);
          if (this.ff29) {
             this.prefsHandler.setBoolPref('network.seer.enabled', true);
          }
        } else {
          // We use the opportunity to set other user prefs back to their
          // default values as well.
          this.clearPrefs();
        }
        break;
      case (this.STATE_NONE):
        this.clearPrefs();
        for (p in this.safebrowseMap) {
            this.prefsHandler.deletePreference(p);
        }
        
	break;
      default:
	log("We should not be here!");
        break;
    }
    // Setting the timezone according to the proxy settings and, on startup,
    // saving the original one for recovery.
    this.setTimezone(startup, state);
  },

  // We get the original values (needed for proxy = none and if the user 
  // chooses the unfaked custom proxy) if we clear the relevant
  // preferences.
  clearPrefs: function() {
    var branch;
    try {
      // We only have to reset the values if this has not yet been done.
      if (this.prefsHandler.getStringPref('general.useragent.override') !== null) {
        this.prefsHandler.deletePreference('general.useragent.override');
        this.prefsHandler.deletePreference('general.appname.override');
        this.prefsHandler.deletePreference('general.appversion.override');
        this.prefsHandler.deletePreference('general.useragent.vendor');
        this.prefsHandler.deletePreference('general.useragent.vendorSub');
        this.prefsHandler.deletePreference('general.platform.override');
        this.prefsHandler.deletePreference('general.oscpu.override');
        this.prefsHandler.deletePreference('general.buildID.override');
        this.prefsHandler.deletePreference('general.productsub.override');
        this.prefsHandler.deletePreference("intl.accept_languages");
        this.prefsHandler.deletePreference("image.http.accept");
        this.prefsHandler.deletePreference("network.http.accept.default");
        this.prefsHandler.deletePreference("network.http.accept-encoding");
        this.prefsHandler.deletePreference("intl.charset.default");
        this.prefsHandler.deletePreference('network.http.spdy.enabled');
        this.prefsHandler.deletePreference('network.websocket.enabled');
        this.prefsHandler.deletePreference('network.seer.enabled'); 
       }

    } catch (e) {
      log("clearPrefs(): " + e);
    }
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
    var i;
    try {
      var feedType =  [this.jdfUtils.getString('jondofox.feed'),
                       this.jdfUtils.getString('jondofox.audiofeed'),
                       this.jdfUtils.getString('jondofox.videofeed')];
      var feedArray = ["feeds", "audioFeeds", "videoFeeds"];
      if (this.prefsHandler.getBoolPref('extensions.jondofox.firstStart')) {
        log("New profile, calling correctExternalApplications with |true|\n");
        this.correctExternalApplications(true);
        for (i = 0; i < 3; i++) {
          if (this.prefsHandler.getStringPref(
	      'browser.' + feedArray[i] + '.handler') === "reader" &&
	      this.prefsHandler.getStringPref(
              'browser.' + feedArray[i] + '.handler.default') === "client") {
            this.prefsHandler.setStringPref(
              'browser.'+ feedArray[i] + '.handler', "bookmarks");
	  }
        }
      } else {
        this.correctExternalApplications(false);
        for (i = 0; i < 3; i++) {
          if (this.prefsHandler.getStringPref(
	      'browser.' + feedArray[i] + '.handler') === "reader" &&
	      this.prefsHandler.getStringPref(
              'browser.' + feedArray[i] + '.handler.default') === "client") {
            this.prefsHandler.setStringPref(
                'browser.'+ feedArray[i] + '.handler', "bookmarks");
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
        // FIXME: type.value does not work because it is not the holder of
        // the value!! See: textboxContent and rewrite the whole code here!
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
      var normalBox = window.document.getElementById("normalBox").
        getAttribute("collapsed");
      var textbox = window.document.getElementById("type");
      var textboxContent = window.document.
        getAnonymousElementByAttribute(textbox, "anonid", "input").value;

      // We cannot just use the MIME-Type here because it is set according
      // to the delivered content-type header and some other sophisticated means
      // (see nsURILoader.cpp and nsExternalHelperAppService.cpp). Some servers
      // suck and deliver the wrong MIME-Type (e.g. application/octetstream)
      // but the file is a .pdf or a .doc, though. In this case checking the 
      // MIME-Type would not result in showing the proper warning dialog. 
      // It is, therefore, safer to use the file type found by Firefox itself.
      // If the XUL-window is collapsed then we only see a "Save file" and a
      // "Cancel"-Button. This happens e.g. if the file is a binary or a DOS-
      // executable. Hence, we do not need to show the warning. Besides checking
      // whether the normalBox is collapsed we check in the first else-if- 
      // clause other file extensions. These are part of a whitelist whose 
      // members are not dangerous if one opens them directly. Thus, again,
      // no sign of a warning.

      if (normalBox || textboxContent.indexOf("TeX") !== -1) {
        //do nothing: we do not want any warning here because the user cannot
        //open these files directly or they are not dangerous, thus we return
	return;
      } else if (textboxContent.indexOf("Adobe Acrobat") !== -1 ||
	       textboxContent.indexOf("PDF") !== -1 ||
	       textboxContent.indexOf("Preview") !== -1) {
        window.document.loadOverlay("chrome://jondofox/content/external-pdf.xul",
                                    null);
        window.setTimeout(JDFManager.prototype.showWarning, 200, window, false, false);
      } else if (textboxContent.indexOf("Word") !== -1 ||
		 textboxContent.indexOf("Rich Text Format") !== -1 ||
		 textboxContent.indexOf("RTF") !== -1 ||
		 textboxContent.indexOf("doc File") !== -1) {
        window.document.loadOverlay("chrome://jondofox/content/external-doc.xul",
                                    null);
        window.setTimeout(JDFManager.prototype.showWarning, 50, window, false, false);
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
            if (JDFManager.prototype.prefsHandler.
                getBoolPref('extensions.jondofox.firstStart')) {
	      correctedValue = JDFManager.prototype.
		    correctExternalApplications(true);
            } else {
	      correctedValue = JDFManager.prototype.
		    correctExternalApplications(false);
            }
            if (correctedValue) {
	      wm = CC['@mozilla.org/appshell/window-mediator;1']
		          .getService(CI.nsIWindowMediator);
              applicationPane = wm.getMostRecentWindow(null);
              // Is the recent window really the application pane?
              if (applicationPane && applicationPane.document.
                  getElementById("handlersView")) {
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
      log("First start is: " + firstProgramStart + "\n");
      while (handledMimeTypes.hasMoreElements()) {
        var handledMimeType = handledMimeTypes.getNext().
            QueryInterface(CI.nsIHandlerInfo);
        var mimeType = handledMimeType.type;
        if (!handledMimeType.alwaysAskBeforeHandling && (mimeType !== "pdf" ||
            mimeType !== "mailto") && handledMimeType.preferredAction > 1) {
          log("MIME type is: " + mimeType + "\n");
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
      log("Getting proxy state and it is: " + this.prefsHandler.getStringPref(this.STATE_PREF) + "\n");
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
        // Set SSL Observatory settings
        this.proxyManager.disableProxySSLObservatory();
        this.prefsHandler.setBoolPref("extensions.https_everywhere._observatory.enabled",
                this.prefsHandler.getStringPref("extensions.jondofox.observatory.use_with_without"));
      } else {
        // State is not 'STATE_NONE' --> enable
        switch (state) {
          case this.STATE_JONDO:
            // Ensure that share_proxy_settings is unset
            this.prefsHandler.setBoolPref("network.proxy.share_proxy_settings", false);
            // Set proxies for all protocols but SOCKS
            this.proxyManager.setProxyAll(this.prefsHandler.getStringPref("extensions.jondofox.jondo.host"), 
                      this.prefsHandler.getIntPref("extensions.jondofox.jondo.port"));
            this.proxyManager.setProxySOCKS(this.prefsHandler.getStringPref("extensions.jondofox.jondo.host"), 
                      this.prefsHandler.getIntPref("extensions.jondofox.jondo.port"), 5);
            // Set SSL Observatory settings
            this.proxyManager.setProxySSLObservatoryHTTP(
                      this.prefsHandler.getStringPref("extensions.jondofox.jondo.host"), 
                      this.prefsHandler.getIntPref("extensions.jondofox.jondo.port"));
            this.prefsHandler.setBoolPref("extensions.https_everywhere._observatory.enabled",
                      this.prefsHandler.getBoolPref("extensions.jondofox.observatory.use_with_jondo"));
            break;

          case this.STATE_TOR:
            var prefix = "extensions.jondofox.tor."
            // Ensure that share_proxy_settings is unset
            this.prefsHandler.setBoolPref("network.proxy.share_proxy_settings", false);
            this.proxyManager.setProxyAll('', 0);
            // Set SOCKS or if the user wishes a HTTP/S-proxy additionally
            this.proxyManager.setProxyHTTP(this.prefsHandler.getStringPref(prefix + "http_host"),
                      this.prefsHandler.getIntPref(prefix + "http_port"));
            this.proxyManager.setProxySSL(this.prefsHandler.getStringPref(prefix + "ssl_host"),
                      this.prefsHandler.getIntPref(prefix + "ssl_port"));
            this.proxyManager.setProxySOCKS(this.prefsHandler.getStringPref(prefix + "socks_host"), 
                      this.prefsHandler.getIntPref(prefix + "socks_port"), 5);
            this.proxyManager.setSocksRemoteDNS(true);
            // Set SSL Observatory settings
            this.proxyManager.setProxySSLObservatorySOCKS(
                      this.prefsHandler.getStringPref(prefix + "socks_host"), 
                      this.prefsHandler.getIntPref(prefix + "socks_port"));
            this.prefsHandler.setBoolPref("extensions.https_everywhere._observatory.enabled",
                      this.prefsHandler.getStringPref("extensions.jondofox.observatory.use_with_tor"));
            break;

          case this.STATE_CUSTOM:
            var prefix = "extensions.jondofox.custom.";
            // Set share_proxy_settings to custom.share_proxy_settings
            this.disableProxy();
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
            this.proxyManager.setProxySOCKS(
                this.prefsHandler.getStringPref(prefix + "socks_host"),
                this.prefsHandler.getIntPref(prefix + "socks_port"),
                this.prefsHandler.getIntPref(prefix + "socks_version"));
            // not ready yet, fix it
            this.prefsHandler.setBoolPref("extensions.https_everywhere._observatory.enabled", false);
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
      CC["@mozilla.org/cookiemanager;1"].getService(CI.nsICookieManager).removeAll();
    } catch (e) {
      log("clearAllCookies(): " + e);
    }
    /*
    try {
      var storagemgr= CC["@mozilla.org/dom/storagemanager;1"].getService(CI.nsIDOMStorageManager);
      storagemgr.clearOfflineApps();
    } catch (e) {
      log("clearOfflineApps(): " + e);
    }
    */
  },

   clearCache: function() {
      
      //Re-run this to go sure we have the Versions loaded.
      this.isFirefox4or7or12orNot18();
      
      if (!isOld) { //FF Version => 33 so we use the new Cache API
      
         //New (from Empty Cache Button)
          this.getService('cache').clear();
   
      } else { 
      
         //Older version of clearCache()
      
         var cacheMgr = CC["@mozilla.org/network/cache-service;1"].getService(CI.nsICacheService);
         try {
             cacheMgr.evictEntries(CI.nsICache.STORE_ANYWHERE);
         }   catch (e) { 
             log("clearCache(): " + e); 
         }
         // clear DNS cache
         var olddns= null;
         if (this.prefsHandler.prefHasUserValue("network.dnsCacheExpiration")) {
            olddns= this.prefsHandler.getIntPref("network.dnsCacheExpiration");
         }
         this.prefsHandler.setIntPref("network.dnsCacheExpiration", 0);
         if (olddns != null) {
              this.prefsHandler.setIntPref("network.dnsCacheExpiration", olddns);
         } else {
              this.prefsHandler.clearUserPref("network.dnsCacheExpiration");
         }
      
      }
      
  },
  
  //ClearCache from Empty Cache Button
  getService: function(service_type) {
      switch (service_type) {
        case 'cache':
          return Components.classes["@mozilla.org/netwerk/cache-storage-service;1"]
          .getService(Components.interfaces.nsICacheStorageService);
        break;
        //cut
      }
  },


  // Clear image cache, e.g. when switching from one state to another
  clearImageCache: function() {
     try {
        if (this.notFF18) {
           // clear Image Cache for FF version < FF18
           var imgCache = CC["@mozilla.org/image/cache;1"].getService(CI.imgICache);
           if (imgCache) {
              imgCache.clearCache(false);
           }
        } else {
            // clear Image Cache for FF version > FF17
            var imgTools = CC["@mozilla.org/image/tools;1"].getService(CI.imgITools);
            var imgCache = imgTools.getImgCacheForDocument(null);
            if (imgCache) {
                imgCache.clearCache(false); 
            }
        }

     } catch(e) {
         log("Exception on image cache clearing: "+e);
     }
  },
  
   // Close all browser windows and tabs
  closeAllTabsAndWindows: function() {
	  
	  var wm = CC["@mozilla.org/appshell/window-mediator;1"].getService(CI.nsIWindowMediator);
	  var aktivewindow = wm.getMostRecentWindow(null);
      var enumerator = wm.getEnumerator("navigator:browser");
      var closeWins = new Array();
	  
      while(enumerator.hasMoreElements()) {
        var win = enumerator.getNext();
        var browser = win.getBrowser();
        if(!browser) {
          continue;
        }
        var tabs = browser.browsers.length;
        var remove = new Array();
        for(var i = 0; i < tabs; i++) {
            remove.push(browser.browsers[i]);
        }
        if(browser.browsers.length == remove.length) {
            browser.addTab("about:blank");
            if(win != aktivewindow) {
                closeWins.push(win);
            }
        }
        for(var i = 0; i < remove.length; i++) {
            remove[i].contentWindow.close();
        }
      }
      for(var i = 0; i < closeWins.length; ++i) {
            closeWins[i].close();
      }			
  },

  // Implement nsIObserver ////////////////////////////////////////////////////

  observe: function(subject, topic, data) {
    try {
      switch (topic) {
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

          // We reset the timezone here: That is usually not a problem as the
          // real timezone is read and saved during every startup. But if one
          // just updates extensions the old environment variables are kept
          // and it can happen that the timezone switching does not work
          // properly anymore. Thus...
          this.envSrv.set("TZ",
            this.prefsHandler.getStringPref("extensions.jondofox.tz_string"));

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
	  subject.addEventListener("load", JDFManager.prototype.
	    getUnknownContentTypeDialog, false);
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

          else if ((data === 'intl.accept_languages')
            && this.prefsHandler.isPreferenceSet('general.useragent.override')
            && this.prefsHandler.getStringPref('general.useragent.override') ===
	    this.prefsHandler.
	      getStringPref('extensions.jondofox.tor.useragent_override')) {
            // Do nothing here because the pref changed but it was for 
            // imitating Tor properly after the Tor UA has been activated.
          }

          else if (data === 'intl.accept_languages' && (this.getState() ===
		'none' || (this.getState() === 'custom' && !this.prefsHandler.
		  isPreferenceSet('general.useragent.override')))) {
            // Do nothing as the user resets her proxy and we just erase the
	    // pref values JonDoFox set in order to get the default ones back.
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

  // No service flag here. Otherwise the registration for FF3.6.x would not work
  // See: http://groups.google.com/group/mozilla.dev.extensions/browse_thread/
  // thread/d9f7d1754ae43045/97e55977ecea7084?show_docid=97e55977ecea7084 
  _xpcom_categories: [{category: "profile-after-change"}],
                      //{category: "content-policy"}],

  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports, CI.nsIObserver])
				         //CI.nsIContentPolicy])
};

// XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
// XPCOMUtils.generateNSGetModule is for Mozilla 1.9.1/1.9.2 (FF 3.5/3.6).

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([JDFManager]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([JDFManager]);

