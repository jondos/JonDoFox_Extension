/******************************************************************************
 * Copyright (c) 2008, JonDos GmbH
 * Author: Johannes Renner
 *
 * TODO: Document this!
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
  this.wrappedJSObject = this;
};

// Class definition
PrefsMapper.prototype = {
 
  // Reference to the prefs handler object
  prefsHandler: null,

  // Return the preferences handler
  ph: function() {
    // Get the wrappedJSObject if it is not already set
    if (!this.prefsHandler) {
      this.prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
                                    getService().wrappedJSObject;
    }
    return this.prefsHandler;
  },

  // Arrays containing preferences mappings for each data type
  stringPrefs: null,
  
  //intPrefs: null,
  //boolPrefs: null,
 
  // Set string pref mappings
  setStringPrefs: function(stringPrefsMap) {
    log("Set the string preferences map");
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
    log("Mapping preferences");
    try {
      // Iterate through the map
      for (p in this.stringPrefsMap) {
        this.ph().setStringPref(p, 
                     this.ph().getStringPref(this.stringPrefsMap[p]));
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
        this.ph().deletePreference(p);
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
