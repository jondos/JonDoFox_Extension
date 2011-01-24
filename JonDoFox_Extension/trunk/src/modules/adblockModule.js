// The following code is mainly written by Wladimir Palant. Therefore,
// although it is heavily adapted to fit the purposes of JonDoFox, it is 
// shipped with the following license:

/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Adblock Plus.
 *
 * The Initial Developer of the Original Code is
 * Wladimir Palant.
 * Portions created by the Initial Developer are Copyright (C) 2006-2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

"use strict";

var EXPORTED_SYMBOLS = ["shouldLoad", "shouldProcess", "adBlock"];

var Ci = Components.interfaces;
var Cc = Components.classes;
const ACCEPT = Ci.nsIContentPolicy.ACCEPT;
const BLOCK = Ci.nsIContentPolicy.REJECT_REQUEST;

var shouldLoad = function(aContentType, aContentLocation, aRequestOrigin, 
    aContext, aMimeTypeGuess, aExtra) {

  var wnd;
  var location;

  if (!aContext) {
    return ACCEPT;
  }

  wnd = adBlock.utils.getWindow(aContext);
  if (!wnd) {
    return ACCEPT;
  }

  location = adBlock.utils.unwrapURL(aContentLocation); 

  if (aContentType === adBlock.type.DOCUMENT || !adBlock.utils.
      isBlockableScheme(location)) {
    return ACCEPT;
  }
  // Ignore standalone objects
  if (aContentType === adBlock.type.OBJECT && aContext.ownerDocument &&
      !/^text\/|[+\/]xml$/.text(aContext.ownerDocument.contentType)) {
    return ACCEPT;
  }

  if (!(aContentType in adBlock.typeDescr)) {
    aContentType = adBlock.type.OTHER;
  }

  if (adBlock.processNode(wnd, aContext, aContentType, location, false)) {
    return ACCEPT;
  } else {
    return BLOCK;
  }
};

var shouldProcess = function(aContentType, aContentLocation, aRequestOrigin,
    aContext, aMimeType, aExtra) {
  return BLOCK;
};

var adBlock = {
  type: {},
  typeDescr: {},
  whitelistSchemes : [],
  whitelistMatcher: null,
  blacklistMatcher: null,
  filter: null,

  init: function() {
    Components.utils.import("resource://jondofox/adblockFilter.js", this);
    Components.utils.import("resource://jondofox/adblockMatcher.js", this); 

    var types = ["OTHER", "SCRIPT", "IMAGE", "STYLESHEET", "OBJECT", 
      "SUBDOCUMENT", "DOCUMENT", "XBL", "PING", "XMLHTTPREQUEST", 
      "OBJECT_SUBREQUEST", "DTD", "FONT", "MEDIA"]; 
    this.whiteListSchemes = ["about","chrome","file","irc","moz-safe-about",
      "news","resource","snews","x-jsd","addbook","cid","imap","mailbox",
      "nntp","pop","data","javascript","moz-icon"];
    var iface = Ci.nsIContentPolicy;

    for each (var typeName in types) {
      if ("TYPE_" + typeName in iface) {
	this.type[typeName] = iface["TYPE_" + typeName];
	this.typeDescr[this.type[typeName]] = typeName;
      }
    }
    this.blacklistMatcher = new this.Matcher();
    this.whitelistMatcher = new this.Matcher();
  },

  processNode : function(wnd, aContext, aContentType, location, collapse) {
    var match;
    var locationText;
    var topWnd = wnd.top;
    if (!topWnd || !topWnd.location || !topWnd.location.href) {
      return true;
    }

    match = null;
    locationText = location.spec;
    
    return true;

  },

  utils: {
    getWindow: function(aNode) {
      if (aNode && aNode.nodeType !== Ci.nsIDOMNode.DOCUMENT_NODE) {
        aNode = aNode.ownerDocument;
      }
      if (!aNode || aNode.nodeType !== Ci.nsIDOMNode.DOCUMENT_NODE) {
        return null;
      }
      return aNode.defaultView; 
    },

    unwrapURL: function(aURL) {
      if (!(aURL instanceof Ci.nsIURI)) {
	aURL = this.makeURL(aURL);
      }
      try {
	switch (aURL.scheme) {
	  // The question is whether that code handles nested protocol 
	  // handlers well, e.g. URLs like 
	  // jar:view-source:http://example.com/foo.jar!/foo.html.
	  // view-source:http://svn.jondos.de/index.html gives back as path
	  // "http://svn.jondos.de/index.html" BUT the above mentioned URL
	  // gives "jar:view-source:http://example.com/foo.jar" back as path.
	  // But maybe that's enough as we need it only to compare schemes...
          case "view-source":
	    return adBlock.utils.unwrapURL(aURL.path);
	  case "wyciwyg":
	    return adBlock.utils.unwrapURL(aURL.path.replace(/^\/\/\d+\//,""));
          case "jar":
	    return adBlock.utils.unwrapURL(aURL.QueryInterface(Ci.nsIJARURI).
		JARFile);
	  default:
	    if (aURL instanceof Ci.nsIURI && aURL.ref) {
	      return this.makeURL(aURL.spec.replace(/#.*/, ""));
	    } else {
              return aURL;
	    }
        }
      } catch (e) {
	return aURL;
      }
    },

    makeURL: function(aURL) {
      try {
        return Cc['@mozilla.org/network/io-service;1'].
	  getService(CI.nsIIOService).newURI(aURL, null, null);
      } catch (e) {
	return null;
      }
    },

    isBlockableScheme: function(aURL) {
      return !(aURL.scheme in adBlock.whitelistSchemes);
    },

    normalizeFilter: function(text) {
    try{
      if (!text) {
        return text;
      }
      // Remove line breaks and such
      text = text.replace(/[^\S ]/g, "");

      if (/^\s*!/.test(text)) {
        // Don't remove spaces inside comments
        return text.replace(/^\s+/, "").replace(/\s+$/, "");
      }
      else if (adBlock.Filter.elemhideRegExp.test(text)) {
        // Special treatment for element hiding filters, 
	// right side is allowed to contain spaces
	// .split(..., 2) will cut off the end of the string
        /^(.*?)(#+)(.*)$/.test(text);
        var domain = RegExp.$1;
        var separator = RegExp.$2;
        var selector = RegExp.$3;
        return domain.replace(/\s/g, "") + separator + 
	  selector.replace(/^\s+/, "").replace(/\s+$/, "");
      }
      else {
        return text.replace(/\s/g, "");
      }
    } catch (e) {
      dump("Got an Exception in utils object: " + e);
    }
    }

  }

}
