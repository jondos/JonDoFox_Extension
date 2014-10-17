/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * ''Certificate Patrol'' was conceived by Carlo v. Loesch and
 * implemented by Aiko Barz, Gabor Adam Toth, Carlo v. Loesch and Mukunda
 * Modell.
 *
 * http://patrol.psyced.org
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
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// The original Certificate Patrol code was slightly adapted by Georg Koppen,
// JonDos GmbH 2010. The wildcard certificate functionality was developed by
// Georg Koppen, JonDos GmbH 2010.

var CertPatrol = {

  // Main
  onLoad: function() {
    this.initialized = true;
    this.jdfManager = Cc['@jondos.de/jondofox-manager;1'].
	            getService().wrappedJSObject;
    // We check whether the original Certificate Patrol extension should be
    // used. If so, we avoid using as much of our adapted CertPatrol code as
    // possible, especially we try to avoid registering event listeners twice
    // (those in our init() code additionally to the ones in the CertPatrol
    // init() code).
    if (!jdfManager.certPatrol) {
      Components.utils.import("resource://jondofox/jdfUtils.jsm", this);
      this.prefsHandler = Cc['@jondos.de/preferences-handler;1'].
                    getService().wrappedJSObject;
      this.version = prefsHandler.
        getStringPref("extensions.jondofox.last_version");
      this.dbinit();
      this.init();
    }
  },

  onUnload: function() {
    this.unregisterObserver("http-on-examine-response");
  },

  // DB init
  dbinit: function() {
    this.dbh = null;
    this.dbselect = null;
    this.dbinsert = null;
    this.dbupdate = null;

    try {
      var file = Cc["@mozilla.org/file/directory_service;1"]
                 .getService(Ci.nsIProperties).get("ProfD", Ci.nsIFile);
      var storage = Cc["@mozilla.org/storage/service;1"]
                    .getService(Ci.mozIStorageService);
      file.append("CertPatrol.sqlite");

      // Must be checked before openDatabase()
      var exists = file.exists();

      // Now, CertPatrol.sqlite exists
      this.dbh = storage.openDatabase(file);

      // CertPatrol.sqlite initialization
      if (!exists) {
        this.dbh.executeSimpleSQL("CREATE TABLE version (version INT," +
          " extversion TEXT)");
        this.dbh.executeSimpleSQL("INSERT INTO version (version," +
          " extversion) VALUES (3, '" + this.version + "')");
	this.dbh.executeSimpleSQL("CREATE TABLE certificates ("+
	  "  host VARCHAR, commonName VARCHAR, organization VARCHAR, organizationalUnit VARCHAR, "+
          "  serialNumber VARCHAR, emailAddress VARCHAR, notBeforeGMT VARCHAR, notAfterGMT VARCHAR, "+
          "  issuerCommonName VARCHAR, issuerOrganization VARCHAR, issuerOrganizationUnit VARCHAR, "+
          "  md5Fingerprint VARCHAR, sha1Fingerprint VARCHAR, "+
          "  issuerMd5Fingerprint VARCHAR, issuerSha1Fingerprint VARCHAR, "+
          "  cert BLOB, flags INT, stored INT)");
      } else {
        var stmt = this.dbh.createStatement("SELECT version FROM version");
        stmt.executeStep();
        var version = stmt.row.version;
        stmt.reset();

        if (version < 2) {
          this.dbh.executeSimpleSQL("ALTER TABLE certificates ADD COLUMN issuerMd5Fingerprint VARCHAR");
          this.dbh.executeSimpleSQL("ALTER TABLE certificates ADD COLUMN issuerSha1Fingerprint VARCHAR");
          this.dbh.executeSimpleSQL("ALTER TABLE certificates ADD COLUMN cert BLOB");
          this.dbh.executeSimpleSQL("UPDATE version SET version = 2");
        }

        if (version < 3) {
          this.dbh.executeSimpleSQL("ALTER TABLE certificates ADD COLUMN flags INT");
          this.dbh.executeSimpleSQL("ALTER TABLE certificates ADD COLUMN stored INT");
	  this.dbh.executeSimpleSQL("UPDATE version SET version = 3");
        }

        var extversion;
        try {
          var stmt = this.dbh.createStatement("SELECT extversion FROM version");
           stmt.executeStep();
           extversion = stmt.row.extversion;
           stmt.reset();
        } catch (e) {
	  this.dbh.
            executeSimpleSQL("ALTER TABLE version ADD COLUMN extversion TEXT");
	}

        // ToDo: Does not work right now. extversion is always null if
        // migrating from older database format. That's an upstream bug.
        if (extversion && this.version && extversion != this.version) {
          this.dbh.executeSimpleSQL("UPDATE version SET extversion='" +
            this.version + "'");
	}
      }

      // Prepared statements
      this.dbselect = this.dbh.createStatement(
      "SELECT * FROM certificates where host=?1");
      this.dbselectWildcard = this.dbh.createStatement(
      "SELECT * FROM certificates where md5Fingerprint=?12 AND sha1Fingerprint=?13");		      
      this.dbinsert = this.dbh.createStatement(
      "INSERT INTO certificates (host, commonName, organization," +
        " organizationalUnit, serialNumber, emailAddress, notBeforeGMT," +
        " notAfterGMT, issuerCommonName, issuerOrganization," +
        " issuerOrganizationUnit, md5Fingerprint, sha1Fingerprint," +
        " issuerMd5Fingerprint, issuerSha1Fingerprint, cert, flags, stored)" +
        " VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18)");
      this.dbupdate = this.dbh.createStatement(
      "UPDATE certificates SET commonName=?2, organization=?3," +
      " organizationalUnit=?4, serialNumber=?5, emailAddress=?6," +
      " notBeforeGMT=?7, notAfterGMT=?8, issuerCommonName=?9," +
      " issuerOrganization=?10, issuerOrganizationUnit=?11," +
      " md5Fingerprint=?12, sha1Fingerprint=?13, issuerMd5Fingerprint=?14," +
      " issuerSha1Fingerprint=?15, cert=?16, flags=?17, stored=?18" +
      " WHERE host=?1");
    }
    catch(err) {
      this.warn("Error initializing SQLite operations: "+ err);
    }
  },

  // Application trigger
  init: function() {
    // Firefox
    this.registerObserver("http-on-examine-response"); 
  },

  registerObserver: function(topic) {
    var observerService = Cc["@mozilla.org/observer-service;1"].
      getService(Ci.nsIObserverService);
    observerService.addObserver(this, topic, false);
  },

  unregisterObserver: function(topic) {
    var observerService = Cc["@mozilla.org/observer-service;1"].
      getService(Ci.nsIObserverService);
    observerService.removeObserver(this, topic);
  }, 

  observe: function(channel, topic, data) {
    channel.QueryInterface(Ci.nsIHttpChannel);
    var host = channel.URI.hostPort;

    var si = channel.securityInfo;
    if (!si) return;

    var nc = channel.notificationCallbacks;
    if (!nc && channel.loadGroup) {
      nc = channel.loadGroup.notificationCallbacks;
    }
    if (!nc) return;

    try {
      var win = nc.getInterface(Ci.nsIDOMWindow);
    } catch (e) {
      return; // no window for e.g. favicons
    }
    if (!win.document) return;

    // Assuming lots of JonDoFox users have CertPatrol enabled this seems the
    // right place (i.e. trade-off) to check for it actually...
    if (!CertPatrol.prefsHandler.
        getBoolPref('extensions.jondofox.certpatrol_enabled')) {
      return;
    } 

    var browser;
    browser = gBrowser.getBrowserForDocument(win.top.document);
    // We get notifications for a request in all of the open windows
    // but browser is set only in the window the request is originated from,
    // browser is null for favicons too.
    if (!browser) return;

    si.QueryInterface(Ci.nsISSLStatusProvider);
    var st = si.SSLStatus;
    if (!st) return;

    st.QueryInterface(Ci.nsISSLStatus);
    var cert = st.serverCert;
    if (!cert) return;

    var obj = browser;
    // store certs in the browser object so we can
    // show only one notification per host for a browser tab
    var key = [host, cert.md5Fingerprint, cert.sha1Fingerprint].join('|');
    if (obj.__certs && obj.__certs[key] && cert.equals(obj.__certs[key])) {
      return;
    }
    obj.__certs = obj.__certs || {};
    obj.__certs[key] = cert;   

    // The interesting part
    var certobj = this.newCertObj();
    certobj.host = host;
    certobj.ciphername = st.cipherName;
    certobj.keyLength = st.keyLength;
    certobj.secretKeyLength = st.secretKeyLength;
    this.fillCertObj(certobj.now, cert);

    this.certCheck(browser, certobj); 
  },

  // helper functions for advanced patrol
  isodate: function(tim) {
    if (isNaN(tim)) {
      var iso = tim.replace(/^(\d\d)\/(\d\d)\/(\d+)/, "$3-$1-$2");
      // upcoming Y3K bug, but you must delete this line before 2020
      if (iso != tim) {
	  if (iso[0] != '2') iso = "20"+ iso;
	  return iso;
      }
    }
    var d = new Date(tim / 1000);
    return d.toLocaleFormat("%Y-%m-%d %H:%M:%S"); 
  },

  timedelta: function(tim) {
    if (!isNaN(tim)) tim /= 1000;
    var d = new Date(tim);
    // Y2K bug in X.509 and javascript...
    if (d.getFullYear() < 2000) d.setFullYear(100 + d.getFullYear());
    var now = new Date();
    //alert("Now is "+ now.getTime() +" and cert is "+ d.getTime());
    return d.getTime() - now.getTime();
  },
  daysdelta: function(td) {
    td = Math.round(td / 86400000);	// milliseconds per day
    return " ("+ this.jdfUtils.formatString(td < 0 ?
	 "daysPast" : "daysFuture", [td < 0 ? -td : td]) +")";
  },

  byteArrayToString: function(ba) {
    var s = "";
    for (var i = 0; i < ba.length; i++) {
      s += String.fromCharCode(ba[i]);
    }
    return s;
  },

  byteArrayToCert: function(ba) {
    var c = "@mozilla.org/security/x509certdb;1", i= "nsIX509CertDB";
    return Cc[c].getService(Ci[i]).constructX509FromBase64(window.btoa(this.
      byteArrayToString(ba.value)));
  }, 

  newCertObj: function() {
    return {
      threat: 0,
      flags: 0,
      warn:{},
      host: "",
      now:{
        commonName:"",
        organization:"",
        organizationalUnit:"",
        serialNumber:"",
        emailAddress:"",
        notBeforeGMT:"",
        notAfterGMT:"",
        issuerCommonName:"",
        issuerOrganization:"",
        issuerOrganizationUnit:"",
        md5Fingerprint:"",
        sha1Fingerprint:"",
        issuerMd5Fingerprint: "",
        issuerSha1Fingerprint: "",
        cert: null 
      },
      old:{
        commonName:"",
        organization:"",
        organizationalUnit:"",
        serialNumber:"",
        emailAddress:"",
        notBeforeGMT:"",
        notAfterGMT:"",
        issuerCommonName:"",
        issuerOrganization:"",
        issuerOrganizationUnit:"",
        md5Fingerprint:"",
        sha1Fingerprint:"",
        issuerMd5Fingerprint: "",
        issuerSha1Fingerprint: "",
        cert: null 
      },
      lang:{
        newEvent:this.jdfUtils.getString("newEvent"),
        changeEvent:this.jdfUtils.getString("changeEvent"),
	pbmEvent:this.jdfUtils.getString("pbmEvent"),
        newCert:this.jdfUtils.getString("newCert"),
        oldCert:this.jdfUtils.getString("oldCert"),
        issuedTo:this.jdfUtils.getString("issuedTo"),
        issuedBy:this.jdfUtils.getString("issuedBy"),
        validity:this.jdfUtils.getString("validity"),
        fingerprints:this.jdfUtils.getString("fingerprints"),
        commonName:this.jdfUtils.getString("commonName"),
        organization:this.jdfUtils.getString("organization"),
        organizationalUnit:this.jdfUtils.getString("organizationalUnit"),
        serialNumber:this.jdfUtils.getString("serialNumber"),
        emailAddress:this.jdfUtils.getString("emailAddress"),
        notBeforeGMT:this.jdfUtils.getString("notBeforeGMT"),
        notAfterGMT:this.jdfUtils.getString("notAfterGMT"),
        md5Fingerprint:this.jdfUtils.getString("md5Fingerprint"),
        sha1Fingerprint:this.jdfUtils.getString("sha1Fingerprint"),
        viewDetails:this.jdfUtils.getString("viewDetails")  
      }
    };
  },

  fillCertObj: function(obj, cert) {
    obj.cert = cert;
    obj.notBeforeGMT = cert.validity.notBefore;
    obj.notAfterGMT = cert.validity.notAfter; 
    if (cert.issuer) {
      obj.issuerMd5Fingerprint = cert.issuer.md5Fingerprint;
      obj.issuerSha1Fingerprint = cert.issuer.sha1Fingerprint;
    } 
    var keys = [
	  "commonName", "organization", "organizationalUnit", "serialNumber",
	  "emailAddress", // "subjectAlternativeName",
	  "issuerCommonName", "issuerOrganization", "issuerOrganizationUnit",
	  "md5Fingerprint", "sha1Fingerprint" ]; 
    for (var i in keys) {
      obj[keys[i]] = cert[keys[i]]; 
    }
  },

  // Certificate check
  certCheck: function(browser, certobj) {
    var found = false;
    var now = certobj.now, old = certobj.old;
    var existingWildcardCert = false;

   // memory cache of last seen SHA1 - useful for private browsing
    if (this.last_sha1Fingerprint && 
        this.last_sha1Fingerprint === now.sha1Fingerprint) {
      return;
    } else {
      this.last_sha1Fingerprint = now.sha1Fingerprint;
    }

    var pbs = Cc["@mozilla.org/privatebrowsing;1"];
    if (pbs) {
      pbs = Cc["@mozilla.org/privatebrowsing;1"].getService(Ci.
        nsIPrivateBrowsingService);
      this.pbm = pbs.privateBrowsingEnabled;
    }
 
    // Get certificate
    var stmt = this.dbselect;
    try {
      stmt.bindUTF8StringParameter(0, certobj.host);
      if (stmt.executeStep()) {
        found = true;
        old.commonName = stmt.getUTF8String(1);
        old.organization = stmt.getUTF8String(2);
        old.organizationalUnit = stmt.getUTF8String(3);
        old.serialNumber = stmt.getUTF8String(4);
        old.emailAddress = stmt.getUTF8String(5);
        old.notBeforeGMT = stmt.getUTF8String(6);
        old.notAfterGMT = stmt.getUTF8String(7);
        old.issuerCommonName = stmt.getUTF8String(8);
        old.issuerOrganization = stmt.getUTF8String(9);
        old.issuerOrganizationUnit = stmt.getUTF8String(10);
        old.md5Fingerprint = stmt.getUTF8String(11);
        old.sha1Fingerprint = stmt.getUTF8String(12);
        old.issuerMd5Fingerprint = stmt.getUTF8String(13); 
        old.issuerSha1Fingerprint = stmt.getUTF8String(14);
        var blob = {};
        stmt.getBlob(15, {}, blob);
        if (blob.value.length) {
          old.cert = this.byteArrayToCert(blob);
        }
        // Both not used by us yet.
        certobj.flags = stmt.getInt64(16);
        old.stored = stmt.getInt64(17) * 1000; 
      }
    } catch(err) {
      this.warn("Error trying to check certificate: "+ err);
    } finally {
      stmt.reset();
    }

    // The certificate changed 
    if ( found && (
         old.sha1Fingerprint != now.sha1Fingerprint 
       )) {
      // Let's check whether we have a wildcard certificate and whether we 
      // have the same certificare already stored...
      // We have to do this here, before the certificate is updated. Otherwise,
      // the updated wildcard certificate is obviously always found and the 
      // test fails...
      existingWildcardCert = this.wildcardCertCheck(now.commonName,
		      now.sha1Fingerprint);
      if (!this.pbm) {
        // DB update
        stmt = this.dbupdate;
        var cert = now.cert;
        try {
          stmt.bindUTF8StringParameter( 0, certobj.host);
          stmt.bindUTF8StringParameter( 1, cert.commonName);
          stmt.bindUTF8StringParameter( 2, cert.organization);
          stmt.bindUTF8StringParameter( 3, cert.organizationalUnit);
          stmt.bindUTF8StringParameter( 4, cert.serialNumber);
          stmt.bindUTF8StringParameter( 5, cert.emailAddress);
          stmt.bindUTF8StringParameter( 6, cert.validity.notBefore);
          stmt.bindUTF8StringParameter( 7, cert.validity.notAfter);
          stmt.bindUTF8StringParameter( 8, cert.issuerCommonName);
          stmt.bindUTF8StringParameter( 9, cert.issuerOrganization);
          stmt.bindUTF8StringParameter(10, cert.issuerOrganizationUnit);
          stmt.bindUTF8StringParameter(11, cert.md5Fingerprint);
          stmt.bindUTF8StringParameter(12, cert.sha1Fingerprint);
          if (cert.issuer) {
            stmt.bindUTF8StringParameter(13, cert.issuer.md5Fingerprint);
            stmt.bindUTF8StringParameter(14, cert.issuer.sha1Fingerprint);
          }
          var der = cert.getRawDER({});
          stmt.bindBlobParameter(15, der, der.length);
          stmt.bindInt64Parameter(16, certobj.flags);
          stmt.bindInt64Parameter(17, parseInt(new Date().getTime() / 1000)); 
          stmt.execute();
        } catch(err) {
          this.warn("Error trying to update certificate: "+ err);
        } finally {
          stmt.reset();
        }
      }

      // If we found an already updated wildcard cert then do not show the 
      // changed cert dialog as we do not really have a newly updated cert.
      if (existingWildcardCert) {
        return;
      } 

      // Try to make some sense out of the certificate changes
      if (now.commonName != old.commonName) {
        certobj.warn.commonName = true;
	certobj.threat += 2;
      } 
      var natd = this.timedelta(old.notAfterGMT);
      if (natd <= 0) {
        certobj.warn.notAfter_expired = true;
      } else if (natd > 7777777777) {
	certobj.threat++;
        certobj.warn.notAfter_notdue = true;
      } else if (natd > 0) {
        // certificate due sometime soonish
        certobj.warn.notAfter_due = true;
      }
      // checking NEW certificate here..
      var td = this.timedelta(now.notBeforeGMT);
      if (td > 0) {
        // new cert is not valid yet
        certobj.warn.notBefore = true;
	certobj.threat += 2;
      } 
      if (now.issuerCommonName != old.issuerCommonName ||
          now.issuerOrganization != old.issuerOrganization) {
        certobj.warn.issuerCommonName = true
	certobj.threat ++;
      }

      if (certobj.threat > 3) {
        certobj.threat = 3;
      }
      certobj.lang.changeEvent += " " + this.jdfUtils.getString("threatLevel_" +
		           certobj.threat);
      old.notBeforeGMT= this.isodate(old.notBeforeGMT) +
				this.daysdelta(this.timedelta(old.notBeforeGMT));
      old.notAfterGMT = this.isodate(old.notAfterGMT) +
				this.daysdelta(natd);
      now.notBeforeGMT= this.isodate(now.notBeforeGMT) +
				this.daysdelta(this.timedelta(now.notBeforeGMT));
      now.notAfterGMT = this.isodate(now.notAfterGMT) +
				this.daysdelta(this.timedelta(now.notAfterGMT));

      this.outchange(browser, certobj);

    // New certificate
    } else if (!found) {
      if (!this.pbm) {
        // Now, store data
        stmt = this.dbinsert;
        try {
          stmt.bindUTF8StringParameter( 0, certobj.host);
          stmt.bindUTF8StringParameter( 1, now.commonName);
          stmt.bindUTF8StringParameter( 2, now.organization);
          stmt.bindUTF8StringParameter( 3, now.organizationalUnit);
          stmt.bindUTF8StringParameter( 4, now.serialNumber);
          stmt.bindUTF8StringParameter( 5, now.emailAddress);
          stmt.bindUTF8StringParameter( 6, now.notBeforeGMT);
          stmt.bindUTF8StringParameter( 7, now.notAfterGMT);
          stmt.bindUTF8StringParameter( 8, now.issuerCommonName);
          stmt.bindUTF8StringParameter( 9, now.issuerOrganization);
          stmt.bindUTF8StringParameter(10, now.issuerOrganizationUnit);
          stmt.bindUTF8StringParameter(11, now.md5Fingerprint);
          stmt.bindUTF8StringParameter(12, now.sha1Fingerprint);
          stmt.bindUTF8StringParameter(13, now.issuerMd5Fingerprint);
          stmt.bindUTF8StringParameter(14, now.issuerSha1Fingerprint);
          var der = now.cert.getRawDER({});
          stmt.bindBlobParameter(15, der, der.length);
          stmt.bindInt64Parameter(16, 0);
          stmt.bindInt64Parameter(17, parseInt(new Date().getTime() / 1000)); 
          stmt.execute();
        } catch(err) {
          this.warn("Error trying to insert certificate for " + certobj.host +
                  ": " + err);
        } finally {
          stmt.reset();
        }
      }
      now.notBeforeGMT = this.isodate(now.notBeforeGMT) +
				this.daysdelta(this.timedelta(now.
				notBeforeGMT));
      now.notAfterGMT = this.isodate(now.notAfterGMT) +
				this.daysdelta(this.timedelta(now.
				notAfterGMT));
      this.outnew(browser, certobj);
    }
  },

  wildcardCertCheck: function(commonName, sha1Fingerprint) {
    var stmt;
    // First, we check whether we have a wildcard certificate at all. If not
    // just return false and the new cert dialog will be schown. But even if
    // we have one but no SHA1 fingerprint we should show it for security's
    // sake...
    if (commonName.charAt(0) === '*' && sha1Fingerprint) {
      // We got one, check now if we have it already. If not, return false and
      // the certificate will be shown. Otherwise, return yes and the new cert
      // dialog will be omitted. 
      try {
        stmt = this.dbselectWildcard;
        stmt.bindUTF8StringParameter(12, sha1Fingerprint);
        if (stmt.executeStep()) {
	  return true; 
        } else {
          // This case could occur as well if we have *.example.com and 
	  // foo.example.com with SHA1(1) saved and we find a cert with
	  // *.example.com and bar.example.com and SHA1(2): We would show
	  // the dialog even if we have already saved the wildcard cert. But
	  // that's okay due to the changed SHA1 fingerprint, thus prioritizing
	  // security and not convenience...
          return false;
        }
      } catch (err) {
        this.warn("Error trying to check wildcardcertificate "+ commonName +
                  ": " + err);
      } finally {
        stmt.reset();
      }
    } else {
      return false;
    }
  },

  outnew: function(browser, certobj) {
    var notifyBox = gBrowser.getNotificationBox();
    var certPatrolMessage;  
    if (this.pbm) {
      certPatrolMessage = certobj.lang.pbmEvent;
    } else {
      certPatrolMessage = certobj.lang.newEvent;
    } 
    if (this.prefsHandler.
	     getBoolPref("extensions.jondofox.certpatrol_showNewCert") ||
	notifyBox === null) {
      window.openDialog("chrome://jondofox/content/certpatrol/new.xul", 
               "_blank", "modal", certobj);
      return;
    }
    var timeout;
    var n = notifyBox.appendNotification(
	"(CertPatrol) "+ certPatrolMessage
	  +" "+ certobj.now.commonName +". "+
	  certobj.lang.issuedBy +" "+
          (certobj.now.issuerOrganization || certobj.now.issuerCommonName),
	certobj.host, null,
	notifyBox.PRIORITY_INFO_HIGH,
        [{ accessKey: "D", label: certobj.lang.viewDetails,
	   callback: function(msg, btn) {
             if (timeout) {
               clearTimeout(timeout); 
             }
	     window.
               openDialog("chrome://jondofox/content/certpatrol/new.xul", 
               "_blank", "modal", certobj, CertPatrol);
	   }
        }]
    );
    // make sure it stays visible after redirects
    n.persistence = 10;

    try {
      var t = this.prefsHandler.
        getIntPref("extensions.jondofox.certpatrol_notificationTimeout");
      if (t > 0) {
        timeout = setTimeout(function() {
                               if (n.parentNode) {
                                 notifyBox.removeNotification(n);
                               }
                               n = null;
                             }, t * 1000);
      }
    } catch (err) {} 
  },
  
  
  outchange: function(browser, certobj) {
    var notifyBox = gBrowser.getNotificationBox();
    var certPatrolMessage;  
    if (this.pbm) {
      certPatrolMessage = certobj.lang.pbmEvent;
    } else {
      certPatrolMessage = certobj.lang.changeEvent;
    } 
    if (this.prefsHandler.
	     getBoolPref("extensions.jondofox.certpatrol_showChangedCert") ||
	notifyBox === null || certobj.threat > 1) {
      window.openDialog("chrome://jondofox/content/certpatrol/change.xul", 
               "_blank", "modal", certobj, CertPatrol);
      return;
    }
    var timeout;
    var n = notifyBox.appendNotification(
	"(CertPatrol) "+ certPatrolMessage
	  +" "+ certobj.now.commonName +". "+
	  certobj.lang.issuedBy +" "+
	  (certobj.now.issuerOrganization || certobj.now.issuerCommonName),
	certobj.host, null,
	certobj.threat > 0 ? notifyBox.PRIORITY_WARNING_HIGH
			    : notifyBox.PRIORITY_INFO_LOW,
        [{
          accessKey: "D", label: certobj.lang.viewDetails,
	  callback: function(msg, btn) {
            if (timeout) {
              clearTimeout(timeout);
            }
            window.
              openDialog("chrome://jondofox/content/certpatrol/change.xul",
              "_blank", "modal", certobj, CertPatrol);
	  }
        }]
    );
    // make sure it stays visible after redirects
    n.persistence = 10; 

    try {
      var t = this.prefsHandler.
        getIntPref("extensions.jondofox.notificationTimeout");
      if (t > 0) {
        timeout = setTimeout(function() {
                               if (n.parentNode) {
                                 notifyBox.removeNotification(n);
                               }
                               n = null;
                             }, t * 1000);
      }
    } catch(err) {}
  },
  
  warn: function(result) {
    window.openDialog("chrome://jondofox/content/certpatrol/warning.xul",
		      /* "ssl-warning" */ "_blank", "modal", result);
  },

  addCertChain: function(node, cert) {
    if (!cert) return;
    var chain = cert.getChain();
    var text = "";

    for (var i = chain.length - 1; i >= 0; i--) {
      cert = chain.queryElementAt(i, Components.interfaces.nsIX509Cert);
      text += Array((chain.length - i - 1) * 2 + 1).join(" ") + "- " +
        (cert.commonName || cert.windowTitle) + (i > 0 ? "\n" : "");
    }
    node.value = text;
    node.clickSelectsAll = true;
    node.setAttribute("rows", chain.length);
  }, 

  viewCert: function(cert, parent) {
    Cc["@mozilla.org/nsCertificateDialogs;1"].getService(Ci.
      nsICertificateDialogs).viewCert(parent, cert);
  } 
};


window.addEventListener("load", function(e) { CertPatrol.onLoad(e); }, false);
window.addEventListener("unload", function(e) { CertPatrol.onUnload(e); },
  false);
