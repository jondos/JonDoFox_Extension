/******************************************************************************
 * Copyright (c) 2010-2012, JonDos GmbH
 * Author: Georg Koppen
 *
 * JonDoFox extension utilities
 *****************************************************************************/
 
"use strict";

let EXPORTED_SYMBOLS = ["jdfUtils"];

const Cc = Components.classes;
const Ci = Components.interfaces;

let jdfUtils = {

  bundleService : null,
  stringBundle : null,
  promptService : null,
  prefsHandler : null,

  debug : false,

  init : function() {
    this.debug = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefService).getBranch("extensions.jondofox.").
      getBoolPref("debug.enabled");
    this.bundleService = Cc["@mozilla.org/intl/stringbundle;1"].
      getService(Ci.nsIStringBundleService);
    this.stringBundle = this.bundleService.
      createBundle("chrome://jondofox/locale/jondofox.properties");
    this.promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"].
      getService(Ci.nsIPromptService);
    this.prefsHandler = Cc["@jondos.de/preferences-handler;1"].
      getService().wrappedJSObject;
  },

  log : function(message) {
    if (this.debug) {
      dump("JonDoFoxUtils :: " + message + "\n");
    }
  },

  showAlert : function(title, text) {
    try {
      return this.promptService.alert(null, title, text);
    } catch (e) {
      this.log("showAlert(): " + e);
    }
  },

  showConfirm : function(title, text) {
    try {
      return this.promptService.confirm(null, title, text);
    } catch (e) {
      this.log("showConfirm(): " + e);
    }
  },

  // Show an alert with a checkbox using the prompt service
  showAlertCheck : function(title, text, type) {
    let checkboxMessage;
    let check;
    let result;
    try {
      checkboxMessage = this.getString('jondofox.dialog.checkbox.' + type +
        '.warning');
      check = {value: false};
      result = this.promptService.alertCheck(null, title, text, checkboxMessage,
        check);
      if (check.value) {
        this.prefsHandler.setBoolPref('extensions.jondofox.' + type +
          '_warning', false);
      }
      return result;
    } catch (e) {
      this.log("showAlert(): " + e);
    }
  },
  
  // Show a confirm dialog with a checkbox and custom buttons
  // using the prompt service.
  showConfirmEx : function(title, text, type, bIsStartup) {
    let checkboxMessage;
    let check;
    let result;
    let flags;
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
      if (check.value) {
        this.prefsHandler.setBoolPref('extensions.jondofox.' + type +
          '_warning', false);
      }
      return result;
    } catch (e) {
      this.log("showConfirmEx(): " + e);
    }
  },

  // Return a properties string
  getString : function(name) {
    try {
      return this.stringBundle.GetStringFromName(name);
    } catch (e) {
      this.log("getString(): " + e);
    }
  },

  // Return a formatted string
  formatString : function(name, strArray) {
    try {
      return this.stringBundle.formatStringFromName(name, strArray,
        strArray.length);
    } catch (e) {
      this.log("formatString(): " + e);
    }
  }
};
