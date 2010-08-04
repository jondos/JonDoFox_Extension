function onLoad() {
      var warning;
      var coloredWarnings; 
      var threat = window.arguments[0].threat;
      /* host information in brackets is pretty important.. isn't it? */
      document.getElementById("cmdiag").setAttribute("description", 
        "("+window.arguments[0].host+")");
      document.getElementById("cmdiag").setAttribute("title", 
        window.arguments[0].lang.changeEvent);
      // The following code block is responible for rendering the heading of
      // the cert change dialog and the problematic attributes (if there are
      // any) properly. If we have seemlingly no threat just render the 
      // background of the heading green, signalling verything is okay.
      // Otherwise, turn it into orange or red and show the user in addition
      // to the written warning(s) the problematic attributes colored 
      // respectively.
      coloredWarnings = window.arguments[0].coloredWarnings;
      if (threat === 0) {
	document.getElementById("cmdiag").setAttribute("style", 
		"color: black; background: forestgreen; border: none");
      } else if (threat === 1 || threat === 2) {
        for (warning in coloredWarnings) {
          document.getElementById(coloredWarnings[warning]).
		  setAttribute("style", "color: orange");
	}
	document.getElementById("cmdiag").setAttribute("style", 
		"color: black; background: orange; border: none");
      } else {
        for (warning in coloredWarnings) {
          document.getElementById(coloredWarnings[warning]).
		  setAttribute("style", "color: firebrick");
        }
        document.getElementById("cmdiag").setAttribute("style", 
		"color: black; background: firebrick; border: none");
      }
      
      document.getElementById("cmissto").setAttribute("label",
        window.arguments[0].lang.issuedTo);
      document.getElementById("cmissby").setAttribute("label",
        window.arguments[0].lang.issuedBy);
      document.getElementById("cmvalid").setAttribute("label",
        window.arguments[0].lang.validity);
      document.getElementById("cmfinger").setAttribute("label",
        window.arguments[0].lang.fingerprints);
      
      document.getElementById("cmcnl").value = window.arguments[0].lang.
	      commonName;
      document.getElementById("cmol").value = window.arguments[0].lang.
	      organization;
      document.getElementById("cmoul").value = window.arguments[0].lang.
	      organizationalUnit;
      document.getElementById("cmsnl").value = window.arguments[0].lang.
	      serialNumber;
      document.getElementById("cmeml").value = window.arguments[0].lang.
	      emailAddress;
      
      document.getElementById("cmicnl").value = window.arguments[0].lang.
	      commonName;
      document.getElementById("cmiol").value = window.arguments[0].lang.
	      organization;
      document.getElementById("cmioul").value = window.arguments[0].lang.
	      organizationalUnit;
      
      document.getElementById("cmnbl").value = window.arguments[0].lang.
	      notBeforeGMT;
      document.getElementById("cmnal").value = window.arguments[0].lang.
	      notAfterGMT;

      document.getElementById("cmmd5l").value = window.arguments[0].lang.
	      md5Fingerprint;
      document.getElementById("cmsha1l").value = window.arguments[0].lang.
	      sha1Fingerprint;

      document.getElementById("cmcnn").value = window.arguments[0].moz.
	      commonName;
      document.getElementById("cmon").value = window.arguments[0].moz.
	      organization;
      document.getElementById("cmoun").value = window.arguments[0].moz.
	      organizationalUnit;
      document.getElementById("cmsnn").value = window.arguments[0].moz.
	      serialNumber;
      document.getElementById("cmemn").value = window.arguments[0].moz.
	      emailAddress;

      document.getElementById("cmicnn").value = window.arguments[0].moz.
	      issuerCommonName;
      document.getElementById("cmion").value = window.arguments[0].moz.
	      issuerOrganization;
      document.getElementById("cmioun").value = window.arguments[0].moz.
	      issuerOrganizationUnit;
      
      document.getElementById("cmnbn").value = window.arguments[0].moz.
	      notBeforeGMT;
      document.getElementById("cmnan").value = window.arguments[0].moz.
	      notAfterGMT;
      
      document.getElementById("cmmd5n").value = window.arguments[0].moz.
	      md5Fingerprint;
      document.getElementById("cmsha1n").value = window.arguments[0].moz.
	      sha1Fingerprint;

      document.getElementById("cminfo").value = window.arguments[0].info;
}

