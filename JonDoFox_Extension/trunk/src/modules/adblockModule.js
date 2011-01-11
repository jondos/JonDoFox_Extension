// The following code is mainly written by Wladimir Palant. Although it is 
// heavily adapted to fit the purposes of JonDoFox it is shipped with the
// following license:
//
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

const ACCEPT = Components.interfaces.nsIContentPolicy.ACCEPT;
const BLOCK = Components.interfaces.nsIContentPolicy.REJECT_REQUEST;

var shouldLoad = function(aContentType, aContentLocation, aRequestOrigin, 
    aContext, aMimeTypeGuess, aExtra) {
     
  return ACCEPT;
};

var shouldProcess = function(aContentType, aContentLocation, aRequestOrigin,
    aContext, aMimeType, aExtra) {
  return BLOCK;
};

var adBlock = {
  type: {},

  init: function() {
    var types = ["OTHER", "SCRIPT", "IMAGE", "STYLESHEET", "OBJECT", 
      "SUBDOCUMENT", "DOCUMENT", "XBL", "PING", "XMLHTTPREQUEST", 
      "OBJECT_SUBREQUEST", "DTD", "FONT", "MEDIA"]; 
    var iface = Components.interfaces.nsIContentPolicy;
    for each (var typeName in types) {
      if ("TYPE_" + typeName in iface) {
	this.type[typeName] = iface["TYPE_" + typeName];
      }
    }
  },

  processNode : function() {

  }

}
