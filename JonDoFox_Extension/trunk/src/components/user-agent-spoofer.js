///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

var m_debug = true;

// Log a message
function log(message) {
  if (m_debug) dump("UAgent :: " + message + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CLASS_ID = Components.ID('{67d79e27-f32d-4e7f-97d7-68de76795611}');
const CLASS_NAME = 'User Agent Spoofer'; 
const CONTRACT_ID = '@jondos.de/user-agent-spoofer;1';

///////////////////////////////////////////////////////////////////////////////
// Listen for events to delete traces in case of uninstall etc.
///////////////////////////////////////////////////////////////////////////////

// TODO: Replace LANG in useragent + appversion by the content of lang
// Example: appversion.replace(reLang, lang)
//const reLang = new RegExp("LANG", "gm");
//const lang = "en";

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
      var ph = this.getPrefsHandler();
      // Set the preferences
      ph.setStringPreference("general.appname.override", ph.getStringPreference("extensions.jondofox.appname_override"));
      ph.setStringPreference("general.appversion.override", ph.getStringPreference("extensions.jondofox.appversion_override"));
      ph.setStringPreference("general.buildID.override", ph.getStringPreference("extensions.jondofox.buildID_override"));
      ph.setStringPreference("general.oscpu.override", ph.getStringPreference("extensions.jondofox.oscpu_override"));   
      ph.setStringPreference("general.platform.override", ph.getStringPreference("extensions.jondofox.platform_override")); 
      ph.setStringPreference("general.productsub.override", ph.getStringPreference("extensions.jondofox.productsub_override"));
      ph.setStringPreference("general.useragent.override", ph.getStringPreference("extensions.jondofox.useragent_override"));
      // Vendor
      ph.setStringPreference("general.useragent.vendor", ph.getStringPreference("extensions.jondofox.useragent_vendor"));
      ph.setStringPreference("general.useragent.vendorSub", ph.getStringPreference("extensions.jondofox.useragent_vendorSub"));      
      // Spoof locales as well
      ph.setStringPreference("intl.accept_languages", ph.getStringPreference("extensions.jondofox.accept_languages"));
      ph.setStringPreference("intl.charset.default", ph.getStringPreference("extensions.jondofox.default_charset"));
      ph.setStringPreference("intl.accept_charsets", ph.getStringPreference("extensions.jondofox.accept_charsets"));
      ph.setStringPreference("network.http.accept.default", ph.getStringPreference("extensions.jondofox.accept_default"));
    } catch (ex) {
      log("setUserAgent: " + ex);
    }
  },

  // Clear all preferences that were set by us
  // TODO: Rather restore previous values
  clearUserAgent: function() {
    log("Clearing user agent overrides");
    try {
      // Get the preferences handler
      var ph = this.getPrefsHandler();
      // Delete preferences if set
      ph.deletePreference("general.appname.override");
      ph.deletePreference("general.appversion.override");
      ph.deletePreference("general.buildID.override");
      ph.deletePreference("general.oscpu.override");
      ph.deletePreference("general.platform.override");
      ph.deletePreference("general.productsub.override");
      ph.deletePreference("general.useragent.override");
      ph.deletePreference("general.useragent.vendor");
      ph.deletePreference("general.useragent.vendorSub");
    } catch (ex) {
      log("clearUserAgent: " + ex);
    }
  },
 
  // This is called once on application startup
  registerObservers: function() {
    log("Register observers");
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
    log("Unregister observers");
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

  // Implement nsIObserver
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
          if (this.clearPrefs) { this.clearUserAgent(); }
          // Unregister observers
          this.unregisterObservers();
          break;
        
        case 'final-ui-startup':
          log("Got topic --> " + topic);
          // Set the user agent here
          this.setUserAgent();          
          break;

        case 'em-action-requested':
          // Filter on the item ID here to detect deinstallation etc.
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

        case 'xul-window-destroyed':
          // Get the index of the closed window
          var i = this.getWindowCount();
          log("Window " + i + " --> " + topic);
          // XXX Currently do nothing .. let the code stay here though
          // Last browser window standing:
          // http://forums.mozillazine.org/viewtopic.php?t=308369
          //if (i == 0 && this.clearPrefs) { 
            //this.clearUserAgent(); 
            // XXX: Also unregister observers?
          //}
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
        !iid.equals(Components.interfaces.nsIObserver) &&
        !iid.equals(Components.interfaces.nsISupportsWeakReference))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
}

///////////////////////////////////////////////////////////////////////////////
// The actual component
///////////////////////////////////////////////////////////////////////////////

var UserAgentModule = {

  firstTime: true,

  // BEGIN nsIModule
  registerSelf: function(compMgr, fileSpec, location, type) {
    log("Registering '" + CLASS_NAME + "' ..");
    if (this.firstTime) {
      this.firstTime = false;
      throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
    }
    compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, 
               fileSpec, location, type);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
                    getService(Components.interfaces.nsICategoryManager);
    catMan.addCategoryEntry("app-startup", "UAgentSpoof", CONTRACT_ID, true, 
              true);
  },

  unregisterSelf: function(compMgr, fileSpec, location) {
    log("Unregistering '" + CLASS_NAME + "' ..");
    // Remove the auto-startup
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
  return UserAgentModule; 
}
