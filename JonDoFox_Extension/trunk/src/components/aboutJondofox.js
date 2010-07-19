//The following code allows a user to type about:jondofox into the browser bar
//to see our JonDoFox feature page. The code is retrived from:
//https://developer.mozilla.org/en/Code_snippets/JS_XPCOM section XPCOMUtils -
//About protocol handler. According to
//https://developer.mozilla.org/Project:Copyrights the license of the following 
//code is the MIT License which may be found here: 
//http://www.ibiblio.org/pub/Linux/LICENSES/mit.license  

//Minor modifications made by Georg Koppen, JonDos GmbH 2010.

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
const Cc = Components.classes;
const Ci = Components.interfaces;

function aboutJondofox() {}
aboutJondofox.prototype = {
  newChannel : function(aURI) {
    if (aURI.spec !== "about:jondofox") {
      return;
    }
    var ios = Cc["@mozilla.org/network/io-service;1"].
	      getService(Ci.nsIIOService);
    var channel = ios.
    newChannel("chrome://jondofox/content/jondofox-features.xhtml", null, null);
    channel.originalURI = aURI;
    return channel;
  },

  getURIFlags: function(aURI) {
    return Ci.nsIAboutModule.URI_SAFE_FOR_UNTRUSTED_CONTENT;
  },

  classDescription: "JonDoFox Feature Page",
  classID: Components.ID("{8294337b-0ff6-4dcc-a45f-59b549922932}"),
  contractID: "@mozilla.org/network/protocol/about;1?what=jondofox",
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule])
}

function NSGetModule(aCompMgr, aFileSpec) {
  return XPCOMUtils.generateModule([aboutJondofox]);
}
