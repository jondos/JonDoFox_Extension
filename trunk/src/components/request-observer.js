/******************************************************************************
 * Copyright 2008, 2009 JonDos GmbH
 * Author: Johannes Renner
 *
 * This component is instanciated once on app-startup and does the following:
 *
 * - Replace RefControl functionality by simply forging every referrer
 * - Arbitrary HTTP request headers can be set from here as well
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

m_debug = true;

// Log method
function log(message) {
  if (m_debug) dump("HttpObserver :: " + message + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CLASS_ID = Components.ID('{cd05fe5d-8815-4397-bcfd-ca3ae4029193}');
const CLASS_NAME = 'Request-Observer'; 
const CONTRACT_ID = '@jondos.de/request-observer;1';

const CC = Components.classes;
const CI = Components.interfaces;

///////////////////////////////////////////////////////////////////////////////
// Observer for "http-on-modify-request"
///////////////////////////////////////////////////////////////////////////////

var requestObserver = {

  // Preferences handler object
  prefsHandler: null,

  // Init the preferences handler
  init: function() {
    try {
      this.prefsHandler = CC['@jondos.de/preferences-handler;1'].
          getService().wrappedJSObject;
    } catch (e) {
      log("init(): " + e);
    }
  },

  // This is called on every event occurrence
  modifyRequest: function(channel) {
    try {
      // Check if 'set_referrer' is true, is this a performance issue?
      if (this.prefsHandler.getBoolPref('extensions.jondofox.set_referrer')) {
        //log("BEFORE: " + channel.getRequestHeader("Referer"));        
        // Set the request header
        var ref = channel.URI.scheme + "://" + channel.URI.hostPort + "/";
        channel.setRequestHeader("Referer", ref, false);
        // Set the referrer attribute to channel object (necessary?)
        //channel.referrer.spec = ref;
        //log("AFTER: " + channel.getRequestHeader("Referer"));
      }
      // Set other headers here
      channel.setRequestHeader("Accept", "*/*", false);
      return true;
    } catch (e) {
      log("modifyRequest(): " + e);
    }
    return false;
  },

  // Call the forgery on every request
  onModifyRequest: function(httpChannel) {
    try {                        
      httpChannel.QueryInterface(CI.nsIChannel);
      this.modifyRequest(httpChannel);
    } catch (ex) {
      log("Got exception: " + ex);
    }
  },

  // This is called once on 'app-startup'
  registerObservers: function() {
    log("Register observers");
    try {
      var observers = CC["@mozilla.org/observer-service;1"].
                         getService(CI.nsIObserverService);
      // Add observers
      observers.addObserver(this, "http-on-modify-request", false);
      observers.addObserver(this, "quit-application-granted", false);
    } catch (ex) {
      log("Got exception: " + ex);
    }
  },

  // Call this once on 'quit-application-granted'
  unregisterObservers: function() {
    log("Unregister observers");
    try {
      var observers = CC["@mozilla.org/observer-service;1"].
                         getService(CI.nsIObserverService);
      // Remove observers
      observers.removeObserver(this, "http-on-modify-request");
      observers.removeObserver(this, "quit-application-granted");
    } catch (ex) {
      log("Got exception: " + ex);
    }
  },

  // Implement nsIObserver
  observe: function(subject, topic, data) {
    try {
      switch (topic) {
        case 'app-startup':
          log("Got topic --> " + topic);
          this.registerObservers();
	  this.init();
          break;
        
        case 'quit-application-granted':
          log("Got topic --> " + topic);
          this.unregisterObservers();
          break;
        
        case 'http-on-modify-request':
          subject.QueryInterface(CI.nsIHttpChannel);
          this.onModifyRequest(subject);
          break;

        default:
          log("!! Topic not handled --> " + topic);
          break;
      }
    } catch (ex) {
      log("Got exception: " + ex);
    }
  },

  // Implement nsISupports
  QueryInterface: function(iid) {
    if (!iid.equals(CI.nsISupports) &&
        !iid.equals(CI.nsIObserver) &&
        !iid.equals(CI.nsISupportsWeakReference))
                        throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
}

///////////////////////////////////////////////////////////////////////////////
// The actual component
///////////////////////////////////////////////////////////////////////////////

var RequestObserverModule = {
  
  // BEGIN nsIModule
  registerSelf: function(compMgr, fileSpec, location, type) {
    log("Registering '" + CLASS_NAME + "' ..");
    compMgr.QueryInterface(CI.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, 
               fileSpec, location, type);

    var catMan = CC["@mozilla.org/categorymanager;1"].
                    getService(CI.nsICategoryManager);
    catMan.addCategoryEntry("app-startup", "RefForgery", CONTRACT_ID, true, 
              true);
  },

  unregisterSelf: function(compMgr, fileSpec, location) {
    log("Unregistering '" + CLASS_NAME + "' ..");
    // Remove the auto-startup
    compMgr.QueryInterface(CI.nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation(CLASS_ID, fileSpec);

    var catMan = CC["@mozilla.org/categorymanager;1"].
                    getService(CI.nsICategoryManager);
    catMan.deleteCategoryEntry("app-startup", CONTRACT_ID, true);
  },

  getClassObject: function(compMgr, cid, iid) {
    if (!cid.equals(CLASS_ID))
      throw Components.results.NS_ERROR_FACTORY_NOT_REGISTERED;
    if (!iid.equals(CI.nsIFactory))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this.classFactory;
  },

  canUnload: function(compMgr) { 
    return true; 
  },
  // END nsIModule

  // Implement nsIFactory
  classFactory: {
    createInstance: function(outer, iid) {
      log("Creating instance");
      if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;

      return requestObserver.QueryInterface(iid);
    }
  }
};

///////////////////////////////////////////////////////////////////////////////
// This function is called when the application registers the component
///////////////////////////////////////////////////////////////////////////////

function NSGetModule(comMgr, fileSpec) { 
  return RequestObserverModule;
}
