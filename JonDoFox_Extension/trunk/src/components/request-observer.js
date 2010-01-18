/******************************************************************************
 * Copyright 2008, 2009 JonDos GmbH
 * Author: Johannes Renner
 *
 * This component is instanciated once on app-startup and does the following:
 *
 * - Replace RefControl functionality by simply forging every referrer
 * - Arbitrary HTTP request headers can be set from here as well
 * - Including SafeCache's functionality
 * The functions safeCache(), setCacheKey(), readCacheKey(), bypassCache(),
 * getCookieBehavior(), newCacheKey() and getHash() are shipped with the 
 * following license:
 *
 *Redistribution and use in source and binary forms, with or without 
 *modification, are permitted provided that the following conditions are met:
 *
 *  * Redistributions of source code must retain the above copyright notice, 
 *    this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *  * Neither the name of Stanford University nor the names of its contributors
 *    may be used to endorse or promote products derived from this software with
 *    out specific prior written permission.
 *
 *THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
 *AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
 *IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
 *ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE 
 *LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 *CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 *SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 *INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
 *CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 *ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
 *POSSIBILITY OF SUCH DAMAGE.
 *
 *These functions were written by Collin Jackson, other contributors were
 *Andrew Bortz, John Mitchell, Dan Boneh.
 *
 *These functions were slightly adapted by Georg Koppen.
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

m_debug = true;

// Log method
function log(message) {
  if (m_debug) dump("RequestObserver :: " + message + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CLASS_ID = Components.ID('{cd05fe5d-8815-4397-bcfd-ca3ae4029193}');
const CLASS_NAME = 'Request-Observer'; 
const CONTRACT_ID = '@jondos.de/request-observer;1';

const CC = Components.classes;
const CI = Components.interfaces;
const CU = Components.utils;

///////////////////////////////////////////////////////////////////////////////
// Observer for "http-on-modify-request"
///////////////////////////////////////////////////////////////////////////////

var requestObserver = {

  // Preferences handler object
  prefsHandler: null,
  jdfManager: null,
  jdfUtils: null,
  ACCEPT_COOKIES: 0,
  NO_FOREIGN_COOKIES: 1,
  REJECT_COOKIES: 2,
 
  // Init the preferences handler
  init: function() {
    try {
      this.prefsHandler = CC['@jondos.de/preferences-handler;1'].
          getService().wrappedJSObject;
      this.jdfManager = CC['@jondos.de/jondofox-manager;1'].
          getService().wrappedJSObject;
      this.jdfUtils = CC['@jondos.de/jondofox-utils;1'].
          getService().wrappedJSObject;
      this.tldService = CC['@mozilla.org/network/effective-tld-service;1'].
          getService(Components.interfaces.nsIEffectiveTLDService);
    } catch (e) {
      log("init(): " + e);
    }
  },

  // This is called on every request
  modifyRequest: function(channel) {
    try {
      // Perform safecache
      if (this.prefsHandler.getBoolPref('stanford-safecache.enabled')) {
	channel.QueryInterface(CI.nsIHttpChannelInternal);
        channel.QueryInterface(CI.nsICachingChannel);
        this.safeCache(channel); 
      }

      // Forge the referrer if necessary
      if (this.prefsHandler.getBoolPref('extensions.jondofox.set_referrer')) {
        // Determine the base domain of the request
        var baseDomain;
        try {
          baseDomain = this.tldService.getBaseDomain(channel.URI, 0);
        } catch (e if e.name == "NS_ERROR_HOST_IS_IP_ADDRESS") {
          // It's an IP address
          baseDomain = channel.URI.hostPort;
        }       
        log("Request (base domain): " + baseDomain);

        // ... the string to compare to
        var suffix;
        try {
          // ... the value of the referer header
          var oldRef = channel.getRequestHeader("Referer"); 
          // Cut off the path from the referer
          log("Referrer (unmodified): " + oldRef);
          var refDomain = oldRef.split("/", 3)[2];
          //log("Referrer (domain): " + refDomain);  
          // Take a substring with the length of the base domain for comparison
          suffix = refDomain.substr(
              refDomain.length - baseDomain.length, refDomain.length);
          log("Comparing " + baseDomain + " to " + suffix);
        } catch (e if e.name == "NS_ERROR_NOT_AVAILABLE") {
          // The header is not set
          log("Referrer is not set!");
        }

        // Set the request header if the base domain is changing
        if (baseDomain != suffix) {
          var newRef = channel.URI.scheme + "://" + channel.URI.hostPort + "/";
          channel.setRequestHeader("Referer", newRef, false);
          // Set the referrer attribute to channel object (necessary?)
          //channel.referrer.spec = newRef;
          log("Referrer (modified): " + channel.getRequestHeader("Referer"));
        } else {
          log("Referrer not modified");
        }
      }

      // Set other headers here
      //channel.setRequestHeader("Accept", "*/*", false);
      
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

  examineResponse: function(channel) {
    try {
      // We are looking for URL's which are on the noProxyList first. The
      // reason is if there occurred a redirection to a different URL it is
      // not set on the noProxyList as well. Thus it can happen that the user
      // wants to avoid a download via a proxy but uses it nevertheless
      // because a redirection occurred.
      var URI = channel.URI.spec;
      // If it is on the list let's check whether we will be redirected.
      if (this.jdfManager.noProxyListContains(URI)) {
        var location = channel.getResponseHeader("Location");
        if (location != null) {
	  //If so add the new location to the noProxyList as well.
          log("Got a redirection to: " + location);
          this.jdfManager.noProxyListAdd(location);     
        }
      }
    } catch (e) {
      log("examineRespone(): " + e);
    }
  },

  onExamineResponse: function(httpChannel) {
    try {                        
      httpChannel.QueryInterface(CI.nsIChannel);
      this.examineResponse(httpChannel);
    } catch (ex) {
      log("Got exception: " + ex);
    }
  },

  safeCache: function(channel) {
    var parent = channel.referrer;
    if (channel.documentURI && channel.documentURI === channel.URI) {
      parent = null;  // first party interaction
    }
    // Same-origin policy
    if (parent && parent.host !== channel.URI.host) {
      log("||||||||||SSC: Segmenting " + channel.URI.host + 
               " content loaded by " + parent.host);
      this.setCacheKey(channel, parent.host);
    } else if(this.readCacheKey(channel.cacheKey)) {
      this.setCacheKey(channel, channel.URI.host);
    } else {
      log("||||||||||SSC: POST data detected; leaving cache key unchanged.");
    }

    // Third-party blocking policy
    switch(this.getCookieBehavior()) {
      case this.ACCEPT_COOKIES: 
        break;
      case this.NO_FOREIGN_COOKIES: 
        if(parent && parent.host !== channel.URI.host) {
          log("||||||||||SSC: Third party cache blocked for " +
               channel.URI.spec + " content loaded by " + parent.spec);
          this.bypassCache(channel);
        }
        break;
      case this.REJECT_COOKIES: 
        this.bypassCache(channel);
        break;
      default:
        log("||||||||||SSC: " + this.getCookieBehavior() + 
                 " is not a valid cookie behavior.");
        break;
    }
  },

  getCookieBehavior: function() {
    //return Components.classes["@mozilla.org/preferences-service;1"]
    //           .getService(Components.interfaces.nsIPrefService)
    //           .getIntPref(kSSC_COOKIE_BEHAVIOR_PREF);
    return 1;
  },

  setCacheKey: function(channel, str) {
    var oldData = this.readCacheKey(channel.cacheKey);
    var newKey = this.newCacheKey(this.getHash(str) + oldData);
    channel.cacheKey = newKey;
    // log("||||||||||SSC: Set cache key to hash(" + str + ") = " + 
    //          newKey.data + "\n   for " + channel.URI.spec + "\n");
  },

  // Read the integer data contained in a cache key
  readCacheKey: function(key) {
    key.QueryInterface(Components.interfaces.nsISupportsPRUint32);
    return key.data;
  },

  // Construct a new cache key with some integer data
  newCacheKey: function(data) {
    var cacheKey = 
      Components.classes["@mozilla.org/supports-PRUint32;1"]
                .createInstance(Components.interfaces.nsISupportsPRUint32);
    cacheKey.data = data;
    return cacheKey;
  },

  bypassCache: function(channel) {
    channel.loadFlags |= channel.LOAD_BYPASS_CACHE;  
      // INHIBIT_PERSISTENT_CACHING instead?
    channel.cacheKey = this.newCacheKey(0);
    log("||||||||||SSC: Bypassed cache for " + channel.URI.spec);
  },

  getHash: function(str) {
    var hash = this.jdfUtils.str_md5(str); 
    var intHash = 0;    
    for(var i = 0; i < hash.length && i < 8; i++)
      intHash += hash.charCodeAt(i) << (i << 3);
    return intHash;
  },

  // This is called once on 'app-startup'
  registerObservers: function() {
    log("Register observers");
    try {
      var observers = CC["@mozilla.org/observer-service;1"].
                         getService(CI.nsIObserverService);
      // Add observers
      observers.addObserver(this, "http-on-modify-request", false);
      observers.addObserver(this, "http-on-examine-response", false);
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
      observers.removeObserver(this, "http-on-examine-response");
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

        case 'http-on-examine-response':
	  subject.QueryInterface(CI.nsIHttpChannel);
	  this.onExamineResponse(subject);
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
