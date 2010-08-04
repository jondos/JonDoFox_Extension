/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * ''Certificate Patrol'' was conceived by Carlo v. Loesch and
 * implemented by Aiko Barz, Mukunda Modell and Carlo v. Loesch.
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
    this.jdfManager = Components.classes['@jondos.de/jondofox-manager;1'].
	            getService().wrappedJSObject;
    // We check whether the original Certificate Patrol extension should be 
    // used. If so, we avoid using as much of our adapted CertPatrol code as 
    // possible, especially we try to avoid registering event listeners twice 
    // (those in our init() code additionally to the ones in the CertPatrol 
    // init() code).
    if (!jdfManager.certPatrol) {
      this.jdfUtils = Components.classes['@jondos.de/jondofox-utils;1'].
                    getService().wrappedJSObject;
      this.prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
                    getService().wrappedJSObject;
      this.dbinit();
      this.init();
    }
    window.removeEventListener("load", function(e) { CertPatrol.onLoad(e); }, 
           false); 
  },


  // DB init
  dbinit: function() {
    this.dbh = null;
    this.dbselect = null;
    this.dbinsert = null;
    this.dbupdate = null;

    try {
      var file = Components.classes["@mozilla.org/file/directory_service;1"]
                 .getService(Components.interfaces.nsIProperties)
                 .get("ProfD", Components.interfaces.nsIFile);
      var storage = Components.classes["@mozilla.org/storage/service;1"]
                    .getService(Components.interfaces.mozIStorageService);
      file.append("CertPatrol.sqlite");

      // Must be checked before openDatabase()
      var exists = file.exists();

      // Now, CertPatrol.sqlite exists
      this.dbh = storage.openDatabase(file);

      // CertPatrol.sqlite initialization
      if (!exists) {
        this.dbh.executeSimpleSQL(
        "CREATE TABLE version (version INT)");
        this.dbh.executeSimpleSQL(
        "INSERT INTO version (version) VALUES (1)");
        this.dbh.executeSimpleSQL(
        "CREATE TABLE certificates (host VARCHAR, commonName VARCHAR, organization VARCHAR, organizationalUnit VARCHAR, serialNumber VARCHAR, emailAddress VARCHAR, notBeforeGMT VARCHAR, notAfterGMT VARCHAR, issuerCommonName VARCHAR, issuerOrganization VARCHAR, issuerOrganizationUnit VARCHAR, md5Fingerprint VARCHAR, sha1Fingerprint VARCHAR)");
      }

      // Prepared statements
      this.dbselect = this.dbh.createStatement(
      "SELECT * FROM certificates where host=?1");
      this.dbselectWildcard = this.dbh.createStatement(
      "SELECT * FROM certificates where sha1Fingerprint=?13");		      
      this.dbinsert = this.dbh.createStatement(
      "INSERT INTO certificates (host, commonName, organization, organizationalUnit,serialNumber, emailAddress, notBeforeGMT, notAfterGMT, issuerCommonName, issuerOrganization, issuerOrganizationUnit, md5Fingerprint, sha1Fingerprint) values (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)");
      this.dbupdate = this.dbh.createStatement(
      "UPDATE certificates set commonName=?2, organization=?3, organizationalUnit=?4, serialNumber=?5, emailAddress=?6, notBeforeGMT=?7, notAfterGMT=?8, issuerCommonName=?9, issuerOrganization=?10, issuerOrganizationUnit=?11, md5Fingerprint=?12, sha1Fingerprint=?13 where host=?1");
    }
    catch(err) {
      this.warn("Error initializing SQLite operations: "+ err);
    }
  },


  // Application trigger
  init: function() {
    // Firefox
    var content = document.getElementById("content");
    if(content) {
      content.addEventListener("load", this.onPageLoad, true);
    }
  },


  // helper functions for advanced patrol
  isodate: function(tim) {
    if (isNaN(tim)) {
      // i think i saw some cert dates without time info appended..
      var iso = tim.replace(/^(\d\d)\/(\d\d)\/(\d+)/, "$3-$1-$2");
      // upcoming Y3K bug, but you must delete this line before 2020
      // there will be no more two digit year certs in existence hopefully
      if (iso != tim) {
	  if (iso[0] != '2') iso = "20"+ iso;
	  return iso;
      }
    }
    var d = new Date(tim / 1000);
    return d.toLocaleFormat("%Y-%m-%d %H:%M"); 
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


  // Event trigger
  onPageLoad: function(aEvent) {
    if (!CertPatrol.prefsHandler.
        getBoolPref('extensions.jondofox.certpatrol_enabled')) {
      return;
    }
    var doc = aEvent.originalTarget;
    if (doc && doc.location && doc.location.protocol == "https:") {
      CertPatrol.onSecurePageLoad(doc);
    }
  },


  // SSL trigger
  onSecurePageLoad: function(doc) {
    const ci = Components.interfaces;
    var thiscert;
    var validity;

    var browser = gBrowser.getBrowserForDocument(doc);
    if (!browser) {
        return;
    }

    var certobj={
      threat:0,
      coloredWarnings:{},
      info:"",
      host:"",
      moz:{
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
        sha1Fingerprint:""
      },
      sql:{
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
        sha1Fingerprint:""
      },
      lang:{
        newEvent:this.jdfUtils.getString("newEvent"),
        changeEvent:this.jdfUtils.getString("changeEvent"),
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
        viewDetails:this.jdfUtils.getString("viewDetails")  // no comma
      }
    };

    var ui = browser.securityUI;
    if (!ui)
      return;
    
    var sp = ui.QueryInterface(ci.nsISSLStatusProvider);
    if (!sp)
      return;

    var stats = sp.SSLStatus;
    // Domainname not found,
    // Selfsigned and not yet accepted
    if (!stats)
      return;
    
    var stati = stats.QueryInterface(ci.nsISSLStatus);
    if (!stati)
      return;

    thiscert = stati.serverCert;
    if (!thiscert)
      return;

    validity = thiscert.validity.QueryInterface(ci.nsIX509CertValidity);
    if (!validity)
      return;

    // The interesting part
    if (thiscert && validity)
    {
      certobj.host = doc.location.host;

      certobj.moz.commonName = thiscert.commonName;
      certobj.moz.organization = thiscert.organization;
      certobj.moz.organizationalUnit = thiscert.organizationalUnit;
      certobj.moz.serialNumber = thiscert.serialNumber;
      certobj.moz.emailAddress = thiscert.emailAddress;
      certobj.moz.notBeforeGMT = validity.notBefore;
      certobj.moz.notAfterGMT = validity.notAfter;
      certobj.moz.issuerCommonName = thiscert.issuerCommonName;
      certobj.moz.issuerOrganization = thiscert.issuerOrganization;
      certobj.moz.issuerOrganizationUnit = thiscert.issuerOrganizationUnit;
      certobj.moz.md5Fingerprint = thiscert.md5Fingerprint;
      certobj.moz.sha1Fingerprint = thiscert.sha1Fingerprint;

      this.certCheck(browser, certobj);
    }
  },


  // Certificate check
  certCheck: function(browser, certobj) {
    var found = false;
    var existingWildcardCert = false;

    // Get certificate
    var stmt = this.dbselect;
    try {
      stmt.bindUTF8StringParameter(0, certobj.host);
      if (stmt.executeStep()) {
        found=true;
        certobj.sql.commonName = stmt.getUTF8String(1);
        certobj.sql.organization = stmt.getUTF8String(2);
        certobj.sql.organizationalUnit = stmt.getUTF8String(3);
        certobj.sql.serialNumber = stmt.getUTF8String(4);
        certobj.sql.emailAddress = stmt.getUTF8String(5);
        certobj.sql.notBeforeGMT = stmt.getUTF8String(6);
        certobj.sql.notAfterGMT = stmt.getUTF8String(7);
        certobj.sql.issuerCommonName = stmt.getUTF8String(8);
        certobj.sql.issuerOrganization = stmt.getUTF8String(9);
        certobj.sql.issuerOrganizationUnit = stmt.getUTF8String(10);
        certobj.sql.md5Fingerprint = stmt.getUTF8String(11);
        certobj.sql.sha1Fingerprint = stmt.getUTF8String(12);
      }
    } catch(err) {
      this.warn("Error trying to check certificate: "+ err);
    } finally {
      stmt.reset();
    }


    // The certificate changed 
    if ( found && (
         certobj.sql.sha1Fingerprint != certobj.moz.sha1Fingerprint ||
         certobj.sql.md5Fingerprint  != certobj.moz.md5Fingerprint 
       )) {
      // Let's check whether we have a wildcard certificate and whether we 
      // have the same certificare already stored...
      // We have to do this here, before the certificate is updated. Otherwise,
      // the updated wildcard certificate is obviously always found and the 
      // test fails...
      existingWildcardCert = this.wildcardCertCheck(certobj.moz.commonName,
		      certobj.moz.sha1Fingerprint);
      // DB update
      stmt = this.dbupdate;
      try {
        stmt.bindUTF8StringParameter( 0, certobj.host);
        stmt.bindUTF8StringParameter( 1, certobj.moz.commonName);
        stmt.bindUTF8StringParameter( 2, certobj.moz.organization);
        stmt.bindUTF8StringParameter( 3, certobj.moz.organizationalUnit);
        stmt.bindUTF8StringParameter( 4, certobj.moz.serialNumber);
        stmt.bindUTF8StringParameter( 5, certobj.moz.emailAddress);
        stmt.bindUTF8StringParameter( 6, certobj.moz.notBeforeGMT);
        stmt.bindUTF8StringParameter( 7, certobj.moz.notAfterGMT);
        stmt.bindUTF8StringParameter( 8, certobj.moz.issuerCommonName);
        stmt.bindUTF8StringParameter( 9, certobj.moz.issuerOrganization);
        stmt.bindUTF8StringParameter(10, certobj.moz.issuerOrganizationUnit);
        stmt.bindUTF8StringParameter(11, certobj.moz.md5Fingerprint);
        stmt.bindUTF8StringParameter(12, certobj.moz.sha1Fingerprint);
        stmt.execute();
      } catch(err) {
        this.warn("Error trying to update certificate: "+ err);
      } finally {
        stmt.reset();
      }

      // If we found an already updated wildcard cert then do not show the 
      // changed cert dialog as we do not really have a newly updated cert.
      if (existingWildcardCert) {
        return;
      } 

      // Try to make some sense out of the certificate changes
      var natd = this.timedelta(certobj.sql.notAfterGMT);
      if (natd <= 0) {
        certobj.info += this.jdfUtils.getString("warn_notAfterGMT_expired") + 
		"\n";
      } else if (natd > 10364400000) {
	certobj.threat += 2;
	// We add here and in the following the remaining days the old
	// certificate is still valid. Maybe this is a useful information
	// for the interested user which wouldn't be so easily available
	// anymore: now, we only show the new certificate to the user as
	// this one is far more important than the old one...
        certobj.info += this.jdfUtils.
		formatString("warn_notAfterGMT_notdue_atAll",
		[Math.round(natd / 86400000)]) +"\n";
      } else if (natd > 5182200000) {
	certobj.threat ++;
        certobj.info += this.jdfUtils.formatString("warn_notAfterGMT_notdue", 
			[Math.round(natd / 86400000)]) +"\n";
      } else if (natd > 0) {
        certobj.info += this.jdfUtils.formatString("warn_notAfterGMT_due", 
			[Math.round(natd / 86400000)]) +"\n";
      }
      if (certobj.moz.commonName != certobj.sql.commonName) {
        certobj.info += this.jdfUtils.getString("warn_commonName") +"\n";
	certobj.threat += 2;
	// We use the coloredWarnings object to be later on able to render the
	// problematic attributes in the appropriate color (i.e. orange or 
	// firebrick[sic!]) in the change dialog.
	certobj.coloredWarnings.first = "cmcnn";
      }
      if (certobj.moz.issuerCommonName != certobj.sql.issuerCommonName) {
        certobj.info += this.jdfUtils.getString("warn_issuerCommonName") +"\n";
	certobj.threat ++;
	certobj.coloredWarnings.second = "cmicnn";
      }
      // checking NEW certificate here..
      var td = this.timedelta(certobj.moz.notBeforeGMT);
      if (td > 0) {
        certobj.info += this.jdfUtils.getString("warn_notBeforeGMT") +"\n";
	certobj.threat += 2;
	certobj.coloredWarnings.third = "cmnbn";
      }
      // The SHA1 checksum has probably changed, it should get some coloring as
      // well if there are some threats...
      certobj.coloredWarnings.fourth = "cmsha1n";

      // further checks done by firefox before we even get here

      if (certobj.threat > 3) {
        certobj.threat = 3;
      }
      certobj.lang.changeEvent += " "+ this.jdfUtils.getString("threatLevel_" + 
		      certobj.threat);

      certobj.sql.notBeforeGMT= this.isodate(certobj.sql.notBeforeGMT) +
				this.daysdelta(this.timedelta(certobj.
							sql.notBeforeGMT));
      certobj.sql.notAfterGMT = this.isodate(certobj.sql.notAfterGMT) +
				this.daysdelta(natd);
      certobj.moz.notBeforeGMT= this.isodate(certobj.moz.notBeforeGMT) +
				this.daysdelta(this.timedelta(certobj.moz.notBeforeGMT));
      certobj.moz.notAfterGMT = this.isodate(certobj.moz.notAfterGMT) +
				this.daysdelta(this.timedelta(certobj.moz.notAfterGMT));

      this.outchange(browser, certobj);

    // New certificate
    } else if (!found) {
      // Let's check whether we have a wildcard certificate and whether we 
      // have the same certificare already stored...
      // We have to do this here, before the new certificate is written.
      // Otherwise, a wildcard certificate is always found: at least the one
      // just written and the test fails...
      existingWildcardCert = this.wildcardCertCheck(certobj.moz.commonName, 
		      certobj.moz.sha1Fingerprint); 
      // Now, store data
      stmt = this.dbinsert;
      try {
        stmt.bindUTF8StringParameter( 0, certobj.host);
        stmt.bindUTF8StringParameter( 1, certobj.moz.commonName);
        stmt.bindUTF8StringParameter( 2, certobj.moz.organization);
        stmt.bindUTF8StringParameter( 3, certobj.moz.organizationalUnit);
        stmt.bindUTF8StringParameter( 4, certobj.moz.serialNumber);
        stmt.bindUTF8StringParameter( 5, certobj.moz.emailAddress);
        stmt.bindUTF8StringParameter( 6, certobj.moz.notBeforeGMT);
        stmt.bindUTF8StringParameter( 7, certobj.moz.notAfterGMT);
        stmt.bindUTF8StringParameter( 8, certobj.moz.issuerCommonName);
        stmt.bindUTF8StringParameter( 9, certobj.moz.issuerOrganization);
        stmt.bindUTF8StringParameter(10, certobj.moz.issuerOrganizationUnit);
        stmt.bindUTF8StringParameter(11, certobj.moz.md5Fingerprint);
        stmt.bindUTF8StringParameter(12, certobj.moz.sha1Fingerprint);
        stmt.execute();
      } catch(err) {
        this.warn("Error trying to insert certificate for "+certobj.host+
                  ": "+err);
      } finally {
        stmt.reset();
      }
      // If we found an already saved wildcard cert, do not show it
      // again to the user, as it is not really a new certificate.
      if (existingWildcardCert) {
	return;
      }
      // checks are done by firefox before we even get here
      // that's why we don't complain about host != common name etc.
      certobj.moz.notBeforeGMT = this.isodate(certobj.moz.notBeforeGMT) +
				this.daysdelta(this.timedelta(certobj.moz.
				notBeforeGMT));
      certobj.moz.notAfterGMT = this.isodate(certobj.moz.notAfterGMT) +
				this.daysdelta(this.timedelta(certobj.moz.
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
        this.warn("Error trying to check wildcardcertificate "+commonName+
                  ": "+err);
      } finally {
        stmt.reset();
      }
    } else {
      return false;
    }
  },

  outnew: function(browser, certobj) {
    var notifyBox = gBrowser.getNotificationBox();
    if (this.prefsHandler.
	     getBoolPref("extensions.jondofox.certpatrol_showNewCert") ||
	notifyBox === null) {
      window.openDialog("chrome://jondofox/content/certpatrol/new.xul", 
               "_blank", "modal", certobj);
      return;
    }
    notifyBox.appendNotification(
	"(CertPatrol) "+ certobj.lang.newEvent
	  +" "+ certobj.moz.commonName +". "+
	  certobj.lang.issuedBy +" "+
	    (certobj.moz.issuerOrganization || certobj.moz.issuerCommonName),
	certobj.host, null,
	notifyBox.PRIORITY_INFO_HIGH, [
	    { accessKey: "D", label: certobj.lang.viewDetails,
	      callback: function(msg, btn) {
	window.openDialog("chrome://jondofox/content/certpatrol/new.xul", 
		"_blank", "modal", certobj);
	} },
    ]);
  },
  
  
  outchange: function(browser, certobj) {
    var notifyBox = gBrowser.getNotificationBox();
    if (this.prefsHandler.
	     getBoolPref("extensions.jondofox.certpatrol_showChangedCert") ||
	notifyBox === null || certobj.threat > 1) {
      window.openDialog("chrome://jondofox/content/certpatrol/change.xul", 
               "_blank", "modal", certobj);
      return;
    }
    notifyBox.appendNotification(
	"(CertPatrol) "+ certobj.lang.newEvent
	  +" "+ certobj.moz.commonName +". "+
	  certobj.lang.issuedBy +" "+
	    (certobj.moz.issuerOrganization || certobj.moz.issuerCommonName),
	certobj.host, null,
	certobj.threat > 0 ? notifyBox.PRIORITY_WARNING_HIGH
			    : notifyBox.PRIORITY_INFO_LOW, [
	    { accessKey: "D", label: certobj.lang.viewDetails,
	      callback: function(msg, btn) {
	window.openDialog("chrome://jondofox/content/certpatrol/change.xul", 
		"_blank", "modal", certobj);
	} },
    ]);
  },
  
  
  warn: function(result) {
    window.openDialog("chrome://jondofox/content/certpatrol/warning.xul",
		      /* "ssl-warning" */ "_blank", "modal", result);
  }
};


window.addEventListener("load", function(e) { CertPatrol.onLoad(e); }, false);
