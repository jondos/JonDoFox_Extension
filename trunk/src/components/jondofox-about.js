//The following code allows a user to type about:jondofox into the browser bar
//to see our JonDoFox feature page. The code is retrived from:
//https://developer.mozilla.org/en/Code_snippets/JS_XPCOM section XPCOMUtils -
//About protocol handler. According to
//https://developer.mozilla.org/Project:Copyrights the license of the following 
//code is the MIT License which may be found here: 
//http://www.ibiblio.org/pub/Linux/LICENSES/mit.license  

//Minor modifications made by Georg Koppen, JonDos GmbH 2010.

//We could do the registration of the about:jondofox as well without using JS 
//code modules solely within the content folder in order to increase the startup
//time. (see the relevant code in Firesomething:
//https://addons.mozilla.org/en-US/firefox/addon/31/ that has to be patched
//(adding the getURIFlags function)) BUT: The huge disadvantage is that the 
//user would not be able to set about:jondofox as a startup page if she would
//want that because its load is triggered before the URL would be registered.

//ToDo: Incorpotate the following code better in our components system during
//the coming restructuring of this extension.


Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
const Cc = Components.classes;
const Ci = Components.interfaces;

var AboutJondofox = function() {};

AboutJondofox.prototype = {
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

  QueryInterface: XPCOMUtils.generateQI([Ci.nsISupports, Ci.nsIAboutModule])
};

// XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
// XPCOMUtils.generateNSGetModule is for Mozilla 1.9.1/1.9.2 (FF 3.5/3.6).

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([AboutJondofox]);
else
    var NSGetModule = XPCOMUtils.generateNSGetModule([AboutJondofox]);
