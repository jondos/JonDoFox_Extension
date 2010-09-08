/******************************************************************************
 * Copyright 2008-2010 JonDos GmbH
 * Author: Johannes Renner, Georg Koppen
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
var log = function(message) {
  if (m_debug) dump("RequestObserver :: " + message + "\n");
};

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CC = Components.classes;
const CI = Components.interfaces;
const CU = Components.utils;

///////////////////////////////////////////////////////////////////////////////
// Observer for "http-on-modify-request"
///////////////////////////////////////////////////////////////////////////////

var RequestObserver = function() {
  this.wrappedJSObject = this
};

RequestObserver.prototype = {

  prefsHandler: null,
  jdfManager: null,
  safeCache: null,
  tldService: null,
  cookiePerm: null,
  
  init: function() {
    try {
      this.prefsHandler = CC['@jondos.de/preferences-handler;1'].
          getService().wrappedJSObject;
      this.jdfManager = CC['@jondos.de/jondofox-manager;1'].
          getService().wrappedJSObject;
      this.safeCache = CC['@jondos.de/safecache;1'].
          getService().wrappedJSObject;
      this.tldService = CC['@mozilla.org/network/effective-tld-service;1'].
          getService(Components.interfaces.nsIEffectiveTLDService);
      this.cookiePerm = CC['@mozilla.org/cookie/permission;1'].
          getService(Components.interfaces.nsICookiePermission);
    } catch (e) {
      log("init(): " + e);
    }
  },

  // This is called on every request
  modifyRequest: function(channel) {
    var originatingDomain;
    var baseDomain;
    var suffix;
    var oldRef;
    var refDomain;
    var acceptHeader;
    try {
      // Perform safecache
      if (this.prefsHandler.getBoolPref('stanford-safecache.enabled')) {
	channel.QueryInterface(CI.nsIHttpChannelInternal);
        channel.QueryInterface(CI.nsICachingChannel);
        this.safeCache.safeCache(channel); 
      }

      // Forge the referrer if necessary
      if (this.prefsHandler.getBoolPref('extensions.jondofox.set_referrer')) {
        // Determine the base domain of the request
        try {
          baseDomain = this.tldService.getBaseDomain(channel.URI, 0);
        } catch (e if e.name === "NS_ERROR_HOST_IS_IP_ADDRESS") {
          // It's an IP address
          baseDomain = channel.URI.hostPort;
        }       
        log("Request (base domain): " + baseDomain);

        // ... the string to compare to
        try {
          // ... the value of the referer header
          oldRef = channel.getRequestHeader("Referer"); 
          // Cut off the path from the referer
          log("Referrer (unmodified): " + oldRef);
          refDomain = oldRef.split("/", 3)[2];
          //log("Referrer (domain): " + refDomain);  
          // Take a substring with the length of the base domain for comparison
          suffix = refDomain.substr(
              refDomain.length - baseDomain.length, refDomain.length);
          log("Comparing " + baseDomain + " to " + suffix);
        } catch (e if e.name === "NS_ERROR_NOT_AVAILABLE") {
          // The header is not set
          log("Referrer is not set!");
          oldRef = false;
        }

	// We leave the Referer if we found 3rd party content. Otherwise, 
        // if no Referer is set we imitate Firefox' behavior and do not set
        // one as well. If we have a Referer indicating the user came from a
	// different domain and do not get an originating URI we set the 
	// Referer for security's sake to null. The same holds for the case
	// were the user came from a different domain and we got a originating
	// URI but found no 3rd party content.
        if (baseDomain !== suffix && oldRef) {
          log ("URI is: " + baseDomain);
          try {
            originatingDomain = this.cookiePerm.getOriginatingURI(channel);
          } catch (e) {
            log ("Getting the originating URI failed!");
            originatingDomain = false;
          }
          if (originatingDomain) {
            try {
              originatingDomain = this.tldService.
                                     getBaseDomain(originatingDomain, 0);
            } catch (e)  {
	      if (e.name === "NS_ERROR_HOST_IS_IP_ADDRESS") {
                // It's an IP address
                originatingDomain = originatingDomain.hostPort;
	      } else {
                originatingDomain = false;
	        log("There occurred an error while trying to get the " + 
		    "originatin Domain! " + e + " setting it to 'false'");	
	      }
            }  
          }
          log ("Originating URI is: " + originatingDomain);
          if (baseDomain === originatingDomain || !originatingDomain) {
            channel.setRequestHeader("Referer", null, false);
	    try {
	      log("Referrer (modified): " + 
			      channel.getRequestHeader("Referer"));
	    } catch (e if e.name === "NS_ERROR_NOT_AVAILABLE") {
              // The header is not set
              log("Referer is not set!");
	    }
          } else {
            if (originatingDomain !== "false") {
              log("3rd party content, Referrer not modified");
            } else {
              log("We got a referer but no originating URI!\n" + 
	          "Modify the referer, although it may be 3rd party content!");
	      channel.setRequestHeader("Referer", null, false);
            }
          }
        } else {
          log("Referer not modified");
        }
      }

      // Set other headers here
      // It is not enough to have the values only in the about:config! But in
      // order to use them for all requests we must use setRequestHeader() and
      // give them as an argument...
      acceptHeader = this.prefsHandler.
                          getStringPref("network.http.accept.default");
      channel.setRequestHeader("Accept", acceptHeader, false);
      
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
    var URI;
    try {
      // We are looking for URL's which are on the noProxyList first. The
      // reason is if there occurred a redirection to a different URL it is
      // not set on the noProxyList as well. Thus it can happen that the user
      // wants to avoid a download via a proxy but uses it nevertheless
      // because a redirection occurred.
      URI = channel.URI.spec;
      // If it is on the list let's check whether we will be redirected.
      if (this.jdfManager.noProxyListContains(URI)) {
        var location = channel.getResponseHeader("Location");
        if (location !== null) {
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
        case 'profile-after-change':
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

  classDescription: "Request-Observer",
  classID:          Components.ID("{cd05fe5d-8815-4397-bcfd-ca3ae4029193}"),
  contractID:       "@jondos.de/request-observer;1",

  // No service flag here. Otherwise the registration for FF3.6.x would not work
  // See: http://groups.google.com/group/mozilla.dev.extensions/browse_thread/
  // thread/d9f7d1754ae43045/97e55977ecea7084?show_docid=97e55977ecea7084 
  _xpcom_categories: [{
    category: "profile-after-change",
  }],

  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports, CI.nsIObserver,
				  CI.nsISupportsWeakReference])
};

// XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
// XPCOMUtils.generateNSGetModule is for Mozilla 1.9.1/1.9.2 (FF 3.5/3.6).

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([RequestObserver]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([RequestObserver]);


