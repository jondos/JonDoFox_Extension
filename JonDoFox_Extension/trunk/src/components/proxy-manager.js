/******************************************************************************
 * Copyright (c) 2008-2012, JonDos GmbH
 * Author: Johannes Renner, Georg Koppen
 *
 * This component implements a proxy manager interface offering methods to set
 * proxies for certain protocols, as well as enabling and disabling a proxy.
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CC = Components.classes;
const CI = Components.interfaces;
const CR = Components.results;

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

var m_debug = CC["@mozilla.org/preferences-service;1"].
  getService(CI.nsIPrefService).getBranch("extensions.jondofox.").
  getBoolPref("debug.enabled");

// Log a message
var log = function(message) {
  if (m_debug) dump("ProxyManager :: " + message + "\n");
};

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

///////////////////////////////////////////////////////////////////////////////
// Class definition
///////////////////////////////////////////////////////////////////////////////

// Class constructor
var ProxyManager = function() {
  // Init the prefsHandler
  this.ph = CC['@jondos.de/preferences-handler;1'].
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

  // Set all proxies but SOCKS
  setProxyAll: function(host, port) {
    this.setProxyHTTP(host, port);
    this.setProxySSL(host, port);
    this.setProxyFTP(host, port);
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

  classDescription: "Proxy-Manager",
  classID:          Components.ID("{44b042a6-5e0b-4d62-b8ce-df7fc36eb8b6}"),
  contractID:       "@jondos.de/proxy-manager;1",

  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports])
};

// XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
// XPCOMUtils.generateNSGetModule is for Mozilla 1.9.1/1.9.2 (FF 3.5/3.6).

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([ProxyManager]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([ProxyManager]);
