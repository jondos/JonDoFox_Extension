/******************************************************************************
 * Copyright (c) 2008-2012, JonDos GmbH
 * Author: Johannes Renner, Georg Koppen
 *
 * This is a general purpose XPCOM component that transparently encapsulates
 * handling of user preferences in Firefox using the nsIPrefService.
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

// Log method
var log = function(message) {
  if (m_debug) dump("PrefsHandler :: " + message + "\n");
};

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

///////////////////////////////////////////////////////////////////////////////
// Class definition
///////////////////////////////////////////////////////////////////////////////

// Class constructor
var PreferencesHandler = function() {
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
      log("Getting '" + preference);
      try {
        return this.prefs.getBoolPref(preference);
      } catch(exception) {
        log("getBoolPref(): " + exception);
      }
    }
    return false;
  },

  classDescription: "Preferences-Handler",
  classID:          Components.ID("{0fa6df5b-815d-413b-ad76-edd44ab30b74}"),
  contractID:       "@jondos.de/preferences-handler;1",

  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports])
};

// XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
// XPCOMUtils.generateNSGetModule is for Mozilla 1.9.1/1.9.2 (FF 3.5/3.6).

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([PreferencesHandler]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([PreferencesHandler]);
