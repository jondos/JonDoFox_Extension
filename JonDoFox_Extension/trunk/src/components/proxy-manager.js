/******************************************************************************
 * Copyright (c) 2008, JonDos GmbH
 * Author: Johannes Renner
 *
 * This component implements a proxy manager interface offering methods to set 
 * proxies for certain protocols, as well as enabling and disabling a proxy.
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

var mDebug = true;

// Log a message
function log(message) {
  if (mDebug) dump("ProxyManager :: " + message + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CLASS_ID = Components.ID('{44b042a6-5e0b-4d62-b8ce-df7fc36eb8b6}');
const CLASS_NAME = 'Proxy-Manager'; 
const CONTRACT_ID = '@jondos.de/proxy-manager;1';

const nsISupports = Components.interfaces.nsISupports;

///////////////////////////////////////////////////////////////////////////////
// Class definition
///////////////////////////////////////////////////////////////////////////////

// Class constructor
function ProxyManager() {
  // Init the prefsHandler  
  this.ph = Components.classes['@jondos.de/preferences-handler;1'].
                          getService().wrappedJSObject; 
  // Set wrappedJSObject
  this.wrappedJSObject = this;
};

// Class definition
ProxyManager.prototype = {
    
  // The prefs handler object
  ph: null,

  // Set the HTTP proxy host and port
  setProxyHTTP: function(host, port) {
    log("HTTP proxy --> " + host + ":" + port);
    try {
      this.ph.setStringPref("network.proxy.http", host);
      this.ph.setIntPref("network.proxy.http_port", port);
    } catch (e) {
      log("setProxyHTTP(): " + e);
    }
  },
  
  // Set the SSL proxy host and port 
  setProxySSL: function(host, port) {
    log("SSL proxy --> " + host + ":" + port);
    try {
      this.ph.setStringPref("network.proxy.ssl", host);
      this.ph.setIntPref("network.proxy.ssl_port", port);
    } catch (e) {
      log("setProxySSL(): " + e);
    }
  },
  
  // Set the FTP proxy host and port 
  setProxyFTP: function(host, port) {
    log("FTP proxy --> " + host + ":" + port);
    try {
      this.ph.setStringPref("network.proxy.ftp", host);
      this.ph.setIntPref("network.proxy.ftp_port", port);
    } catch (e) {
      log("setProxyFTP(): " + e);
    } 
  },
  
  // Set the Gopher proxy host and port 
  setProxyGopher: function(host, port) {
    log("Gopher proxy --> " + host + ":" + port);
    try {
      this.ph.setStringPref("network.proxy.gopher", host);
      this.ph.setIntPref("network.proxy.gopher_port", port);
    } catch (e) {
      log("setProxyGopher(): " + e);
    } 
  },

  // Set all proxies but SOCKS
  setProxyAll: function(host, port) {
    this.setProxyHTTP(host, port);
    this.setProxySSL(host, port);
    this.setProxyFTP(host, port);
    this.setProxyGopher(host, port);
  },
  
  // Handle SOCKS independently from the other protocols
  setProxySOCKS: function(host, port, version) {
    log("SOCKS proxy (version " + version + ") --> " + host + ":" + port);
    try {
      this.ph.setStringPref("network.proxy.socks", host);
      this.ph.setIntPref("network.proxy.socks_port", port);
      this.ph.setIntPref("network.proxy.socks_version", version);
    } catch (e) {
      log("setProxySOCKS(): " + e);
    } 
  },
   
  // Set 'network.proxy.socks_remote_dns'
  setSocksRemoteDNS: function(value) {
    // Set 'network.proxy.socks_remote_dns' --> value
    log("SOCKS remote DNS --> " + value);
    try {
      this.ph.setBoolPref("network.proxy.socks_remote_dns", value);
    } catch (e) {
      log("setSocksRemoteDNS(): " + e);
    }
  },

  // Set 'network.proxy.no_proxies_on'
  setExceptions: function(value) {
    log("No proxy list --> " + value);
    try {
      this.ph.setStringPref("network.proxy.no_proxies_on", value);
    } catch (e) {
      log("setExceptions(): " + e);
    }
  },

  // Add a domain element to the no proxy list
  // XXX: Not needed?
  addException: function(domain) {
    log("Adding to no proxy list: " + domain);
    try {
      var oldList = this.ph.getStringPref("network.proxy.no_proxies_on");
      var newList = oldList + ", " + domain;
      log("No proxy list --> " + newList);
      this.ph.setStringPref("network.proxy.no_proxies_on", newList);
    } catch (e) {
      log("setExceptions(): " + e);
    }
  },

  // Return the current proxy state
  getProxyState: function() {
    try {
      var state = this.ph.getIntPref("network.proxy.type");
      log("Current proxy state is " + state);
      return state;
    } catch (e) {
      log("getProxyStatus(): " + e);
    }
  },
    
  // Set 'network.proxy.type' --> 1
  enableProxy: function() {
    log("Enable proxy");
    try {
      this.ph.setIntPref("network.proxy.type", 1);
    } catch (e) {
      log("enableProxy(): " + e);
    }
  },
    
  // Reset ... to 0
  disableProxy: function() {
    log("Disable proxy");
    try {
      this.ph.setIntPref("network.proxy.type", 0);
    } catch(e) {
      log("disableProxy(): " + e);
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

var ProxyManagerInstance = null;

var ProxyManagerFactory = {
  createInstance: function (aOuter, aIID) {    
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    if (!aIID.equals(nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    // Singleton
    if (ProxyManagerInstance == null)
      log("Creating instance");
      ProxyManagerInstance = new ProxyManager();
    return ProxyManagerInstance;
  }
};

///////////////////////////////////////////////////////////////////////////////
// Module definition (XPCOM registration)
///////////////////////////////////////////////////////////////////////////////

var ProxyManagerModule = {
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
      return ProxyManagerFactory;
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
  return ProxyManagerModule;
}
