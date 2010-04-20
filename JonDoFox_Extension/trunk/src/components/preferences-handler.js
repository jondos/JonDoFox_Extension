/******************************************************************************
 * Copyright (c) 2008, JonDos GmbH
 * Author: Johannes Renner
 *
 * This is a general purpose XPCOM component that transparently encapsulates 
 * handling of user preferences in Firefox using the nsIPrefService.
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
const CLASS_NAME = 'Preferences-Handler'; 
const CONTRACT_ID = '@jondos.de/preferences-handler;1';

const CC = Components.classes;
const CI = Components.interfaces;
const CR = Components.results;

///////////////////////////////////////////////////////////////////////////////
// Class definition
///////////////////////////////////////////////////////////////////////////////

// Class constructor
function PreferencesHandler() {
  // Set the main pref branch
  this.prefs = this.getPrefsBranch("");  
  // Set the wrappedJSObject 
  this.wrappedJSObject = this;
};

// Class definition
PreferencesHandler.prototype = {
  
  // The main preferences branch
  prefs: null,

  // Return a specific preferences branch
  getPrefsBranch: function(branch) {
    log("Getting prefs branch " + branch);
    try {
      return CC["@mozilla.org/preferences-service;1"].
                getService(CI.nsIPrefService).getBranch(branch);
    } catch (e) {
      log("getPrefsBranch(): " + e);
    }
  },

  // Delete a prefs branch
  deleteBranch: function(branch) {
    log("Deleting branch '" + branch + "'");
    try {
      this.getPrefsBranch(branch).deleteBranch("");
    } catch (e) {
      log("deleteBranch(): " + e);
    }
  },

  // Check whether preference has been changed from the default value
  // When no default value exists, indicate whether preference exists
  isPreferenceSet: function(preference) {
    log("Pref set? '" + preference + "'");
    if(preference) {
      return this.prefs.prefHasUserValue(preference);
    }
    return false;
  },

  // Delete a given preference respectively reset to default
  deletePreference: function(preference) {    
    if (preference) {
      try {
        // If a user preference is set
        if (this.isPreferenceSet(preference)) {
          log("Resetting '" + preference + "'");
          this.prefs.clearUserPref(preference);
        }
      } catch (e) {
        log("deletePreference(): " + e);
      }
    }
  },
  
  // Set a string preference
  setStringPref: function(preference, value) {
    log("Setting '" + preference + "' --> '" + value + "'");
    if(preference) {   
      var supportsStringInterface = CI.nsISupportsString;
      var string = CC["@mozilla.org/supports-string;1"].
                      createInstance(supportsStringInterface);
      string.data = value;
      // Set value
      this.prefs.setComplexValue(preference, supportsStringInterface, 
                       string);
    }
  },

  // Return the current value of a string preference
  getStringPref: function(preference) {
    // If preference is not null
    if (preference) {
      try {
        log("Getting '" + preference + "'");
        return this.prefs.getComplexValue(preference, 
                             CI.nsISupportsString).data;
      } catch(e) {
        log("getStringPref(): " + e);
      }
      //}
    }
    return null;
  },

  // Set an integer preference
  setIntPref: function(preference, value) {
    log("Setting '" + preference + "' --> " + value);
    try {
      this.prefs.setIntPref(preference, value);
    } catch (e) {
      log("setIntPref(): " + e);
    }
  },

  // Get an integer preference, return 0 if preference is not set
  getIntPref: function(preference) {
    // If preference is not null
    if(preference) {
      try {
        log("Getting '" + preference + "'");
        return this.prefs.getIntPref(preference);
      } catch(exception) {
        log("getIntPref(): " + exception);
      }
    }
    return 0;
  },

  // Set a boolean preference
  setBoolPref: function(preference, value) {
    log("Setting '" + preference + "' --> " + value);
    try {
      this.prefs.setBoolPref(preference, value);
    } catch (e) {
      log("setBoolPref(): " + e);
    }
  },

  // Get a boolean preference, return 0 if preference is not set
  getBoolPref: function(preference) {
    // If preference is not null
    if(preference) {
      try {
        return this.prefs.getBoolPref(preference);
      } catch(exception) {
        log("getBoolPref(): " + exception);
      }
    }
    return false;
  },

  // Implement nsISupports
  QueryInterface: function(aIID) {
    if (!aIID.equals(CI.nsISupports))
      throw CR.NS_ERROR_NO_INTERFACE;
    return this;
  }
};

///////////////////////////////////////////////////////////////////////////////
// Class factory
///////////////////////////////////////////////////////////////////////////////

var PreferencesHandlerInstance = null;

var PreferencesHandlerFactory = {
  createInstance: function (aOuter, aIID) {    
    if (aOuter !== null)
      throw CR.NS_ERROR_NO_AGGREGATION;
    if (!aIID.equals(CI.nsISupports))
      throw CR.NS_ERROR_NO_INTERFACE;
    // Singleton
    if (PreferencesHandlerInstance === null) {
      log("Creating instance");
      PreferencesHandlerInstance = new PreferencesHandler();
    }
    return PreferencesHandlerInstance;
  }
};

///////////////////////////////////////////////////////////////////////////////
// Module definition (XPCOM registration)
///////////////////////////////////////////////////////////////////////////////

var PreferencesHandlerModule = {
  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType) {
    log("Registering '" + CLASS_NAME + "' ..");
    aCompMgr = aCompMgr.QueryInterface(CI.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, 
                aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType) {
    log("Unregistering '" + CLASS_NAME + "' ..");
    aCompMgr = aCompMgr.QueryInterface(CI.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        
  },
  
  getClassObject: function(aCompMgr, aCID, aIID) {
    if (!aIID.equals(CI.nsIFactory))
      throw CR.NS_ERROR_NOT_IMPLEMENTED;
    if (aCID.equals(CLASS_ID))
      return PreferencesHandlerFactory;
    throw CR.NS_ERROR_NO_INTERFACE;
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
