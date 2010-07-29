///////////////////////////////////////////////////////////////////////////////
// MD5 functions and SafeCache's functionality
///////////////////////////////////////////////////////////////////////////////

//These (i.e. the MD5) functions are under the following license:
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

// The syntax is slightly adapted by Georg Koppen, JonDos GmbH

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

//These functions are slightly adapted by Georg Koppen, JonDos GmbH.


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

  ACCEPT_COOKIES: 0,
  NO_FOREIGN_COOKIES: 1,
  REJECT_COOKIES: 2,

  /*
   * Configurable variables. You may need to tweak these to be compatible with
   * the server-side, but the defaults work in most cases.
   */
  hexcase: 0,  /* hex output format. 0 - lowercase; 1 - uppercase        */
  b64pad: "",  /* base-64 pad character. "=" for strict RFC compliance   */
  chrsz: 8,    /* bits per input character. 8 - ASCII; 16 - Unicode      */

  /*
   * These are the functions you'll usually want to call
   * They take string arguments and return either hex or base-64 encoded strings
   */
  hex_md5: function(s){ return this.binl2hex(this.core_md5(this.str2binl(s), s.length * this.chrsz));},
  b64_md5: function(s){ return this.binl2b64(this.core_md5(this.str2binl(s), s.length * this.chrsz));},
  str_md5: function(s){ return this.binl2str(this.core_md5(this.str2binl(s), s.length * this.chrsz));},
  hex_hmac_md5: function(key, data) { return this.binl2hex(this.core_hmac_md5(key, data)); },
  b64_hmac_md5: function(key, data) { return this.binl2b64(this.core_hmac_md5(key, data)); },
  str_hmac_md5: function(key, data) { return this.binl2str(this.core_hmac_md5(key, data)); },

  /*
   * Perform a simple self-test to see if the VM is working
   */
  md5_vm_test: function() {
    return this.hex_md5("abc") === "900150983cd24fb0d6963f7d28e17f72";
  },

  /*
   * Calculate the MD5 of an array of little-endian words, and a bit length
   */
  core_md5: function(x, len) {
    /* append padding */
    x[len >> 5] |= 0x80 << ((len) % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;

    var a =  1732584193;
    var b = -271733879;
    var c = -1732584194;
    var d =  271733878;

    for(var i = 0; i < x.length; i += 16) {
      var olda = a;
      var oldb = b;
      var oldc = c;
      var oldd = d;

      a = this.md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
      d = this.md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
      c = this.md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
      b = this.md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
      a = this.md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
      d = this.md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
      c = this.md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
      b = this.md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
      a = this.md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
      d = this.md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
      c = this.md5_ff(c, d, a, b, x[i+10], 17, -42063);
      b = this.md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
      a = this.md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
      d = this.md5_ff(d, a, b, c, x[i+13], 12, -40341101);
      c = this.md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
      b = this.md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

      a = this.md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
      d = this.md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
      c = this.md5_gg(c, d, a, b, x[i+11], 14,  643717713);
      b = this.md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
      a = this.md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
      d = this.md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
      c = this.md5_gg(c, d, a, b, x[i+15], 14, -660478335);
      b = this.md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
      a = this.md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
      d = this.md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
      c = this.md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
      b = this.md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
      a = this.md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
      d = this.md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
      c = this.md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
      b = this.md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

      a = this.md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
      d = this.md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
      c = this.md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
      b = this.md5_hh(b, c, d, a, x[i+14], 23, -35309556);
      a = this.md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
      d = this.md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
      c = this.md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
      b = this.md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
      a = this.md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
      d = this.md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
      c = this.md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
      b = this.md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
      a = this.md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
      d = this.md5_hh(d, a, b, c, x[i+12], 11, -421815835);
      c = this.md5_hh(c, d, a, b, x[i+15], 16,  530742520);
      b = this.md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

      a = this.md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
      d = this.md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
      c = this.md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
      b = this.md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
      a = this.md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
      d = this.md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
      c = this.md5_ii(c, d, a, b, x[i+10], 15, -1051523);
      b = this.md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
      a = this.md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
      d = this.md5_ii(d, a, b, c, x[i+15], 10, -30611744);
      c = this.md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
      b = this.md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
      a = this.md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
      d = this.md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
      c = this.md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
      b = this.md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

      a = this.safe_add(a, olda);
      b = this.safe_add(b, oldb);
      c = this.safe_add(c, oldc);
      d = this.safe_add(d, oldd);
    }
    return Array(a, b, c, d);
  },

  /*
   * These functions implement the four basic operations the algorithm uses.
   */
  md5_cmn: function(q, a, b, x, s, t) {
    return this.safe_add(this.bit_rol(this.safe_add(this.safe_add(a, q), this.safe_add(x, t)), s),b);
  },

  md5_ff: function(a, b, c, d, x, s, t) {
   return this.md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
  },

  md5_gg: function(a, b, c, d, x, s, t) {
    return this.md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
  },

  md5_hh: function(a, b, c, d, x, s, t) {
    return this.md5_cmn(b ^ c ^ d, a, b, x, s, t);
  },

  md5_ii: function(a, b, c, d, x, s, t) {
    return this.md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
  },

  /*
   * Calculate the HMAC-MD5, of a key and some data
   */
  core_hmac_md5: function(key, data) {
    var bkey = this.str2binl(key);
    if(bkey.length > 16) {
      bkey = this.core_md5(bkey, key.length * this.chrsz);
    }
    var ipad = Array(16), opad = Array(16);
    for(var i = 0; i < 16; i++) {
      ipad[i] = bkey[i] ^ 0x36363636;
      opad[i] = bkey[i] ^ 0x5C5C5C5C;
    }
    var hash = this.core_md5(ipad.concat(this.str2binl(data)), 512 + data.length * this.chrsz);
    return this.core_md5(opad.concat(hash), 512 + 128);
  },

  /*
   * Add integers, wrapping at 2^32. This uses 16-bit operations internally
   * to work around bugs in some JS interpreters.
   */
  safe_add: function(x, y) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  },

  /*
   * Bitwise rotate a 32-bit number to the left.
   */
  bit_rol: function(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  },

  /*
   * Convert a string to an array of little-endian words
   * If chrsz is ASCII, characters >255 have their hi-byte silently ignored.
   */
  str2binl: function(str) {
    var bin = Array();
    var mask = (1 << this.chrsz) - 1;
    for(var i = 0; i < str.length * this.chrsz; i += this.chrsz) {
      bin[i>>5] |= (str.charCodeAt(i / this.chrsz) & mask) << (i%32);
    }
    return bin;
  },

  /*
   * Convert an array of little-endian words to a string
   */
  binl2str: function(bin) {
    var str = "";
    var mask = (1 << this.chrsz) - 1;
    for(var i = 0; i < bin.length * 32; i += this.chrsz) {
      str += String.fromCharCode((bin[i>>5] >>> (i % 32)) & mask);
    }
    return str;
  },

  /*
   * Convert an array of little-endian words to a hex string.
   */
  binl2hex: function(binarray) {
    var hex_tab = this.hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
    var str = "";
    for(var i = 0; i < binarray.length * 4; i++) {
    str += hex_tab.charAt((binarray[i>>2] >> ((i%4)*8+4)) & 0xF) +
           hex_tab.charAt((binarray[i>>2] >> ((i%4)*8  )) & 0xF);
    }
    return str;
  },

  binl2b64: function(binarray) {
    var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var str = "";
    for(var i = 0; i < binarray.length * 4; i += 3) {
      var triplet = (((binarray[i   >> 2] >> 8 * ( i   %4)) & 0xFF) << 16)
                  | (((binarray[i+1 >> 2] >> 8 * ((i+1)%4)) & 0xFF) << 8 )
                  |  ((binarray[i+2 >> 2] >> 8 * ((i+2)%4)) & 0xFF);
      for(var j = 0; j < 4; j++) {
        if(i * 8 + j * 6 > binarray.length * 32) {
          str += this.b64pad

        } else {
          str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
        }
      }
    }
    return str;
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
    var hash = this.str_md5(str); 
    var intHash = 0;    
    for(var i = 0; i < hash.length && i < 8; i++)
      intHash += hash.charCodeAt(i) << (i << 3);
    return intHash;
  },

  classDescription: "SafeCache", 
  classID:          Components.ID("{fd63cb38-479f-11df-ab87-001d92567994}"),
  contractID:       "@jondos.de/safecache;1",
  // Implement nsISupports
  QueryInterface: XPCOMUtils.generateQI([CI.nsISupports])
};

// XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
// XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([SafeCache]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([SafeCache]);

