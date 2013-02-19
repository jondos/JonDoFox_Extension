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
// The other code was written by Georg Koppen, JonDos GmbH 2010-2012.

"use strict";

let EXPORTED_SYMBOLS = ["safeCache"];

const Cc = Components.classes;
const Ci = Components.interfaces;

let safeCache = {
  
  cryptoHash : null,
  converter : null,
  reqObs : null,
  prefsHandler : null,

  ACCEPT_COOKIES : 0,
  NO_FOREIGN_COOKIES : 1,
  REJECT_COOKIES : 2,

  debug : false,
  
  init : function() {
    this.debug = Cc["@mozilla.org/preferences-service;1"].
      getService(Ci.nsIPrefService).getBranch("extensions.jondofox.").
      getBoolPref("debug.enabled"); 
    this.cryptoHash = Cc["@mozilla.org/security/hash;1"].
      createInstance(Ci.nsICryptoHash);
    this.converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].
      createInstance(Ci.nsIScriptableUnicodeConverter);
    this.converter.charset = "UTF-8";
    this.prefsHandler = Cc["@jondos.de/preferences-handler;1"].getService().
      wrappedJSObject;
    Components.utils.import("resource://jondofox/jdfUtils.jsm", this);
  },

  log : function(message) {
    if (this.debug) {
      dump("SafeCache :: " + message + "\n");
    }
  },

  safeCache : function(channel, parentHost) {
    if (channel.documentURI && channel.documentURI === channel.URI) {
      // first party interaction
      parentHost = null;
    }
    // Same-origin policy
    let host = channel.URI.host;
    if (parentHost && parentHost !== host) {
      this.log("Segmenting " + host + " content loaded by " + parentHost);
      this.setCacheKey(channel, parentHost);
      
      // We currently do not get headers here in all cases. WTF!? Why?
      // AND: Setting them to null does not do anything in some cases: The
      // Auth information is still sent!
      // Answer: The problem is that the Authorization header is set after
      // the http-on-modify-request notification is fired :-/. Thus, nothing we
      // can do here without fixing it in the source (nsHttpChannel.cpp).
      // Update: That got fixed in FF 12.
      let authHeader;
      try { 
        authHeader = channel.getRequestHeader("Authorization");
      } catch (e) {
        authHeader = false;
      }
      // Just checking the Authorization header is not enough. We need to avoid
      // two corner cases: 1) false positives like favicon load done by the
      // browser and 2) race conditions due to asynchronous networking. To
      // explain the latter in this context: Suppose we have a third party
      // request to http://foo:bar@example.com/. Ideally, it would return with a
      // 401 before the next request, say to
      // http://foo:bar@example.com/baz.html, would be issued. In this case we
      // would strip the Authorization header and add the LOAD_ANONYMOUS flag
      // (see below) and everything would be fine. But now imagine the second
      // request above would be issued before the response of the first arrived.
      // The LOAD_ANONYMOUS flag would not get added which leads to a prompt
      // of the authentication dialog after the response of the second request
      // arrived. Thus, we already add the LOAD_ANONYMOUS flag if we find a
      // user(:pass)@ in a third party URL.
      if ((authHeader || channel.URI.userPass !== "") && parentHost !==
          "browser") {
        this.log("Deleting Authorization header for 3rd party content, if any" +
          "  ...");
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
          let ww = Cc["@mozilla.org/appshell/window-mediator;1"].
            getService(Ci.nsIWindowMediator);
          let wind = ww.getMostRecentWindow("navigator:browser");
          let notifyBox = wind.gBrowser.getNotificationBox();
          let timeout;
          let timer;
          // One notification per host seems to be enough.
          if (notifyBox && !notifyBox.getNotificationWithValue(host)) {
            let n = notifyBox.appendNotification(host + " " +
                this.jdfUtils.getString("jondofox.basicAuth.tracking"),
                host, null, notifyBox.PRIORITY_WARNING_MEDIUM,
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
                timer = Cc["@mozilla.org/timer;1"].
                  createInstance(Ci.nsITimer);
              }
              timeout = timer.initWithCallback(event, notifyTimeout * 1000,
                Ci.nsITimer.TYPE_ONE_SHOT);
            }
          }
        } catch(e) {
          this.log("Error in the notificationBox code: " + e);
        }
      }
    } else {
      if (!this.readCacheKey(channel.cacheKey) && channel.requestMethod !==
        "POST") {
        this.log("Could not find a cache key for: " + host);
        //this.setCacheKey(channel, host);
      } else {
        this.log("Leaving cache key unchanged.");
      }
    }

    // Third-party blocking policy
    switch(this.getCookieBehavior()) {
      case this.ACCEPT_COOKIES:
        break;
      case this.NO_FOREIGN_COOKIES:
        if(parentHost && parentHost !== host) {
          this.log("Third party cache blocked for " +
            channel.URI.spec + " content loaded by " + parentHost);
          this.bypassCache(channel);
        }
        break;
      case this.REJECT_COOKIES:
        this.bypassCache(channel);
        break;
      default:
        this.log(this.getCookieBehavior() + " is not a valid cookie behavior.");
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
    let oldData = this.readCacheKey(channel.cacheKey);
    let newKey = this.newCacheKey(this.getHash(str) + oldData);
    //channel.cacheKey = newKey;
    //this.log("Set cache key to hash(" + str + ") = " + newKey.data + "\n for " +
    // channel.URI.spec + "\n");
  },

  // Read the integer data contained in a cache key
  readCacheKey: function(key) {
    key.QueryInterface(Ci.nsISupportsPRUint32);
    return key.data;
  },

  // Construct a new cache key with some integer data
  newCacheKey: function(data) {
    let cacheKey = Cc["@mozilla.org/supports-PRUint32;1"].
      createInstance(Ci.nsISupportsPRUint32);
    cacheKey.data = data;
    return cacheKey;
  },

  bypassCache: function(channel) {
    channel.loadFlags |= channel.LOAD_BYPASS_CACHE;  
      // INHIBIT_PERSISTENT_CACHING instead?
    //channel.cacheKey = this.newCacheKey(0);
    this.log("Bypassed cache for " + channel.URI.spec);
  },

  getHash: function(str) {
    let result = {};
    this.cryptoHash.init(this.cryptoHash.MD5);
    let data = this.converter.convertToByteArray(str, result);
    this.cryptoHash.update(data, data.length);
    let hash = this.cryptoHash.finish(false);
    let finalHash = 0;
    for (var i = 0; i < hash.length && i < 8; i++) {
      finalHash += hash.charCodeAt(i) << (i << 3);
    }
    return finalHash;
  }
};
