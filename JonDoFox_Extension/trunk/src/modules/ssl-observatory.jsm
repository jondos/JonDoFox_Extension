"use strict";

const EXPORTED_SYMBOLS = ["sslObservatory"];

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cu = Components.utils;


var sslObservatory = {

  jdfManager : null,
  compatJSON : null,
  root_ca_hashes : null,
  logger : null,
  client_asn : -1,
  already_submitted : {},

  init: function() {
    Cu.import("resource://jondofox/ssl-observatory-cas.jsm", this); 
    this.jdfManager = Cc['@jondos.de/jondofox-manager;1'].
          getService().wrappedJSObject;
    this.prefsHandler = Cc['@jondos.de/preferences-handler;1'].
          getService().wrappedJSObject;
    this.compatJSON = Cc["@mozilla.org/dom/json;1"].createInstance(Ci.nsIJSON);
    this.logger = this.jdfManager.Log4Moz.repository.
        getLogger("JonDoFox Observatory");
    this.logger.level = this.jdfManager.Log4Moz.Level["Warn"]; 
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

  submitChain: function(certArray, domain) {
    var base64Certs = [];
    var fps = [];
    var rootidx = -1;

    for (var i = 0; i < certArray.length; i++) {
      var fp = (certArray[i].md5Fingerprint + certArray[i].sha1Fingerprint).
        replace(":", "", "g");
      fps.push(fp);
      if (certArray[i].issuer && certArray[i].equals(certArray[i].issuer)) {
        this.logger.warn("Got root cert at position: " + i);
        rootidx = i;
      }
    }

    if (rootidx == -1 || (fps.length > 1 && 
        !(fps[rootidx] in this.root_ca_hashes))) {
      if (rootidx == -1) {
        rootidx = fps.length-1;
      }
      this.logger.warn("Got a private root cert. Ignoring domain "
               + domain + " with root " + fps[rootidx]);
      return;
    }

    if (fps[0] in this.already_submitted) {
      this.logger.warn("Already submitted cert for " + domain + ". Ignoring");
      return;
    }

    for (var i = 0; i < certArray.length; i++) {
      var len = {}; 
      var derData = certArray[i].getRawDER(len);
      base64Certs.push(btoa(derData));
    }

    // TODO: Server ip??
    var reqParams = [];
    reqParams.push("domain=" + domain);
    reqParams.push("server_ip=-1");
    //reqParams.push("fplist=" + this.compatJSON.encode(fps));
    reqParams.push("certlist=" + this.compatJSON.encode(base64Certs));
    reqParams.push("client_asn=" + this.client_asn); 
    reqParams.push("private_opt_in=1");

    var params = reqParams.join("&") + "&padding=0";
    var tot_len = 8192;

    this.logger.warn("Submitting cert for " + domain);
    this.logger.warn("submit_cert params: " + params);

    // Pad to exp scale. This is done because the distribution of cert sizes
    // is almost certainly pareto, and definitely not uniform.
    for (tot_len = 8192; tot_len < params.length; tot_len*=2);

    while (params.length != tot_len) {
      params += "0";
    }

    this.logger.warn("Padded params: "+params);

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
