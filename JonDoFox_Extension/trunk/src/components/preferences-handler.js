/******************************************************************************
 * This is a general purpose XPCOM component that can be accessed from within
 * any other component. It transparently encapsulates handling of user prefs in
 * Firefox using the nsIPrefService.
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

mDebug = true;

// Log method
function log(message) {
  if (mDebug) dump("PrefsHandler :: " + message + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CLASS_ID = Components.ID('{0fa6df5b-815d-413b-ad76-edd44ab30b74}');
const CLASS_NAME = 'Preferences Handler'; 
const CONTRACT_ID = '@jondos.de/preferences-handler;1';

const nsISupports = Components.interfaces.nsISupports;

///////////////////////////////////////////////////////////////////////////////
// Class definition
///////////////////////////////////////////////////////////////////////////////

// Class constructor
function PreferencesHandler() {
  this.wrappedJSObject = this;
};

// Class definition
PreferencesHandler.prototype = {
  
  // The internal preferences service
  _mainBranch: null,
  
  // Return the main preferences branch
  getPrefs: function() {
    if (!this._preferencesService) {
      this._mainBranch = Components.
              classes["@mozilla.org/preferences-service;1"].
              getService(Components.interfaces.nsIPrefService).getBranch("");
    }
    return this._mainBranch;
  },
 
  // Return a certain preferences branch
  // XXX: Not yet tested
  getPrefsBranch: function(branch) {
    log("Getting prefs branch " + branch);
    try {
      return Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefService).
                getBranch(branch);
    } catch (e) {
      log("getPrefsBranch(): " + e);
    }
  },

  // Check whether preference has been changed from the default value
  // When no default value exists, indicate whether preference exists
  isPreferenceSet: function(preference) {
    log("Pref set? '" + preference + "'");
    if(preference) {
      return this.getPrefs().prefHasUserValue(preference);
    }
    return false;
  },

  // Delete a given preference respectively reset to default
  deletePreference: function(preference) {    
    if (preference) {
      // If a user preference is set
      if (this.isPreferenceSet(preference)) {
        log("Resetting '" + preference + "'");
        this.getPrefs().clearUserPref(preference);
      }
    }
  },
  
  // Set a string preference
  setStringPreference: function(preference, value) {
    log("Setting '" + preference + "' --> '" + value + "'");
    if(preference) {   
      var supportsStringInterface = Components.interfaces.nsISupportsString;
      var string = Components.classes["@mozilla.org/supports-string;1"].
                      createInstance(supportsStringInterface);
      string.data = value;
      // Set value
      this.getPrefs().setComplexValue(preference, supportsStringInterface, 
                       string);
    }
  },

  // Return the current value of a string preference
  getStringPreference: function(preference) {
    // If preference is not null
    if (preference) {
      // TODO: Look at this
      // If not a user preference or a user preference is set
      //if (this.isPreferenceSet(preference)) {
      try {
        log("Getting '" + preference + "'");
        return this.getPrefs().getComplexValue(preference, 
                       Components.interfaces.nsISupportsString).data;
      } catch(e) {
        log("getStringPreference(): " + e);
      }
      //}
    }
    return null;
  },

  // Set an integer preference
  setIntegerPreference: function(preference, value) {
    log("Setting '" + preference + "' --> '" + value + "'");
    try {
      this.getPrefs().setIntPref(preference, value);
    } catch (e) {
      log("setIntegerPreference(): " + e);
    }
  },

  // Get an integer preference, return 0 if preference is not set
  getIntegerPreference: function(preference) {
    // If preference is not null
    if(preference) {
      // If not a user preference or a user preference is set
      //if(this.isPreferenceSet(preference)) {
      try {
        return this.getPrefs().getIntPref(preference);
      } catch(exception) {
        log("getIntegerPreference(): " + exception);
      }
    }
    return 0;
  },

  QueryInterface: function(aIID) {
    if (!aIID.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
};

///////////////////////////////////////////////////////////////////////////////
// Class factory
///////////////////////////////////////////////////////////////////////////////

var PreferencesHandlerInstance = null;

var PreferencesHandlerFactory = {
  createInstance: function (aOuter, aIID) {    
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    if (!aIID.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    // Singleton
    if (PreferencesHandlerInstance == null)
      log("Creating instance");
      PreferencesHandlerInstance = new PreferencesHandler();
    return PreferencesHandlerInstance;
  }
};

///////////////////////////////////////////////////////////////////////////////
// Module definition (XPCOM registration)
///////////////////////////////////////////////////////////////////////////////

var PreferencesHandlerModule = {
  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType) {
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.
                           nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, 
                aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType) {
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.
                           nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        
  },
  
  getClassObject: function(aCompMgr, aCID, aIID) {
    if (!aIID.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    if (aCID.equals(CLASS_ID))
      return PreferencesHandlerFactory;
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { 
    return true; 
  }
};

///////////////////////////////////////////////////////////////////////////////
// This function is called when the application registers the component
///////////////////////////////////////////////////////////////////////////////

function NSGetModule(compMgr, fileSpec) {
  return PreferencesHandlerModule;
}
