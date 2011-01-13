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

var EXPORTED_SYMBOLS = ["Filter"];


var Filter = function() {

};

Filter.prototype = {

};

Filter.knownFilters = {__proto__: null};

Filter.elemhideRegExp = /^([^\/\*\|\@"!]*?)#(?:([\w\-]+|\*)((?:\([\w\-]+(?:[$^*]?=[^\(\)"]*)?\))*)|#([^{}]+))$/;

Filter.optionsRegExp = /\$(~?[\w\-]+(?:=[^,\s]+)?(?:,~?[\w\-]+(?:=[^,\s]+)?)*)$/;

Filter.fromText = function(text) {
  if (!/\S/.test(text)) {
    return null;
  }

  if (text in Filter.knownFilters) {
    return Filter.knownFilters[text];
  }

  var ret;
  if (Filter.elemhideRegExp.test(text)) {
    ret = ElemHideFilter.fromText(text, RegExp.$1, RegExp.$2, RegExp.$3, 
      RegExp.$4);
  } else {
    ret = RegExpFilter.fromText(text);
  }

  Filter.knownFilters[ret.text] = ret;
  return ret;
}

var RegExpFilter = function() {

};

RegExpFilter.prototype = {
  contentType: 0x7FFFFFFF 
};

RegExpFilter.typeMap = {
	OTHER: 1,
	SCRIPT: 2,
	IMAGE: 4,
	STYLESHEET: 8,
	OBJECT: 16,
	SUBDOCUMENT: 32,
	DOCUMENT: 64,
	BACKGROUND: 256,
	XBL: 512,
	PING: 1024,
	XMLHTTPREQUEST: 2048,
	OBJECT_SUBREQUEST: 4096,
	DTD: 8192,
	MEDIA: 16384,
	FONT: 32768,

	ELEMHIDE: 0x40000000
};

RegExpFilter.fromText = function(text)
{
  let constructor = BlockingFilter;
  let origText = text;

  if (text.indexOf("@@") === 0) {
    constructor = WhitelistFilter;
    text = text.substr(2);
  }

  let contentType = null;
  let matchCase = null;
  let domains = null;
  let thirdParty = null;
  let collapse = null;
  let options;
  if (Filter.optionsRegExp.test(text)) {
    options = RegExp.$1.toUpperCase().split(",");
    text = RegExp.leftContext;
    for each (let option in options) {
      let value;
      [option, value] = option.split("=", 2);
      option = option.replace(/-/, "_");
      if (option in RegExpFilter.typeMap) {
        if (contentType === null) {
          contentType = 0;
        }
        contentType |= RegExpFilter.typeMap[option];
      } else if (option[0] === "~" && option.substr(1) in 
	  RegExpFilter.typeMap) {
        if (contentType === null) {
          contentType = RegExpFilter.prototype.contentType;
	}
	contentType &= ~RegExpFilter.typeMap[option.substr(1)];
      }
      else if (option === "MATCH_CASE") {
        matchCase = true;
      } else if (option === "DOMAIN" && typeof value !== "undefined") {
        domains = value;
      } else if (option === "THIRD_PARTY") {
        thirdParty = true;
      } else if (option === "~THIRD_PARTY") {
        thirdParty = false;
      } else if (option === "COLLAPSE") {
        collapse = true;
      } else if (option === "~COLLAPSE") {
        collapse = false;
      }
    }
  }
  if (constructor === WhitelistFilter && 
      (contentType === null || (contentType & RegExpFilter.typeMap.DOCUMENT)) &&
      (!options || options.indexOf("DOCUMENT") < 0) && 
      !/^\|?[\w\-]+:/.test(text)) {
    // Exception filters shouldn't apply to pages by default unless they start 
    // with a protocol name
    if (contentType === null) {
      contentType = RegExpFilter.prototype.contentType;
    }
    contentType &= ~RegExpFilter.typeMap.DOCUMENT;
  }

  try {
    return new constructor(origText, text, contentType, matchCase, domains, 
	thirdParty, collapse);
  } catch (e) {
    return new InvalidFilter(text, e);
  }
}

function BlockingFilter(text, regexpSource, contentType, matchCase, domains, 
    thirdParty, collapse) {
  RegExpFilter.call(this, text, regexpSource, contentType, matchCase, domains, 
      thirdParty);

  this.collapse = collapse;
}

BlockingFilter.prototype =
{
	__proto__: RegExpFilter.prototype,

	/**
	 * Defines whether the filter should collapse blocked content. Can be null (use the global preference).
	 * @type Boolean
	 */
	collapse: null
};
