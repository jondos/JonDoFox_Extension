/******************************************************************************
 * Copyright (c) 2008, JonDos GmbH
 * Author: Johannes Renner
 *
 * Map pairs of preferences that are given as arrays
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

var mDebug = true;

// Log a message
function log(message) {
  if (mDebug) dump("PrefsMapper :: " + message + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CLASS_ID = Components.ID('{67d79e27-f32d-4e7f-97d7-68de76795611}');
const CLASS_NAME = 'Preferences-Mapper'; 
const CONTRACT_ID = '@jondos.de/preferences-mapper;1';

const nsISupports = Components.interfaces.nsISupports;

///////////////////////////////////////////////////////////////////////////////
// Class definition
///////////////////////////////////////////////////////////////////////////////

// Class constructor
function PrefsMapper() {
  // Init the prefs handler
  this.prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
                                    getService().wrappedJSObject; 
  // Init the JSObject
  this.wrappedJSObject = this;
};

// Class definition
PrefsMapper.prototype = {
 
  // Reference to the prefs handler object
  prefsHandler: null,

  // Arrays containing preferences mappings for each data type
  stringPrefs: null,  
  //intPrefs: null,
  //boolPrefs: null,
 
  // Set string pref mappings
  setStringPrefs: function(stringPrefsMap) {
    log("Set string preferences map");
    try {
      this.stringPrefsMap = stringPrefsMap;
    } catch (e) {
      log("setStringPrefs(): "+ e);
    }
  },

  // Return string pref mappings
  getStringPrefs: function() {
    return this.stringPrefsMap;
  },

  // Perform the mapping
  map: function() {
    log("Mapping " + this.stringPrefsMap.length + " preferences");
    try {
      // Iterate through the map
      for (p in this.stringPrefsMap) {
        this.prefsHandler.setStringPref(p,
                this.prefsHandler.getStringPref(this.stringPrefsMap[p]));
      }
    } catch (e) {
      log("map(): " + e);
    }
  },

  // Reset all prefs
  unmap: function() {
    log("Unmapping preferences");
    try {
      // Reset all prefs
      for (p in this.stringPrefsMap) {
        this.prefsHandler.deletePreference(p);
      }
    } catch (e) {
      log("unmap(): " + e);
    }
  },

  // Implement nsISupports
  QueryInterface: function(aIID) {
    if (!aIID.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
};

///////////////////////////////////////////////////////////////////////////////
// Class factory
///////////////////////////////////////////////////////////////////////////////

var PrefsMapperInstance = null;

var PrefsMapperFactory = {
  createInstance: function (aOuter, aIID) {    
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    if (!aIID.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    // NOT a singleton class here
    log("Creating instance");
    return new PrefsMapper();
  }
};

///////////////////////////////////////////////////////////////////////////////
// Module definition (XPCOM registration)
///////////////////////////////////////////////////////////////////////////////

var PrefsMapperModule = {
  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType) {
    log("Registering '" + CLASS_NAME + "' ..");
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.
                           nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, 
                aFileSpec, aLocation, aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType) {
    log("Unregistering '" + CLASS_NAME + "' ..");
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.
                           nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        
  },
  
  getClassObject: function(aCompMgr, aCID, aIID) {
    if (!aIID.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    if (aCID.equals(CLASS_ID))
      return PrefsMapperFactory;
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
  return PrefsMapperModule;
}
