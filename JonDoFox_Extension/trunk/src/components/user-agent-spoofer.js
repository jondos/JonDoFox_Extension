/******************************************************************************
 * This component is instanciated once on application startup to do the 
 * following:
 *
 * - Set configuration options regarding the browser's user agent string, as 
 *   well as locale and language configuration
 * - Listen for uninstallation of the extension to reset these options
 *****************************************************************************/
 
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

var uaObserver = {
  
  // Clear preferences on application shutdown, e.g. uninstall?
  clearPrefs: false,

  // Set to true if the user was warned that an important pref was modified
  userWarned: false,

  // TODO: Set this from the outside somehow
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

  // Return the preferences handler
  getPrefsHandler: function() {
    return Components.classes['@jondos.de/preferences-handler;1'].getService().
              wrappedJSObject;
  },

  // Set several string preferences: user agent overrides, etc.
  setStringPrefs: function() {
    try {
      // Set all string preferences
      var ph = this.getPrefsHandler();
      for (p in this.stringPrefsMap) {
        ph.setStringPreference(p, 
              ph.getStringPreference(this.stringPrefsMap[p]));
      }      
      // Add an observer to the main pref branch after setting the prefs
      var prefs = ph.getPrefs();
      prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
      prefs.addObserver("", this, false);
      log("Observing preferences ..");
    } catch (e) {
      log("setStringPrefs: " + e);
    }
  },

  // Reset string preferences
  clearStringPrefs: function() {
    try {
      // Get the preferences handler first
      var ph = this.getPrefsHandler();
      // Remove the preferences observer      
      log("Stop observing preferences ..");
      var prefs = ph.getPrefs();
      prefs.removeObserver("", this);
      // Reset all prefs
      for (p in this.stringPrefsMap) {
        ph.deletePreference(p);
      }
    } catch (e) {
      log("clearStringPrefs: " + e);
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
      log("registerObservers: " + ex);
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
          if (this.clearPrefs) { this.clearStringPrefs(); }
          // Unregister observers
          this.unregisterObservers();
          break;
        
        case 'final-ui-startup':
          log("Got topic --> " + topic);
          // Set the user agent here
          this.setStringPrefs();
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
          // XXX: Not really necessary since closing the last window will also
          // cause 'quit-application-granted' .. let the code stay here though
          // Last browser window standing: 
          //   http://forums.mozillazine.org/viewtopic.php?t=308369
          /*if (i == 0 && this.clearPrefs) { 
            this.clearUserAgent(); 
            this.unregisterObservers()
          }*/
          break;

        case 'nsPref:changed':
          // Check if the changed pref is one of 'ours'
          if (!this.userWarned && data in this.stringPrefsMap) {
            //log("Pref '" + data + "' is on the map!");
            // Get the prefs handler
            var ph = this.getPrefsHandler();            
            //log("Comparing " + ph.getStringPreference(data) + 
            //   " to " + ph.getStringPreference(this.stringPrefsMap[data]));
            // If the new value is not the recommended ..
            if (ph.getStringPreference(data) != 
                   ph.getStringPreference(this.stringPrefsMap[data])) {
              // ... warn the user
              var ps = Components.
                          classes["@mozilla.org/embedcomp/prompt-service;1"].
                          getService(Components.interfaces.nsIPromptService);
              ps.alert(null, "Attention", "A browser preference that is " +
                    "important for your anonymity has just changed! You are " +
                    "not safe anymore until you restart your browser!!");
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
