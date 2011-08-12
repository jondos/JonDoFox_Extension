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

  ACCEPT_COOKIES: 0,
  NO_FOREIGN_COOKIES: 1,
  REJECT_COOKIES: 2,
  
  init: function() {
    this.cryptoHash = CC['@mozilla.org/security/hash;1'].
	 createInstance(CI.nsICryptoHash); 
    this.converter = CC['@mozilla.org/intl/scriptableunicodeconverter'].
	 createInstance(CI.nsIScriptableUnicodeConverter); 
    this.converter.charset = "UTF-8"; 
  },

  safeCache: function(channel, notificationCallbacks) {
   var parent = null;
     if (notificationCallbacks) {
       try {
         var wind = notificationCallbacks.QueryInterface(
           CI.nsIInterfaceRequestor).getInterface(CI.nsIDOMWindow);
            parent = wind.window.top.location;
        } catch(e) {
          log("||||||||||SSC: Error while obtaining the Window!" + e);
        }
        log("||||||||||SSC: Parent "+parent+" for "+ channel.URI.spec);
    } else {
      dump("No Channel notification callbacks for: " + channel.URI.spec + "\n"); 
      dump("Assuming first party...\n");
    }
    if (channel.documentURI && channel.documentURI === channel.URI) {
      parent = null;  // first party interaction
    }
    // Same-origin policy
    if (parent && parent.hostname !== channel.URI.host) {
      log("||||||||||SSC: Segmenting " + channel.URI.host + 
               " content loaded by " + parent.host);
      this.setCacheKey(channel, parent.hostname);
      log("Deleting Authorization header for 3rd party content if available..");
      try {
        // We reset the Pragma and the Cache-Control header as well here.
        // Otherwise we would get a "no-cache, no-cache" value which could
        // help getting the user out of its anon group. BUT: That is still
        // possible (only slightly more difficult for an attacker) using some
        // timing attack as the user is prompted for the credentials after we
        // deleted the authorization header.
        channel.setRequestHeader("Authorization", null, false);
        channel.setRequestHeader("Pragma", null, false);
        channel.setRequestHeader("Cache-Control", null, false);
      } catch (e) {
        log("Error while deleting the Auth header: " + e);
      }
    } else {
      if (!this.readCacheKey(channel.cacheKey)) {
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
        if(parent && parent.hostname !== channel.URI.host) {
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

