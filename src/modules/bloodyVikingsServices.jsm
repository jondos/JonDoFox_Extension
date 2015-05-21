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

if ("undefined" == typeof(BloodyVikings)) {
  Cu.import("resource://jondofox/bloodyVikingsNamespace.jsm");
}

if ("undefined" == typeof(BloodyVikings.Utils)) {
  Cu.import("resource://jondofox/bloodyVikingsUtils.jsm");
}

BloodyVikings.Service = function(name, url, infoUrl, languages, 
  defaultLanguage, getAddress, recommended) {

  this._name              = name;
  this._url               = url;
  this._infoUrl           = infoUrl;
  this._languages         = languages;
  this._defaultLanguage   = defaultLanguage;
  this._getAddress        = getAddress || this.simpleGetAddress;
  this._recommended       = Boolean(recommended);

  BloodyVikings.Services.addService(this);
};

BloodyVikings.Service.prototype = {

  _name           : null,
  _url            : null,
  _infoUrl        : null,
  _languages      : null,
  _defaultLanguage: null,
  _getAddress     : null,
  _recommended    : null,

  get name() {
      return this._name;
  },

  get url() {
      return this._url;
  },

  get infoUrl() {
    return BloodyVikings.Utils.formatStr(this._infoUrl,
           {lang: this.chooseLanguage()});
  },

  get languages() {
    return this._languages;
  },
    
  get defaultLanguage() {
    return this._defaultLanguage;
  },

  get getAddress() {
    return this._getAddress;
  },

  get recommended() {
    return this._recommended;
  },

  chooseLanguage: function() {
    if (!this._languages) {
      return null;
    }

    let lang = BloodyVikings.Utils.getLanguage();

    if (!this._languages[lang]) {
      lang = this._defaultLanguage;
    }

    return this._languages[lang];
  },

  getInboxUrl: function(args) {
    if (!args) {
      args = {};
    }

    args.lang = this.chooseLanguage();

    return BloodyVikings.Utils.formatStr(this._url, args);
  },

  openMailboxTab: function(gBrowser, args) {
    let tab;
    let url = this.getInboxUrl(args);

    if (BloodyVikings.Utils.atLeastAppVersion('3.6')) {
      tab = gBrowser.addTab(url, {relatedToCurrent: true});
    } else {
      tab = gBrowser.addTab(url);
    }

    return gBrowser.getBrowserForTab(tab);
  },
    
  simpleGetAddress: function(gBrowser, callbackSuccess, callbackError) {
    let inboxAlias = BloodyVikings.Utils.createRandomString(20);
    let domain = this._name;

    this.openMailboxTab(gBrowser, {alias: inboxAlias});

    callbackSuccess(inboxAlias + "@" + domain, 
      this.getInboxUrl({alias: inboxAlias}));
  }
};

BloodyVikings.Services = {

  addService: function(service) {
    if (!this.serviceList) {
      this.serviceList = {};
    }

    this.serviceList[service.name] = service;
  },

  getService: function(id) {
    return this.serviceList[id];
  },

  serviceList: null
};

function initServices() {

  new BloodyVikings.Service (
    "10minutemail.com",
    "http://10minutemail.com/10MinuteMail/index.html",
    "http://10minutemail.com/10MinuteMail/privacy.html",
    null,
    'en',
    function(gBrowser, callbackSuccess, callbackError) {
      let cookieManager = Cc["@mozilla.org/cookiemanager;1"].
                          getService(Ci.nsICookieManager);
      cookieManager.remove(this._name, "JSESSIONID", "/", false);
            
      let mailboxTab = this.openMailboxTab(gBrowser);

      mailboxTab.addEventListener("DOMContentLoaded",
        function() {
          mailboxTab.removeEventListener("DOMContentLoaded", 
	    arguments.callee, true);
          try {
            let emailNode = mailboxTab.contentDocument.
	      getElementById("addyForm:addressSelect");
            let email = emailNode.value;

            if (!BloodyVikings.Utils.isEmail(email)) {
              throw new BloodyVikings.Utils.
	        IncompatibilityException("Couldn't locate e-mail address");
            }

            let sessionCookie = /\b(JSESSIONID=[^;]+)/.exec(mailboxTab.
	      contentDocument.cookie);
                     
            if (sessionCookie) {
              sessionCookie = sessionCookie[1];
            }
                        
            callbackSuccess(email, mailboxTab.contentDocument.URL, 
		{url: "http://10minutemail.com/", cookie: sessionCookie});
          } catch(e) {
            callbackError("10minutemail.com", e);
          }
        }, true);
    },
    true
  );

  new BloodyVikings.Service (
    "anonbox.net",
    "https://anonbox.net/${lang}/",
    "https://anonbox.net/index.${lang}.html",
    {en: 'en', de: 'de', es: 'es', fr: 'fr', ru: 'ru'},
    'en',
    function(gBrowser, callbackSuccess, callbackError) {
      let mailboxTab = this.openMailboxTab(gBrowser);

      mailboxTab.addEventListener("DOMContentLoaded",
        function() {
          mailboxTab.removeEventListener("DOMContentLoaded", 
	    arguments.callee, true);
          try {
            let emailNode, urlNode;

            // We do not want the JavaScript version. Therefore,
            // we do not use [emailNode,,urlNode] but 
            [emailNode,urlNode] = mailboxTab.contentDocument.
	      getElementsByTagName("dd");
            let email = emailNode.firstChild.textContent;
            let url = urlNode.firstChild.getElementsByTagName("a")[0].
	      getAttribute("href");

            if (!BloodyVikings.Utils.isEmail(email)) {
              throw new BloodyVikings.Utils.
	        IncompatibilityException("Couldn't locate e-mail address");
            }

            if (!BloodyVikings.Utils.isURL(url)) {
              throw new BloodyVikings.Utils.
		IncompatibilityException("Couldn't locate URL");
	    }

            callbackSuccess(email, url);
            mailboxTab.loadURI(url);
          } catch (e) {
            callbackError("anonbox.net", e);
          }
        }, true);
    },
    true
  );

  new BloodyVikings.Service (
        "dispostable.com",
        "http://www.dispostable.com/inbox/${alias}/",
        "http://www.dispostable.com/",
        null,
        'en',
        null
  );


  new BloodyVikings.Service (
    "mailforspam.com",
    "http://www.mailforspam.com/mail/${alias}",
    "http://www.mailforspam.com/lang/${lang}",
    {en: 'en', de: 'de', ru: 'ru', uk: 'uk'},
    'en',
    function(gBrowser, callbackSuccess, callbackError) {
      this.simpleGetAddress(gBrowser, callbackSuccess, callbackError);
    }
  );

}

initServices();
