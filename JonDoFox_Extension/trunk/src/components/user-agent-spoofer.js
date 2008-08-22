///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

var m_debug = true;

// Log a message
function log(message) {
  if (m_debug) dump("UAgent :: " + message + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Listen for events to delete traces in case of uninstall etc.
///////////////////////////////////////////////////////////////////////////////

// Override constants
const appname = "Netscape";
const appversion = "5.0 (Windows; LANG)";
const buildID = "0";
const oscpu = "Windows NT 5.1";
const platform = "Win32";
const productsub = "20080702";
const useragent = "Mozilla/5.0 (Windows; U; Windows NT 5.1; LANG; rv:1.8.1.16) Gecko/20080702 Firefox/2.0.0.16"; 
const vendor = "";
const vendorSub = "";

// Replace LANG by the content of lang
const reLang = new RegExp("LANG", "gm");
const lang = "en-US";

var uaObserver = {

  //prefsHandler: 
  clearPrefs: false,

  // Return the preferences handler
  getPrefsHandler: function() {
    return Components.classes['@jondos.de/preferences-handler;1'].getService().
              wrappedJSObject;
  },

  // Set several overrides
  setUserAgent: function() {
    log("Setting user agent overrides");
    try {
      // Get the preferences handler
      var prefsHandler = this.getPrefsHandler();
      // Set the preferences
      prefsHandler.setStringPreference("general.appname.override", appname);
      prefsHandler.setStringPreference("general.appversion.override", appversion.replace(reLang, lang));
      prefsHandler.setStringPreference("general.buildID.override", buildID);
      prefsHandler.setStringPreference("general.oscpu.override", oscpu);   
      prefsHandler.setStringPreference("general.platform.override", platform); 
      prefsHandler.setStringPreference("general.productsub.override", productsub);
      prefsHandler.setStringPreference("general.useragent.override", useragent.replace(reLang, lang));
      prefsHandler.setStringPreference("general.useragent.vendor", vendor);
      prefsHandler.setStringPreference("general.useragent.vendorSub", vendorSub);
    } catch (ex) {
      log("setUserAgent: " + ex);
    }
  },

  // Clear all preferences that were set by us
  clearUserAgent: function() {
    log("Clearing user agent overrides");
    try {
      // Get the preferences handler
      var prefsHandler = this.getPrefsHandler();
      // Delete preferences if set
      prefsHandler.deletePreference("general.appname.override");
      prefsHandler.deletePreference("general.appversion.override");
      prefsHandler.deletePreference("general.buildID.override");
      prefsHandler.deletePreference("general.oscpu.override");
      prefsHandler.deletePreference("general.platform.override");
      prefsHandler.deletePreference("general.productsub.override");
      prefsHandler.deletePreference("general.useragent.override");
      prefsHandler.deletePreference("general.useragent.vendor");
      prefsHandler.deletePreference("general.useragent.vendorSub");
    } catch (ex) {
      log("clearUserAgent: " + ex);
    }
  },
 
  // This is called once on application startup
  registerObservers: function() {
    log("Registering observers");
    try {
      var observers = Components.classes["@mozilla.org/observer-service;1"].
                        getService(Components.interfaces.nsIObserverService);
                 
      observers.addObserver(this, "final-ui-startup", false);
      observers.addObserver(this, "em-action-requested", false);
      observers.addObserver(this, "quit-application-granted", false);
      observers.addObserver(this, "xul-window-destroyed", false);
    } catch (ex) {
      log("registerObservers: " + ex);
    }
  },

  // Called once on shutdown
  unregisterObservers: function() {
    log("Unregistering observers");
    try {
      var observers = Components.classes["@mozilla.org/observer-service;1"].
                         getService(Components.interfaces.nsIObserverService);
      
      observers.removeObserver(this, "final-ui-startup");
      observers.removeObserver(this, "em-action-requested");
      observers.removeObserver(this, "quit-application-granted");    
      observers.removeObserver(this, "xul-window-destroyed");
    } catch (ex) {
      log("unregisterObservers: " + ex);
    }
  },

  // XXX: Actually not needed
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

  // Implement nsIObserver
  observe: function(subject, topic, data) {
    try {
      switch (topic) {
        
        case 'app-startup':
          log("Got topic --> " + topic);
          // Register observers
          this.registerObservers();
          break;
        
        case 'final-ui-startup':
          log("Got topic --> " + topic);
          // Set the user agent here
          this.setUserAgent();          
          break;

        case 'em-action-requested':
          // Filter on the item ID here
          subject.QueryInterface(Components.interfaces.nsIUpdateItem);
          if (subject.id == "{437be45a-4114-11dd-b9ab-71d256d89593}") {
            log("Got topic --> " + topic + ", data --> " + data);
            if (data == "item-uninstalled" || data == "item-disabled") {
              // Uninstall or disable
              this.clearPrefs = true;
            } else if (data == "item-cancel-action") {
              // Cancellation ..
              this.clearPrefs = false;
            }
          }
          break;

        case 'quit-application-granted':
          log("Got topic --> " + topic);
          // Clear preferences on shutdown after uninstall
          if (this.clearPrefs) { this.clearUserAgent(); }
          // Unregister observers
          this.unregisterObservers();
          break;

        case 'xul-window-destroyed':
          // Get the closed window's index
          var i = this.getWindowCount();
          log("Window " + i + " --> " + topic);
          // Last browser window standing:
          // http://forums.mozillazine.org/viewtopic.php?t=308369
          if (i == 0 && this.clearPrefs) { 
            this.clearUserAgent(); 
            // XXX: Also unregister observers?
          }
          break;

        default:
          log("Unknown topic! --> " + topic);
          break;
      }
    } catch (ex) {
      log("observe: " + ex);
    }
  },

  // Implement nsISupports
  QueryInterface: function(iid) {
    if (!iid.equals(Components.interfaces.nsISupports) &&
        !iid.equals(Components.interfaces.nsIObserver) &&
        !iid.equals(Components.interfaces.nsISupportsWeakReference))
                        throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
}

///////////////////////////////////////////////////////////////////////////////
// The actual component
///////////////////////////////////////////////////////////////////////////////

var uaSpoof = {
  
  CLASS_ID: Components.ID("{67d79e27-f32d-4e7f-97d7-68de76795611}"),
  CONTRACT_ID: "@jondos.de/user-agent-spoofer;1",
  CLASS_NAME: "User Agent Spoofer",

  firstTime: true,

  // Implement nsIModule
  registerSelf: function(compMgr, fileSpec, location, type) {
    log("Registering component: " + this.CLASS_NAME);
    if (this.firstTime) {
      this.firstTime = false;
      throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
    }
    compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(this.CLASS_ID, this.CLASS_NAME, 
       this.CONTRACT_ID, fileSpec, location, type);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
                    getService(Components.interfaces.nsICategoryManager);
    catMan.addCategoryEntry("app-startup", "UAgentSpoof", this.CONTRACT_ID, 
       true, true);
  },

  unregisterSelf: function(compMgr, fileSpec, location) {
    log("Unregistering component: " + this.CLASS_NAME);
    // Remove the auto-startup
    compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation(this.CLASS_ID, fileSpec);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
                    getService(Components.interfaces.nsICategoryManager);
    catMan.deleteCategoryEntry("app-startup", this.CONTRACT_ID, true);
  },

  getClassObject: function(compMgr, cid, iid) {
    if (!cid.equals(this.CLASS_ID))
      throw Components.results.NS_ERROR_FACTORY_NOT_REGISTERED;
    if (!iid.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this.classFactory;
  },

  canUnload: function(compMgr) { 
    return true; 
  },
  // end Implement nsIModule

  // Implement nsIFactory
  classFactory: {
    createInstance: function(outer, iid) {
      log("Creating instance");
      if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;

      return uaObserver.QueryInterface(iid);
    }
  }
};

///////////////////////////////////////////////////////////////////////////////
// This function is called when the application registers the component
///////////////////////////////////////////////////////////////////////////////

function NSGetModule(comMgr, fileSpec) {
  return uaSpoof; 
}
