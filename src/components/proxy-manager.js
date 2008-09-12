/******************************************************************************
 * This is going to be a Proxy Manager
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
const CLASS_NAME = 'Proxy Manager'; 
const CONTRACT_ID = '@jondos.de/proxy-manager;1';

///////////////////////////////////////////////////////////////////////////////
// Class definition
///////////////////////////////////////////////////////////////////////////////

// Class constructor
function ProxyManager() {
  this.wrappedJSObject = this;
};

// Class definition
ProxyManager.prototype = {
  
  // Reference to the handler object
  prefsHandler: null,

  // Return the preferences handler
  ph: function() {
    // Get the wrappedJSObject if it is not already set
    if (!this.prefsHandler) {
      log("Setting preferences handler");
      this.prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
                                    getService().wrappedJSObject;
    }
    return this.prefsHandler;
  },

  // Set the HTTP proxy host and port
  setProxyHTTP: function(host, port) {    
    try {
      this.ph().setStringPreference("network.proxy.http", host);
      this.ph().setIntegerPreference("network.proxy.http_port", port);
    } catch (e) {
      log("setProxyHTTP(): " + e);
    }
  },
  
  // Set the SSL proxy host and port 
  setProxyHTTPS: function(host, port) {
    try {
      this.ph().setStringPreference("network.proxy.ssl", host);
      this.ph().setIntegerPreference("network.proxy.ssl_port", port);
    } catch (e) {
      log("setProxyHTTPS(): " + e);
    }
  },
  
  // Set the FTP proxy host and port 
  setProxyFTP: function(host, port) {
    try {
      this.ph().setStringPreference("network.proxy.ftp", host);
      this.ph().setIntegerPreference("network.proxy.ftp_port", port);
    } catch (e) {
      log("setProxyFTP(): " + e);
    } 
  },

  // Set all proxies
  setProxyAll: function(host, port) {
    this.setProxyHTTP(host, port);
    this.setProxyHTTPS(host, port);
    this.setProxyFTP(host, port);
  },

  enableProxy: function() {
    // Set 'network.proxy.type' --> 1
    this.ph().setIntegerPreference("network.proxy.type", 1);
  },

  disableProxy: function() {
    // Reset ... to 0
    this.ph().setIntegerPreference("network.proxy.type", 0);
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
