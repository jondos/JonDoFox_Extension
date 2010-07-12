function onLoad() {
      var warning;
      var coloredWarnings; 
      var threat = window.arguments[0].threat;
      /* host information in brackets is pretty important.. isn't it? */
      document.getElementById("cmdiag").setAttribute("description", 
        "("+window.arguments[0].host+")");
      document.getElementById("cmdiag").setAttribute("title", 
        window.arguments[0].lang.changeEvent);
      coloredWarnings = window.arguments[0].coloredWarnings;
      if (threat === 0) {
	settingColor("green", "cmdiag", "cmcnn");
      } else if (threat === 1 || threat === 2) {
        for (warning in coloredWarnings) {
          settingColor("yellow", coloredWarnings[warning]);
	}
	settingColor("yellow", "cmdiag", "cmsha1n");
      } else {
        for (warning in coloredWarnings) {
          settingColor("red", coloredWarnings[warning]);
        }
	settingColor("red", "cmdiag", "cmsha1n");
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

function settingColor() {
  var i;
  var color = arguments[0];
  if (arguments[0] === "yellow") {
    for (i = 1; i < arguments.length; i += 1) {
      document.getElementById(arguments[i]).
       setAttribute("style", "background: " + 
		    arguments[0] + "; color: black; border: none"); 
    } 
  } else {
    for (i = 1; i < arguments.length; i += 1) {
      document.getElementById(arguments[i]).
       setAttribute("style", "background: " + arguments[0] + "; border: none");
    }
  }
}
