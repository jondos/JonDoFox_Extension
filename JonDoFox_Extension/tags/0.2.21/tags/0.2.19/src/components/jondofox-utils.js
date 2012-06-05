/******************************************************************************
 * Copyright (c) 2010-2012, JonDos GmbH
 * Author: Georg Koppen
 *
 * JonDoFox extension utilities
 *****************************************************************************/
 
///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

var mDebug = true;

// Log a message
var log = function(message) {
  if (mDebug) dump("JonDoFoxUtils :: " + message + "\n");
};

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CC = Components.classes;
const CI = Components.interfaces;

///////////////////////////////////////////////////////////////////////////////
// Class definition
///////////////////////////////////////////////////////////////////////////////

// Class constructor
var JonDoFoxUtils = function() {
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
  
  // Show a confirm dialog with a checkbox and custom buttons 
  // using the prompt service.
  showConfirmEx: function(title, text, type, bIsStartup) {
    var checkboxMessage;
    var check;
    var result;
    var flags;
    try {
      checkboxMessage = this.getString('jondofox.dialog.checkbox.' + type + 
        '.warning');
      check = {value: false};
      if (bIsStartup) {
        flags = this.promptService.STD_YES_NO_BUTTONS;
        text = text + "\r\n" + this.
          getString('jondofox.dialog.message.enableJonDo');
      } else {
        flags = this.promptService.STD_OK_CANCEL_BUTTONS + 
          this.promptService.BUTTON_POS_1_DEFAULT;
      }
      result = this.promptService.confirmEx(null, title, text, flags, "", "", 
        "", checkboxMessage, check);
      if(check.value) {
        this.prefsHandler.setBoolPref('extensions.jondofox.' + type + 
          '_warning', false);
      }
      return result;
    } catch (e) {
      log("showConfirmEx(): " + e);
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

  classDescription: "JonDoFox-Utils",
  classID: Components.ID("{790237a4-17ae-4652-98c8-0dd6afde511b}"),
  contractID: "@jondos.de/jondofox-utils;1",

  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports]) 
};

// XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
// XPCOMUtils.generateNSGetModule is for Mozilla 1.9.1/1.9.2 (FF 3.5/3.6).

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([JonDoFoxUtils]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([JonDoFoxUtils]);
