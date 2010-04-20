/******************************************************************************
 * Copyright (c) 2009, JonDos GmbH
 * Author: Georg Koppen
 *
 * JonDoFox extension utilities
 *****************************************************************************/
 
///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

var mDebug = true;

// Log a message
function log(message) {
  if (mDebug) dump("JonDoFoxUtils :: " + message + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

// XPCOM constants
const CLASS_ID = Components.ID('{790237a4-17ae-4652-98c8-0dd6afde511b}');
const CLASS_NAME = 'JonDoFox-Utils'; 
const CONTRACT_ID = '@jondos.de/jondofox-utils;1';

const CC = Components.classes;
const CI = Components.interfaces;
const CR = Components.results;

///////////////////////////////////////////////////////////////////////////////
// Class definition
///////////////////////////////////////////////////////////////////////////////

// Class constructor
function JonDoFoxUtils() {
  this.bundleService = CC['@mozilla.org/intl/stringbundle;1'].
                          getService(CI.nsIStringBundleService);
  this.stringBundle = this.bundleService.
     createBundle('chrome://jondofox/locale/jondofox.properties');
  this.promptService = CC['@mozilla.org/embedcomp/prompt-service;1'].
                          getService(CI.nsIPromptService);
  this.prefsHandler = CC['@jondos.de/preferences-handler;1'].
                           getService().wrappedJSObject;

  // Set wrappedJSObject
  this.wrappedJSObject = this;
};

// Class definition
JonDoFoxUtils.prototype = {

  bundleService: null,
  stringBundle: null,
  promptService: null,
  prefsHandler: null,
  
///////////////////////////////////////////////////////////////////////////////
// Utility functions
///////////////////////////////////////////////////////////////////////////////

  showAlert: function(title, text) {
    try {
      return this.promptService.alert(null, title, text);
    } catch (e) {
      log("showAlert(): " + e);
    }
  },

  showConfirm: function(title, text) {
    try {
      return this.promptService.confirm(null, title, text);
    } catch (e) {
      log("showConfirm(): " + e);
    }
  },

  // Show an alert with a checkbox using the prompt service
  showAlertCheck: function(title, text, type) {
    var checkboxMessage;
    var check;
    var result;
    try {
      checkboxMessage = this.getString('jondofox.dialog.checkbox.' + type + '.warning');
      check = {value: false};
      result = this.promptService.alertCheck(null, title, text, checkboxMessage, check);
      if(check.value) {
        this.prefsHandler.setBoolPref('extensions.jondofox.' + type + '_warning', false);
      }
      return result;
    } catch (e) {
      log("showAlert(): " + e);
    }
  },
  
  // Show a confirm dialog with a checkbox using the prompt service
  showConfirmCheck: function(title, text, type) {
    var checkboxMessage;
    var check;
    var result;
    try {
      checkboxMessage = this.getString('jondofox.dialog.checkbox.' + type + '.warning');
      check = {value: false};
      result = this.promptService.confirmCheck(null, title, text, checkboxMessage, check);
      if(check.value) {
        this.prefsHandler.setBoolPref('extensions.jondofox.' + type + '_warning', false);
      }
      //log("checked = " + check.value);
      return result;
    } catch (e) {
      log("showConfirm(): " + e);
    }
  },

  // Return a properties string
  getString: function(name) {
    //log("Getting localized string: '" + name + "'");
    try {
      return this.stringBundle.GetStringFromName(name);
    } catch (e) {
      log("getString(): " + e);
    }
  },

  // Return a formatted string
  formatString: function(name, strArray) {
    //log("Getting formatted string: '" + name + "'");
    try {
      return this.stringBundle.formatStringFromName(name, strArray, 
                                  strArray.length);
    } catch (e) {
      log("formatString(): " + e);
    }  
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

var JonDoFoxUtilsInstance = null;

var JonDoFoxUtilsFactory = {
  createInstance: function (aOuter, aIID) {    
    if (aOuter !== null)
      throw CR.NS_ERROR_NO_AGGREGATION;
    if (!aIID.equals(CI.nsISupports))
      throw CR.NS_ERROR_NO_INTERFACE;
    // Singleton
    if (JonDoFoxUtilsInstance === null) {
      log("Creating instance");
      JonDoFoxUtilsInstance = new JonDoFoxUtils();
    }
    return JonDoFoxUtilsInstance;
  }
};

///////////////////////////////////////////////////////////////////////////////
// Module definition (XPCOM registration)
///////////////////////////////////////////////////////////////////////////////

var JonDoFoxUtilsModule = {
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
      return JonDoFoxUtilsFactory;
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
  return JonDoFoxUtilsModule;
}
