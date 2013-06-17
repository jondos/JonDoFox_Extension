/******************************************************************************
 * Copyright (c) 2008-2012, JonDos GmbH
 * Author: Johannes Renner, Georg Koppen
 *
 * Map pairs of preferences that are given as arrays
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CC = Components.classes;
const CI = Components.interfaces;

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

var m_debug = CC["@mozilla.org/preferences-service;1"].
  getService(CI.nsIPrefService).getBranch("extensions.jondofox.").
  getBoolPref("debug.enabled");

// Log a message
var log = function(message) {
  if (m_debug) dump("PrefsMapper :: " + message + "\n");
};

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

///////////////////////////////////////////////////////////////////////////////
// Class definition
///////////////////////////////////////////////////////////////////////////////

// Class constructor
var PrefsMapper = function() {
  // Init the prefs handler
  this.prefsHandler = CC['@jondos.de/preferences-handler;1'].getService().
    wrappedJSObject;
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
      log("setStringPrefs(): " + e);
    }
  },

  // Return string pref mappings
  getStringPrefs: function() {
    return this.stringPrefsMap;
  },

  // Set boolean pref mappings
  setBoolPrefs: function(boolPrefsMap) {
    log("Set boolean preferences map");
    try {
      this.boolPrefsMap = boolPrefsMap;
    } catch (e) {
      log("setBoolPrefs(): " + e);
    }
  },

  // Return boolean pref mappings
  getBoolPrefs: function() {
    return this.boolPrefsMap;
  },

  // Set integer pref mappings
  setIntPrefs: function(intPrefsMap) {
    log("Set integer preferences map");
    try {
      this.intPrefsMap = intPrefsMap;
    } catch (e) {
      log("setIntPrefs(): " + e);
    }
  },

  // Return integer pref mappings
  getIntPrefs: function() {
    return this.intPrefsMap;
  },

  // Perform the mapping
  map: function() {
    var p;
    log("Mapping security preferences");
    try {
      // Iterate through the maps
      for (p in this.stringPrefsMap) {
        this.prefsHandler.setStringPref(p,
                this.prefsHandler.getStringPref(this.stringPrefsMap[p]));
      }
      for (p in this.boolPrefsMap) {
	this.prefsHandler.setBoolPref(p,
	        this.prefsHandler.getBoolPref(this.boolPrefsMap[p]));
      }
      for (p in this.intPrefsMap) {
	this.prefsHandler.setIntPref(p,
		this.prefsHandler.getIntPref(this.intPrefsMap[p]));
      }
    } catch (e) {
      log("map(): " + e);
    }
  },

  // Reset all prefs
  unmap: function() {
    var p;
    log("Unmapping preferences");
    try {
      // Reset all prefs
      for (p in this.stringPrefsMap) {
        this.prefsHandler.deletePreference(p);
      }
      for (p in this.boolPrefsMap) {
        this.prefsHandler.deletePreference(p);
      }
      for (p in this.intPrefsMap) {
	this.prefsHandler.deletePreference(p);
      }
    } catch (e) {
      log("unmap(): " + e);
    }
  },

  classDescription: "Preferences-Mapper",
  classID:          Components.ID("{67d79e27-f32d-4e7f-97d7-68de76795611}"),
  contractID:       '@jondos.de/preferences-mapper;1',

  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports])
};

// XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
// XPCOMUtils.generateNSGetModule is for Mozilla 1.9.1/1.9.2 (FF 3.5/3.6).

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([PrefsMapper]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([PrefsMapper]);
