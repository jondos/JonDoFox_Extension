/******************************************************************************
 * Copyright (c) 2008, JonDos GmbH
 * Author: Johannes Renner
 *
 * JonDoFox extension management and compatibility tasks + utilities
 *****************************************************************************/
 
///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

var mDebug = true;

// Log a message
function log(message) {
  if (mDebug) dump("JDFManager :: " + message + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CLASS_ID = Components.ID('{b5eafe36-ff8c-47f0-9449-d0dada798e00}');
const CLASS_NAME = 'JonDoFox-Manager'; 
const CONTRACT_ID = '@jondos.de/jondofox-manager;1';

///////////////////////////////////////////////////////////////////////////////
// Listen for events to delete traces in case of uninstall etc.
///////////////////////////////////////////////////////////////////////////////

// Singleton instance definition
var JDFManager = {
  
  // Clear preferences on application shutdown, e.g. uninstall
  cleanUp: false,

  // Set to true if the user was warned that an important pref was modified
  userWarned: false,

  // Incompatible extensions with their IDs
  extensions:
     { 'RefControl':'{455D905A-D37C-4643-A9E2-F6FEFAA0424A}',
       'SwitchProxy':'{27A2FD41-CB23-4518-AB5C-C25BAFFDE531}' },

  // This map of string preferences is given to the prefsMapper
  stringPrefsMap: 
     { 'general.appname.override':'extensions.jondofox.appname_override',
       'general.appversion.override':'extensions.jondofox.appversion_override',
       'general.buildID.override':'extensions.jondofox.buildID_override',
       'general.oscpu.override':'extensions.jondofox.oscpu_override',
       'general.platform.override':'extensions.jondofox.platform_override',
       'general.productsub.override':'extensions.jondofox.productsub_override',
       'general.useragent.override':'extensions.jondofox.useragent_override',
       'general.useragent.vendor':'extensions.jondofox.useragent_vendor',
       'general.useragent.vendorSub':'extensions.jondofox.useragent_vendorSub',
       'intl.accept_languages':'extensions.jondofox.accept_languages',
       'intl.charset.default':'extensions.jondofox.default_charset',
       'intl.accept_charsets':'extensions.jondofox.accept_charsets',
       'network.http.accept.default':'extensions.jondofox.accept_default' },

  // Different services
  prefsHandler: null,
  prefsMapper: null,
  promptService: null,

  // Localization strings
  stringBundle: null,

  // Inititalize services and stringBundle
  init: function() {
    log("Init services");
    try {
      this.prefsHandler = 
              Components.classes['@jondos.de/preferences-handler;1'].
                            getService().wrappedJSObject;
      this.prefsMapper = 
              Components.classes['@jondos.de/preferences-mapper;1'].
                            getService().wrappedJSObject;
      this.promptService = 
              Components.classes['@mozilla.org/embedcomp/prompt-service;1'].
                            getService(Components.interfaces.nsIPromptService);
      var bundleService = 
             Components.classes['@mozilla.org/intl/stringbundle;1'].
                getService(Components.interfaces.nsIStringBundleService);

      this.stringBundle = bundleService.createBundle(
                             'chrome://jondofox/locale/jondofox.properties');
    } catch (e) {
      log('init(): ' + e);
    }
  },
  
  // Try to uninstall other extensions
  checkExtensions: function() {
    try {
      // Get the extensions manager
      var em = Components.classes['@mozilla.org/extensions/manager;1'].
                  getService(Components.interfaces.nsIExtensionManager);
      // Iterate
      for (e in this.extensions) {
        log('Checking for ' + e);
        // Try to get the install location
        var loc = em.getInstallLocation(this.extensions[e]);
        // If present, uninstall
        if (loc != null) {
          log('Found ' + e + ', uninstalling ..');
          // Prompt a message window for every extension
          this.showAlert(this.getString('jondofox.dialog.attention'), 
                         this.formatString('jondofox.dialog.message.extension', [e]));
          // Uninstall
          em.uninstallItem(this.extensions[e]);
        } else {
          log(e + ' not found');
        }
      }
    } catch (err) {
      log('checkExtensions(): ' + err);
    }
  },
 
  // Call this on final-ui-startup
  onUIStartup: function() {
    log("Starting up, checking conditions ..");
    try {
      // Call init() first
      this.init();

      // Check for incompatible extensions
      this.checkExtensions();

      // TODO: Init referrer-forgery from here?

      // Map all preferences
      this.prefsMapper.setStringPrefs(this.stringPrefsMap);  
      this.prefsMapper.map();

      // Add an observer to the main pref branch after setting the prefs
      var prefs = this.prefsHandler.getPrefs();
      prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
      prefs.addObserver("", this, false);
      log("Observing privacy-related preferences ..");

      // Disable the history
      this.prefsHandler.setIntPref('browser.history_expire_days', 0);
      
      // If cookies are accepted from *all* sites --> reject all 
      // or reject third-party cookies only (cookiePref == 1)?
      var cookiePref = this.prefsHandler.getIntPref('network.cookie.cookieBehavior');
      if (cookiePref == 0) {
        this.prefsHandler.setIntPref('network.cookie.cookieBehavior', 1);
      }

      // If this is set, set it to false
      if (this.prefsHandler.isPreferenceSet('local_install.showBuildinWindowTitle')) {
        this.prefsHandler.setBoolPref('local_install.showBuildinWindowTitle', false);
      }
    } catch (e) {
      log("onUIStartup(): " + e);
    }
  },

  // Call this on deinstallation
  onUninstall: function() {
    log("Cleaning up ..");
    try {
      // Remove the preferences observer      
      log("Stop observing preferences ..");
      var prefs = this.prefsHandler.getPrefs();
      prefs.removeObserver("", this);

      // Unmap all preferences
      this.prefsMapper.unmap();
     
      // TODO: Delete the jondofox prefs branch
      // Delete the jondofox proxy state
      this.prefsHandler.deletePreference('extensions.jondofox.proxy.state');
    } catch (e) {
      log("onUninstall(): " + e);
    }
  },

  // This is called once on application startup
  registerObservers: function() {
    log("Register observers");
    try {
      var observers = Components.classes["@mozilla.org/observer-service;1"].
                        getService(Components.interfaces.nsIObserverService);
      // Add general observers
      observers.addObserver(this, "final-ui-startup", false);
      observers.addObserver(this, "em-action-requested", false);
      observers.addObserver(this, "quit-application-granted", false);
      observers.addObserver(this, "xul-window-destroyed", false);
    } catch (ex) {
      log("registerObservers(): " + ex);
    }
  },

  // Called once on application shutdown
  unregisterObservers: function() {
    log("Unregister observers");
    try {
      var observers = Components.classes["@mozilla.org/observer-service;1"].
                         getService(Components.interfaces.nsIObserverService);
      // Remove general observers
      observers.removeObserver(this, "final-ui-startup");
      observers.removeObserver(this, "em-action-requested");
      observers.removeObserver(this, "quit-application-granted");    
      observers.removeObserver(this, "xul-window-destroyed");
    } catch (ex) {
      log("unregisterObservers(): " + ex);
    }
  },
  
  // Utility functions ////////////////////////////////////////////////////////  
  // Show an alert using the prompt service
  showAlert: function(title, text) {
    try {
      return this.promptService.alert(null, title, text);
    } catch (e) {
      log("showAlert(): " + e);
    }
  },
  
  // Show a confirm dialog using the prompt service
  showConfirm: function(title, text) {
    try {
      return this.promptService.confirm(null, title, text);
    } catch (e) {
      log("showConfirm(): " + e);
    }
  },

  // Return a properties string
  getString: function(name) {
    log("Getting localized string: '" + name + "'");
    try {
      return this.stringBundle.GetStringFromName(name);
    } catch (e) {
      log("getString(): " + e);
    }
  },

  // Return a formatted string
  formatString: function(name, strArray) {
    log("Getting formatted string: '" + name + "'");
    try {
      return this.stringBundle.formatStringFromName(name, strArray, strArray.length);
    } catch (e) {
      log("formatString(): " + e);
    }  
  },

  // Return the current number of browser windows (not used at the moment)
  getWindowCount: function() {
    var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].
                getService(Components.interfaces.nsIWindowWatcher);  
    var window_enum = ww.getWindowEnumerator();
    var count = 0;
    while (window_enum.hasMoreElements()) {
      count++;
      window_enum.getNext();
    }
    return count;
  },

  // Implement nsIObserver ////////////////////////////////////////////////////
  observe: function(subject, topic, data) {
    try {
      switch (topic) {        
        case 'app-startup':
          log("Got topic --> " + topic);
          // Register observers
          this.registerObservers();
          break;
        
        case 'quit-application-granted':
          log("Got topic --> " + topic);
          // Clear preferences on shutdown after uninstall
          if (this.cleanUp) {
            this.onUninstall();
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
          subject.QueryInterface(Components.interfaces.nsIUpdateItem);
          if (subject.id == "{437be45a-4114-11dd-b9ab-71d256d89593}") {
            log("Got topic --> " + topic + ", data --> " + data);
            if (data == "item-uninstalled" || data == "item-disabled") {
              // Uninstall or disable
              this.cleanUp = true;
            } else if (data == "item-cancel-action") {
              // Cancellation ..
              this.cleanUp = false;
            }
          }
          break;

        case 'xul-window-destroyed':
          // Get the index of the closed window
          //var i = this.getWindowCount();
          //log("Window " + i + " --> " + topic);
          
          // Not really necessary since closing the last window will also cause
          // 'quit-application-granted' .. let the code stay here though:
          //   http://forums.mozillazine.org/viewtopic.php?t=308369
          /* if (i == 0 && this.cleanUp) { 
            this.clearUserAgent(); 
            this.unregisterObservers()
          } */
          break;

        case 'nsPref:changed':
          // Check if someone enables the history?
          //   'browser.history_expire_days'
          
          // Do not allow to accept ALL cookies
          if (data == 'network.cookie.cookieBehavior') {
            if (this.prefsHandler.getIntPref('network.cookie.cookieBehavior') == 0) {
              this.prefsHandler.setIntPref('network.cookie.cookieBehavior', 1)
              // Warn the user
              this.showAlert(this.getString('jondofox.dialog.attention'), 
                             this.getString('jondofox.dialog.message.cookies'));
            }
          }

          // Check if the changed preference is on the map
          else if (data in this.stringPrefsMap && !this.userWarned) {
            log("Pref '" + data + "' is on the map!");
            // If the new value is not the recommended ..
            if (this.prefsHandler.getStringPref(data) != 
                   this.prefsHandler.getStringPref(this.stringPrefsMap[data])) {
              // ... warn the user
              this.showAlert(this.getString('jondofox.dialog.attention'), 
                             this.getString('jondofox.dialog.message.prefchange'));
              this.userWarned = true;
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
  
  // Implement nsISupports
  QueryInterface: function(iid) {
    if (!iid.equals(Components.interfaces.nsISupports) &&
        !iid.equals(Components.interfaces.nsIObserver))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
}

///////////////////////////////////////////////////////////////////////////////
// Implementations of nsIModule and nsIFactory
///////////////////////////////////////////////////////////////////////////////

var JDFManagerModule = {
  
  //firstTime: true,

  // BEGIN nsIModule
  registerSelf: function(compMgr, fileSpec, location, type) {
    log("Registering '" + CLASS_NAME + "' ..");
    // XXX: This seems to be not needed
    //if (this.firstTime) {
    //  this.firstTime = false;
    //  throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
    //}
    compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, 
               fileSpec, location, type);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
                    getService(Components.interfaces.nsICategoryManager);
    catMan.addCategoryEntry("app-startup", "JDFManager", CONTRACT_ID, true, 
              true);
  },

  unregisterSelf: function(compMgr, fileSpec, location) {
    log("Unregistering '" + CLASS_NAME + "' ..");
    compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation(CLASS_ID, fileSpec);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
                    getService(Components.interfaces.nsICategoryManager);
    catMan.deleteCategoryEntry("app-startup", CONTRACT_ID, true);
  },

  getClassObject: function(compMgr, cid, iid) {
    if (!cid.equals(CLASS_ID))
      throw Components.results.NS_ERROR_FACTORY_NOT_REGISTERED;
    if (!iid.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this.classFactory;
  },

  canUnload: function(compMgr) { 
    return true; 
  },
  // END nsIModule

  // Implement nsIFactory
  classFactory: {
    createInstance: function(aOuter, aIID) {
      //log("createInstance()");
      if (aOuter != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
      // Set wrappedJSObject
      if (!JDFManager.wrappedJSObject) {
        log("Creating instance, setting wrappedJSObject ..");
        JDFManager.wrappedJSObject = JDFManager;
      }
      return JDFManager.QueryInterface(aIID);
    }
  }
};

///////////////////////////////////////////////////////////////////////////////
// This function is called when the application registers the component
///////////////////////////////////////////////////////////////////////////////

function NSGetModule(comMgr, fileSpec) {
  return JDFManagerModule; 
}
