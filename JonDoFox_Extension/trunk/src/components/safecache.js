///////////////////////////////////////////////////////////////////////////////
// SafeCache's functionality
///////////////////////////////////////////////////////////////////////////////

/* The functions safeCache(), setCacheKey(), readCacheKey(), bypassCache(),
 * getCookieBehavior(), newCacheKey() and getHash() are shipped with the 
 * following license:
 *
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are met:
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
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" 
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE 
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE 
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE 
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN 
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE 
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * These functions were written by Collin Jackson, other contributors were
 * Andrew Bortz, John Mitchell, Dan Boneh.
 */

// These functions are slightly adapted by Georg Koppen, JonDos GmbH.
// The other code was written by Georg Koppen, JonDos GmbH 2010.

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

var mDebug = true;

// Log a message
var log = function(message) {
  if (mDebug) dump("SafeCache :: " + message + "\n");
}

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CC = Components.classes;
const CI = Components.interfaces;
const CR = Components.results;

///////////////////////////////////////////////////////////////////////////////
// Class definition
///////////////////////////////////////////////////////////////////////////////

// Class constructor
var SafeCache = function() {
  
  // Set wrappedJSObject
  this.wrappedJSObject = this;
};

// Class definition
SafeCache.prototype = {
  
  cryptoHash: null,
  converter: null,
  reqObs: null,
  prefsHandler: null,

  ACCEPT_COOKIES: 0,
  NO_FOREIGN_COOKIES: 1,
  REJECT_COOKIES: 2,
  
  init: function() {
    this.cryptoHash = CC['@mozilla.org/security/hash;1'].
      createInstance(CI.nsICryptoHash); 
    this.converter = CC['@mozilla.org/intl/scriptableunicodeconverter'].
      createInstance(CI.nsIScriptableUnicodeConverter); 
    this.converter.charset = "UTF-8"; 
    this.prefsHandler = CC['@jondos.de/preferences-handler;1'].
      getService().wrappedJSObject;
    this.jdfUtils = CC['@jondos.de/jondofox-utils;1'].getService().
      wrappedJSObject; 
  },

  safeCache: function(channel, parentHost) {
    if (channel.documentURI && channel.documentURI === channel.URI) {
      parentHost = null;  // first party interaction
    }
    // Same-origin policy
    if (parentHost && parentHost !== channel.URI.host) {
      log("||||||||||SSC: Segmenting " + channel.URI.host + 
               " content loaded by " + parentHost);
      this.setCacheKey(channel, parentHost);
      log("Deleting Authorization header for 3rd party content if available..");
      // We currently do not get headers here in all cases. WTF!? Why?
      // AND: Setting them to null does not do anything in some cases: The
      // Auth information are still be sent!
      // Answer: The problem is that the Authorization header is set after
      // the http-on-modify-request notification is fired :-/. Thus, nothing we
      // can do here without fixing it in the source (nsHttpChannel.cpp).
      // Update: That got fixed in FF 12.
      try {
        if (channel.getRequestHeader("Authorization") !== null) {
          // We need both the header normalization and the LOAD_ANONYMOUS flag.
          // The first because the headers got added before
          // http-on-modify-request got called. The second to avoid the auth
          // popup due to removing the auth headers. Note: This holds only for
          // Firefox 12 or later Firefox versions. 
          channel.setRequestHeader("Authorization", null, false);
          channel.setRequestHeader("Pragma", null, false);
          channel.setRequestHeader("Cache-Control", null, false);
          channel.loadFlags |= channel.LOAD_ANONYMOUS;
          // Let's show the user some notification. We could try to get the
          // window associated with the channel but using the most recent window
          // is a more generic solution.
          try {
            let ww = CC["@mozilla.org/appshell/window-mediator;1"].
              getService(CI.nsIWindowMediator); 
            let wind = ww.getMostRecentWindow("navigator:browser");
            let notifyBox = wind.gBrowser.getNotificationBox();
            let timeout;
            let timer;
            // One notification per host seems to be enough.
            if (notifyBox && !notifyBox.getNotificationWithValue(channel.URI.
                host)) {
              let n = notifyBox.appendNotification(channel.URI.host + " " +
                  this.jdfUtils.getString("jondofox.basicAuth.tracking"),
                  channel.URI.host, null, notifyBox.PRIORITY_WARNING_MEDIUM,
                  [{accessKey: "O", label: "OK", callback:
                     function(msg, btn){
                       if (timeout) {
                         timer.cancel();
                         notifyBox.removeCurrentNotification();
                       }
                     }
                   }]);
              // Make sure it stays visible after redirects. Ten redirects
              // should be enough to get the message to the user that something
              // fishy is going on. Thanks to Certificate Patrol for this idea.
              n.persistence = 10;

              let event = {
                notify: function() {
                  if (n.parentNode) {
                    notifyBox.removeNotification(n);
                    n = null;
                  }
                }
              }

              let notifyTimeout = this.prefsHandler.
                getIntPref("extensions.jondofox.notificationTimeout"); 
              if (notifyTimeout > 0) {
                // One timer is enough...
                if (timer) {
                  timer.cancel();
                } else {
                  timer = CC["@mozilla.org/timer;1"].createInstance(CI.nsITimer);
                }
                timeout = timer.initWithCallback(event, notifyTimeout * 1000,
                  CI.nsITimer.TYPE_ONE_SHOT);
              }
            }
          } catch(e) {
            log("Error the notificationBox code: " + e);
          }
        }
      } catch (e) {}
    } else {
      if (!this.readCacheKey(channel.cacheKey) && channel.requestMethod !==
        "POST") {
        log("Could not find a cache key for: " + channel.URI.host)
        this.setCacheKey(channel, channel.URI.host);
      } else {
        log("||||||||||SSC: Leaving cache key unchanged.");
      }
    }

    // Third-party blocking policy
    switch(this.getCookieBehavior()) {
      case this.ACCEPT_COOKIES: 
        break;
      case this.NO_FOREIGN_COOKIES: 
        if(parentHost && parentHost !== channel.URI.host) {
          log("||||||||||SSC: Third party cache blocked for " +
               channel.URI.spec + " content loaded by " + parentHost);
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
    log("||||||||||SSC: Set cache key to hash(" + str + ") = " + 
      newKey.data + "\n   for " + channel.URI.spec + "\n");
  },

  // Read the integer data contained in a cache key
  readCacheKey: function(key) {
    key.QueryInterface(CI.nsISupportsPRUint32);
    return key.data;
  },

  // Construct a new cache key with some integer data
  newCacheKey: function(data) {
    var cacheKey = CC["@mozilla.org/supports-PRUint32;1"].
                      createInstance(CI.nsISupportsPRUint32);
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
    var result = {};
    this.cryptoHash.init(this.cryptoHash.MD5);
    var data = this.converter.convertToByteArray(str, result);
    this.cryptoHash.update(data, data.length);
    var hash = this.cryptoHash.finish(false);
    var finalHash = 0;    
    for(var i = 0; i < hash.length && i < 8; i++)
      finalHash += hash.charCodeAt(i) << (i << 3); 
    return finalHash;
  },
   
  classDescription: "SafeCache", 
  classID:          Components.ID("{fd63cb38-479f-11df-ab87-001d92567994}"),
  contractID:       "@jondos.de/safecache;1",
  // Implement nsISupports
  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports])
};

// XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
// XPCOMUtils.generateNSGetModule is for Mozilla 1.9.1/1.9.2 (FF 3.5/3.6).

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([SafeCache]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([SafeCache]);

