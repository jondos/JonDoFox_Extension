/******************************************************************************
 * Copyright 2008-2012 JonDos GmbH
 * Author: Johannes Renner, Georg Koppen
 *
 * This component is instantiated once on app-startup and does the following:
 *
 * - Replace RefControl functionality by simply forging every referrer
 * - Arbitrary HTTP request headers can be set from here as well
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CC = Components.classes;
const CI = Components.interfaces;
const CU = Components.utils;

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

var m_debug = CC["@mozilla.org/preferences-service;1"].
  getService(CI.nsIPrefService).getBranch("extensions.jondofox.").
  getBoolPref("debug.enabled");

// Log method
var log = function(message) {
  if (m_debug) dump("RequestObserver :: " + message + "\n");
};

CU.import("resource://gre/modules/XPCOMUtils.jsm");

///////////////////////////////////////////////////////////////////////////////
// Observer for "http-on-modify-request"
///////////////////////////////////////////////////////////////////////////////

var RequestObserver = function() {
  this.wrappedJSObject = this;
  CU.import("resource://jondofox/ssl-observatory.jsm", this); 
  CU.import("resource://jondofox/safeCache.jsm", this);
  this.sslObservatory.init();
  this.safeCache.init();
};

RequestObserver.prototype = {

  prefsHandler: null,
  jdfManager: null,
  safeCache: null,
  tldService: null,
  cookiePerm: null,
  logger: null,

  firstRequest: true,
  
  init: function() {
    try {
      this.prefsHandler = CC['@jondos.de/preferences-handler;1'].
          getService().wrappedJSObject;
      this.jdfManager = CC['@jondos.de/jondofox-manager;1'].
          getService().wrappedJSObject;
      this.tldService = CC['@mozilla.org/network/effective-tld-service;1'].
          getService(Components.interfaces.nsIEffectiveTLDService);
      this.cookiePerm = CC['@mozilla.org/cookie/permission;1'].
          getService(Components.interfaces.nsICookiePermission);
      this.logger = this.jdfManager.Log4Moz.repository.
        getLogger("JonDoFox Observer");
      this.logger.level = this.jdfManager.Log4Moz.Level["Warn"];
      this.logger.warn("Initialized Logger for Observer!\n");
    } catch (e) {
      log("init(): " + e);
    }
  },

  getDOMWindow: function(channel) {
    let notificationCallbacks;
    let wind = null;
    // Getting the content window for resetting window.name and history.length
    if (channel.notificationCallbacks) {
      notificationCallbacks = channel.notificationCallbacks;
    } else {
      if (channel.loadGroup) {
        notificationCallbacks = channel.loadGroup.notificationCallbacks;
      } else {
        notificationCallbacks = null;
      }
    }
    if (!notificationCallbacks) {
      log("We found no Notificationcallbacks! Returning null...");
    } else {
      try {
        wind = notificationCallbacks.getInterface(CI.nsILoadContext).
          associatedWindow; 
      } catch (e) {
        log("Error while trying to get the Window: " + e); 
      }
    }
    return wind;
  },

  getParentHost: function(channel) {
    let notificationCallbacks;
    let wind;
    let parentHost = null;
    wind = this.getDOMWindow(channel);
    if (wind) {
      try {
        // TODO: Why should be want to have wind.window.top.location here?
        parentHost = wind.top.location.hostname;
        return parentHost;
      } catch (ex) {
        log("nsIDOMWindow seems not to be available here!");
      }
    } 
    // We are still here, thus something went wrong. Trying further things.
    // We can't rely on the Referer here as this can legitimately be
    // 1st party while the content is still 3rd party (from a bird's eye
    // view. Therefore...
    try {
      parentHost = this.cookiePerm.getOriginatingURI(channel).host; 
    } catch (e) {
      log("getOriginatingURI failed as well: " + e +
        "\nWe try our last resort the Referer...");
      // Getting the host via getOriginatingURI failed as well (e.g. due to
      // browser-sourced favicon or safebrowsing requests). Resorting to
      // the Referer.
      if (channel.referrer) {
        parentHost = channel.referrer.host;
      } else {
        log("No Referer either. Could be 3rd party interaction though.");
      }
    } 
    return parentHost;
  },

  // This is called on every request
  modifyRequest: function(channel) {
    var originatingDomain;
    var origHostname;
    var baseDomain;
    var suffix;
    var oldRef;
    var refDomain;
    var acceptHeader;
    var parentHost;
    var domWin;
    try {
      // Perform safecache
      if (this.prefsHandler.
	    getBoolPref('extensions.jondofox.stanford-safecache_enabled')) {
	channel.QueryInterface(CI.nsIHttpChannelInternal);
        channel.QueryInterface(CI.nsICachingChannel);
        parentHost = this.getParentHost(channel); 
        this.safeCache.safeCache(channel, parentHost); 
      }

      // Forge the referrer if necessary
      if (this.prefsHandler.getBoolPref('extensions.jondofox.set_referrer')) {
        // Getting the associated window if available.
        domWin = this.getDOMWindow(channel);
        // Determine the base domain of the request
        try {
          baseDomain = this.tldService.getBaseDomain(channel.URI, 0);
        } catch (e if e.name === "NS_ERROR_HOST_IS_IP_ADDRESS") {
          // It's an IP address
          baseDomain = channel.URI.hostPort;
        }       
        // ... the string to compare to
        try {
          // ... the value of the referer header
          oldRef = channel.getRequestHeader("Referer"); 
          // Cut off the path from the referer
          log("Referrer (unmodified): " + oldRef);
          refDomain = oldRef.split("/", 3)[2];
          // We have to make sure that no port value interferes with the
          // comparison.
          refDomain = refDomain.replace(/(?::\d+)/, "");
          //log("Referrer (domain): " + refDomain);  
          // Take a substring with the length of the base domain for comparison
          suffix = refDomain.substr(
              refDomain.length - baseDomain.length, refDomain.length);
          log("Comparing " + baseDomain + " to " + suffix);
        } catch (e if e.name === "NS_ERROR_NOT_AVAILABLE") {
          // The header is not set
          log("Referrer is not set!");
        }

	// We leave the Referer in the case that we have one and it's domain is
	// the same we came from. We leave it as well if we found 3rd party 
	// content. Additionally, if no Referer is set we imitate Firefox' 
	// behavior and do not set one as well. If we have a Referer indicating
	// the user came from a different domain and do not get an originating 
	// URI we set the Referer for security's sake to null. The same holds 
	// for the case where the user came from a different domain and we got 
	// a originating URI but found no 3rd party content.
	// And, finally, the most important case: the Referer is set and the 
	// user visits a new domain, we replace the old Referer with null.
        if (suffix && baseDomain !== suffix) {
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
		    "originating Domain! " + e + " setting it to 'false'");	
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
              // The header is not set. That's good as deleting the old one
	      // was successful!
              log("Referer is not set!");
	      if (domWin && domWin.name !== '') {
                log("Found (first) window.name id: " + domWin.name);
		log("window.name was set! Set it back to default (null)...");
                domWin.name = '';
	      }
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
	  // We have to check this here as well because the window identifier
	  // could be existent even if no referrer was ever sent (i.e. in
	  // the case where the user deploys bookmarks or HTTPS -> HTTP)...
          // But we want to delete it only if the domain in the URL bar
          // changes. Let's therefore check whether we have 3rd party content
          // first.
          origHostname = this.cookiePerm.getOriginatingURI(channel).hostname; 
          if (origHostname && origHostname !== channel.URI.host) { 
            // Do nothing here as we have a 3rd party scenario (e.g. mixed
            // content sites)...
          } else {
            if (domWin && domWin.name !== '' && !suffix) {
              log("Found domWin.content.name id. It is: " + domWin.name);
              domWin.name = '';
              log("window.name was set! (else-clause). Set it back to default ('')...");
              log("domWin.content.name is now again: " + domWin.content.name);
              log("domwin.content.window.name is: " + domWin.content.window.
                name);
              log("Another one still is: " + domWin.name);
              log("Win.top is: " + domWin.top.name);
	    }
          }
        }
      }

      // Set other headers here
      // It is not enough to have the values only in the about:config! But in
      // order to use them for all requests we must use setRequestHeader() and
      // give them as an argument...
      acceptHeader = this.prefsHandler.
                         getStringPref("network.http.accept.default");
      channel.setRequestHeader("Accept", acceptHeader, false);
      // The Mozilla Do Not Track header. Maybe it helps in some scenarios...
      // See: http://donottrack.us
      channel.setRequestHeader("DNT", 1, false);
      // And we set X-Behavioral-Ad-Opt-Out as well... but only if major
      // actors like NoScript or AdBlock are supporting it.
      // channel.setRequestHeader("X-Behavioral-Ad-Opt-Out", 1, false);
      // We do not send the Accept-Charset header anymore due to FF6 doing this
      // by default.
      channel.setRequestHeader("Accept-Charset", null, false);
    } catch (e) {
      if (e.name === "NS_NOINTERFACE") {
        log("The requested interface is not available!" + e);
      } else {
        log("modifyRequest(): " + e);
      }
    }
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
    var URIplain;
    var notificationCallbacks;
    var wind;
    var parentHost;
    try {
      // We are looking for URL's which are on the noProxyList first. The
      // reason is if there occurred a redirection to a different URL it is
      // not set on the noProxyList as well. Thus, it can happen that the user
      // wants to avoid a download via a proxy but uses it nevertheless
      // because a redirection occurred. We also check whether the user allowed
      // a proxy circumvention of a HTTP download but we got one using HTTPS.
      // In this case we should allow circumvention as well but not vice versa.
      // TODO: To get all redirects it is probably better to implement
      // nsIChannelEventSink
      if (channel.URI.scheme === "https") {
        URIplain = "http".concat(channel.URI.spec.slice(5));
      }
      URI = channel.URI.spec;
      // If it is on the list let's check whether we will be redirected.
      if (this.jdfManager.noProxyListContains(URI) ||
          this.jdfManager.noProxyListContains(URIplain)) {
        var location = channel.getResponseHeader("Location");
        if (location !== null) {
	  //If so add the new location to the noProxyList as well.
          log("Got a redirection to: " + location);
          this.jdfManager.noProxyListAdd(location);     
        }
      }
      // Now the code helping the EFF SSL-Observatory...
      var obsProxy = this.prefsHandler.
        getIntPref("extensions.jondofox.observatory.proxy"); 
      var proxyState = this.jdfManager.getState();
      // We can safely assume that a user wants to send the certs via a custom
      // proxy even if there are no "valid" proxy values entered as she has
      // already been asked whether she really wants to use such a "proxy".
      if ((obsProxy === 0 && proxyState === 'jondo') ||
          (obsProxy === 1 && proxyState === 'tor') ||
          (obsProxy === 2 && proxyState === 'custom') ||
          (obsProxy === 3 && (proxyState === 'jondo' || proxyState === 'tor' ||
           proxyState === 'custom')) ||
          (obsProxy === 4)) {
        var certs = this.sslObservatory.getSSLCert(channel);
        if (certs) {
          var chainEnum = certs.getChain();
          var chainArray = [];
          for (var i = 0; i < chainEnum.length; i++) {
            var cert = chainEnum.queryElementAt(i, CI.nsIX509Cert);
            chainArray.push(cert);
          }
          this.logger.warn("Cert length is: " + chainArray.length);
          if (channel.URI.port == -1) {
            this.sslObservatory.
              submitChain(chainArray, new String(channel.URI.host));
          } else {
            this.sslObservatory.
              submitChain(chainArray, channel.URI.host+":"+channel.URI.port);
          }
        }  
      }
      // The HTTP Auth tracking protection on the response side: Just for FF <
      // 12! Starting from FF 12 we have an improved protection.
      if (!this.jdfManager.ff12) {
        if (this.prefsHandler.
          getBoolPref('extensions.jondofox.stanford-safecache_enabled')) { 
          parentHost = this.getParentHost(channel); 
          if (channel.documentURI && channel.documentURI === channel.URI) {
            parentHost = null;  // first party interaction
          } 
          if (parentHost && parentHost !== channel.URI.host) {  
            try {
              if (channel.getResponseHeader("WWW-Authenticate")) {
                channel.setResponseHeader("WWW-Authenticate", null, false);
              }
            } catch (e) {} 
          } else {}
        } 
      }
    } catch (e) {
      this.logger.warn("examineRespone(): " + e);
    }
  },

  onExamineResponse: function(httpChannel) {
    try {                        
      if (this.firstRequest) {
        this.firstRequest = false;
        let testURL = this.jdfManager.jdfUtils.
          getString("jondofox.jondo." + this.jdfManager.os); 
        log("Die URL " + testURL + " wird wieder entfernt");
        if (this.jdfManager.noProxyListContains(testURL)) {
          this.jdfManager.noProxyListRemove(testURL);
          this.jdfManager.noProxyListRemove("http://ocsp.godaddy.com/"); 
        }
      }
      httpChannel.QueryInterface(CI.nsIChannel);
      this.examineResponse(httpChannel);
    } catch (ex) {
      log("Got exception: " + ex);
    }
  },

  // This is called once on 'profile-after-change'
  registerObservers: function() {
    log("Register observers");
    try {
      var observers = CC["@mozilla.org/observer-service;1"].
                         getService(CI.nsIObserverService);
      // Add observers
      observers.addObserver(this, "http-on-modify-request", false);
      observers.addObserver(this, "http-on-examine-response", false);
      observers.addObserver(this, "cookie-changed", false);
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

        case 'cookie-changed':
          if (data === "cleared") {
            this.sslObservatory.already_submitted = {};
            this.logger.
              warn("Cookies were cleared. Purging list of already submitted sites");
          }
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

  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports, CI.nsIObserver])
};

// XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
// XPCOMUtils.generateNSGetModule is for Mozilla 1.9.1/1.9.2 (FF 3.5/3.6).

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([RequestObserver]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([RequestObserver]);


