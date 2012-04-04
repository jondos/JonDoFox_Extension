"use strict";

const EXPORTED_SYMBOLS = ["sslObservatory"];

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cu = Components.utils;

var sslObservatory = {

  jdfManager : null,
  root_ca_hashes : null,
  logger : null,
  client_asn : -1,
  submit_url : null,
  csrf_nonce : null,
  already_submitted : {},
  cryptoHash : null,
  converter : null,

  encString: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  encStringS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',

  init: function() {
    Cu.import("resource://jondofox/ssl-observatory-cas.jsm", this);
    Cu.import("resource://jondofox/ssl-observatory-white.jsm", this);
    this.cryptoHash = Cc["@mozilla.org/security/hash;1"].createInstance(Ci.
      nsICryptoHash);
    this.converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].
      createInstance(Ci.nsIScriptableUnicodeConverter);
    this.converter.charset = "UTF-8";
    this.jdfManager = Cc['@jondos.de/jondofox-manager;1'].
          getService().wrappedJSObject;
    this.prefsHandler = Cc['@jondos.de/preferences-handler;1'].
          getService().wrappedJSObject;
    this.logger = this.jdfManager.Log4Moz.repository.
        getLogger("JonDoFox Observatory");
    this.logger.level = this.jdfManager.Log4Moz.Level["Info"];
    this.logger.info("Initialized SSL Observatory Logger!\n");
    // The url to submit to
    this.submit_url = "https://observatory.eff.org/submit_cert";
    // Generate nonce to append to url to protect against CSRF
    this.csrf_nonce = "#"+Math.random().toString()+Math.random().toString();
  },

  getSSLCert: function(channel) {
    try {
        // Do we have a valid channel argument?
        if (!channel instanceof Ci.nsIChannel) {
            return null;
        }
        var secInfo = channel.securityInfo;

        // Print general connection security state
        if (secInfo instanceof Ci.nsITransportSecurityInfo) {
            secInfo.QueryInterface(Ci.nsITransportSecurityInfo);
        } else {
            return null;
        }

        if (secInfo instanceof Ci.nsISSLStatusProvider) {
            return secInfo.QueryInterface(Ci.nsISSLStatusProvider).
                   SSLStatus.QueryInterface(Ci.nsISSLStatus).serverCert;
        }
        return null;
    } catch(err) {
      return null;
    }
  },

  base64_encode: function(inp, uc, safe) {
    // do some argument checking
    if (arguments.length < 1) {
      return null;
    }
    // read buffer     
    let readBuf = new Array();
    if (arguments.length >= 3 && safe !== true && safe !== false) {
      return null;
    }
    // character set used
    let enc = (arguments.length >= 3 && safe) ? this.encStringS :
      this.encString;
    // how input is to be processed
    let b = (typeof inp === "string");
    if (!b && (typeof inp !== "object") && !(inp instanceof Array)) {
      // bad input
      return null;
    }
    if (arguments.length < 2) {
      // set default
      uc = true;
    }
    // otherwise its value is passed from the caller
    if (uc != true && uc != false) {
      return null;
    }
    var n = (!b || !uc) ? 1 : 2;  // length of read buffer
    var out = '';                 // output string
    var c = 0;                    // holds character code (maybe 16 bit or 8 bit)
    var j = 1;                    // sextett counter
    var l = 0;                    // work buffer
    var s = 0;                    // holds sextett

    // convert  
    for (let i = 0, len = inp.length; i < len; ++i) {  // read input
      c = (b) ? inp.charCodeAt(i) : inp[i]; // fill read buffer
      for (var k = n - 1; k >= 0; k--) {
        readBuf[k] = c & 0xff;
        c >>= 8;
      }
      for (var m = 0; m < n; m++) {         // run through read buffer
        // process bytes from read buffer
        l = ((l<<8)&0xff00) | readBuf[m];   // shift remaining bits one byte to the left and append next byte
        s = (0x3f<<(2*j)) & l;              // extract sextett from buffer
        l -=s;                              // remove those bits from buffer;
        out += enc.charAt(s>>(2*j));        // convert leftmost sextett and append it to output
        j++;
        if (j==4) {                         // another sextett is complete
          out += enc.charAt(l&0x3f);        // convert and append it
          j = 1;
        }
      }        
    }
    switch (j) {                            // handle left-over sextetts
      case 2:
        s = 0x3f & (16 * l);                // extract sextett from buffer
        out += enc.charAt(s);               // convert leftmost sextett and append it to output
        out += '==';                        // stuff
        break;
      case 3:
        s = 0x3f & (4 * l);                 // extract sextett from buffer
        out += enc.charAt(s);               // convert leftmost sextett and append it to output
        out += '=';                         // stuff
        break;
      default:
        break;
    }

    return out;
  },

  isChainWhitelisted: function(chainhash) {
    if (this.X509ChainWhitelist == null) {
      this.logger.warn("Could not find whitelist of popular certificate " +
         "chains, so ignoring whitelist");
      return false;
    }
    if (this.X509ChainWhitelist[chainhash] === true) {
      return true;
    }
    return false;
  },

  // return the two-digit hexadecimal code for a byte
  toHexString : function(charCode) {
    return ("0" + charCode.toString(16)).slice(-2);
  },

  submitChain: function(certArray, domain) {
    let base64Certs = [];
    let fps = [];
    let rootidx = -1;
    let chainArrayFpStr = '';
    let result = {};

    for (let i = 0; i < certArray.length; i++) {
      let fp = (certArray[i].md5Fingerprint + certArray[i].sha1Fingerprint).
        replace(":", "", "g");
      fps.push(fp);
      chainArrayFpStr = chainArrayFpStr + fp;
      if (certArray[i].issuer && certArray[i].equals(certArray[i].issuer)) {
        //this.logger.warn("Got root cert at position: " + i);
        rootidx = i;
      }
    }

    let data = this.converter.convertToByteArray(chainArrayFpStr, result);
    this.cryptoHash.init(this.cryptoHash.SHA256);
    this.cryptoHash.update(data, data.length);
    let hash = this.cryptoHash.finish(false);

    let chain_hash = [this.toHexString(hash.charCodeAt(i)) for (i in hash)].
      join("").toUpperCase();
    this.logger.info("SHA-256 hash of cert chain for " + domain + " is " +
      chain_hash);

    if (this.isChainWhitelisted(chain_hash)) {
        this.logger.info("This cert chain is whitelisted. Not submitting.");
      return;
    } else {
      this.logger.info("Cert chain is NOT whitelisted. Proceeding with " +
        "submission.");
    }

    if (rootidx == -1 || (fps.length > 1 &&
        !(fps[rootidx] in this.root_ca_hashes))) {
      if (rootidx == -1) {
        rootidx = fps.length-1;
      }
      //this.logger.warn("Got a private root cert. Ignoring domain "
      //+ domain + " with root " + fps[rootidx]);
      return;
    }

    if (fps[0] in this.already_submitted) {
      //this.logger.warn("Already submitted cert for " + domain + ". Ignoring");
      return;
    }

    for (var i = 0; i < certArray.length; i++) {
      let len = {};
      let derData = certArray[i].getRawDER(len);
      // btoa() does not seem to work properly with the server side Base64
      // decoding. Therefore, we need to use a custom function here...
      // TODO: Investigate that issue.
      base64Certs.push(this.base64_encode(derData, false, false));
    }

    // TODO: Server ip??
    let reqParams = [];
    reqParams.push("domain=" + domain);
    reqParams.push("server_ip=-1");
    reqParams.push("fplist=" + JSON.stringify(fps));
    reqParams.push("certlist=" + JSON.stringify(base64Certs));
    reqParams.push("client_asn=" + this.client_asn);
    reqParams.push("private_opt_in=0");

    var params = reqParams.join("&") + "&padding=0";
    var tot_len = 4096;

    this.logger.info("Submitting cert for " + domain);
    this.logger.debug("submit_cert params: " + params);

    // Pad to exp scale. This is done because the distribution of cert sizes
    // is almost certainly pareto, and definitely not uniform.
    for (tot_len = 4096; tot_len < params.length; tot_len*=2);

    while (params.length != tot_len) {
      params += "0";
    }

    var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                 .createInstance(Ci.nsIXMLHttpRequest);
    req.open("POST", this.submit_url + this.csrf_nonce, true);

    // Send the proper header information along with the request
    // Do not set gzip header.. It will ruin the padding
    req.setRequestHeader("X-Privacy-Info",
       "EFF SSL Observatory: https://eff.org/r.22c");
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    req.setRequestHeader("Content-length", params.length);
    req.setRequestHeader("Connection", "close");
    // Need to clear useragent and other headers..
    req.setRequestHeader("User-Agent", "");
    req.setRequestHeader("Accept", "");
    req.setRequestHeader("Accept-Language", "");
    req.setRequestHeader("Accept-Encoding", "");
    req.setRequestHeader("Accept-Charset", "");

    var that = this; 
    // XXX: Not onreadystatechange due to performance reasons!
    req.onreadystatechange = function(evt) {
      if (req.readyState == 4) {
        // XXX: Handle errors properly?
        if (req.status == 200) {
          that.logger.warn("Successful cert submission for domain " + domain);
          if (!that.prefsHandler.
              getBoolPref("extensions.jondofox.observatory.cache_submitted")) {
            if (fps[0] in that.already_submitted)
              delete that.already_submitted[fps[0]];
          }
        } else {
          if (fps[0] in that.already_submitted)
            delete that.already_submitted[fps[0]];
          try {
            that.logger.warn("Cert submission failure " + req.status + 
              ": " + req.responseText);
          } catch(e) {
            that.logger.warn("Cert submission failure and exception: " + e);
          }
        }
      }
    };

    // Cache this here to prevent multiple submissions for all the content elements.
    that.already_submitted[fps[0]] = true;
    req.send(params);
  } 

}
