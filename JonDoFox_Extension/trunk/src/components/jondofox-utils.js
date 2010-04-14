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
  
  // Set wrappedJSObject
  this.wrappedJSObject = this;
};

// Class definition
JonDoFoxUtils.prototype = {
  
///////////////////////////////////////////////////////////////////////////////
// MD5 functions, we need e.g. for adapting SafeCache's functionality
///////////////////////////////////////////////////////////////////////////////

//These functions are under the following license:
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

// The syntax was slightly adapted by Georg Koppen

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
    if (aOuter != null)
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
