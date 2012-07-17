/*
 * Bloody Vikings!
 * Copyright (C) 2009, 2010, 2011  Florian Fieber
 *
 * This file is part of Bloody Vikings.
 *
 * Bloody Vikings is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Bloody Vikings is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Bloody Vikings.  If not, see <http://www.gnu.org/licenses/>
 * or the GPL-LICENSE file at the root of this installation.
 */

// Minor modifications by Georg Koppen, JonDos GmbH 2011

let EXPORTED_SYMBOLS = ["BloodyVikings"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

if ("undefined" === typeof(BloodyVikings)) {
  Cu.import("resource://jondofox/bloodyVikingsNamespace.jsm");
}

BloodyVikings.Utils = {

  createRandomString: function(length) {
    let chars  = "abcdefghijklmnopqrstuvwxyz0123456789";
    let rndStr = "";

    for (let i = 0; i < length; i++) {
      rndStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return rndStr;
  },

  formatStr: function(str, args) {
    let formattedStr = str;

    for (let arg in args) {
      formattedStr = formattedStr.replace("${" + arg + "}", args[arg]);
    }

    return formattedStr;
  },

  getLanguage: function() {
    let window = Cc["@mozilla.org/embedcomp/window-watcher;1"].
                 getService(Ci.nsIWindowWatcher).
                 activeWindow;
    let lang = window.navigator.language.match(/([^-]+)(-.+)?/)[1];
    return lang;
  },

  isEmail: function(arg) {
    let isEmail = /^.+@.+$/.test(arg);
    return isEmail;
  },

  isURL: function(arg) {
    let isURL = /^https?:\/\/.+$/.test(arg);
    return isURL;
  },

  IncompatibilityException: function(message) {
     this.message = message;
     this.name = "IncompatibilityException";
  },

  atLeastAppVersion: function(version) {
    let appInfo = Cc["@mozilla.org/xre/app-info;1"].
                  getService(Ci.nsIXULAppInfo);
    let versionComparator = Cc["@mozilla.org/xpcom/version-comparator;1"].
                            getService(Ci.nsIVersionComparator);
    return (versionComparator.compare(appInfo.version, version) >= 0);
  }
};
