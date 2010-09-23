function onLoad() {
      document.getElementById("cmdiag").setAttribute("description", 
        "("+window.arguments[0].host+")");
      document.getElementById("cmdiag").setAttribute("title", 
        window.arguments[0].lang.newEvent);
      
      document.getElementById("cmissto").setAttribute("label",
        window.arguments[0].lang.issuedTo);
      document.getElementById("cmissby").setAttribute("label",
        window.arguments[0].lang.issuedBy);
      document.getElementById("cmvalid").setAttribute("label",
        window.arguments[0].lang.validity);
      document.getElementById("cmfinger").setAttribute("label",
        window.arguments[0].lang.fingerprints);
      
      document.getElementById("cmcnl").value = 
	      window.arguments[0].lang.commonName;
      document.getElementById("cmol").value = 
	      window.arguments[0].lang.organization;
      document.getElementById("cmoul").value = 
	      window.arguments[0].lang.organizationalUnit;
      document.getElementById("cmsnl").value = 
	      window.arguments[0].lang.serialNumber;
      document.getElementById("cmeml").value = 
	      window.arguments[0].lang.emailAddress;
      
      document.getElementById("cmicnl").value = 
	      window.arguments[0].lang.commonName;
      document.getElementById("cmiol").value = 
	      window.arguments[0].lang.organization;
      document.getElementById("cmioul").value = 
	      window.arguments[0].lang.organizationalUnit;
      
      document.getElementById("cmnbl").value = 
	      window.arguments[0].lang.notBeforeGMT;
      document.getElementById("cmnal").value = 
	      window.arguments[0].lang.notAfterGMT;

      document.getElementById("cmmd5l").value = 
	      window.arguments[0].lang.md5Fingerprint;
      document.getElementById("cmsha1l").value = 
	      window.arguments[0].lang.sha1Fingerprint;

      document.getElementById("cmcnv").value = 
	      window.arguments[0].moz.commonName;
      document.getElementById("cmov").value = 
	      window.arguments[0].moz.organization;
      document.getElementById("cmouv").value = 
	      window.arguments[0].moz.organizationalUnit;
      document.getElementById("cmsnv").value = 
	      window.arguments[0].moz.serialNumber;
      document.getElementById("cmemv").value = 
	      window.arguments[0].moz.emailAddress;

      document.getElementById("cmicnv").value = 
	      window.arguments[0].moz.issuerCommonName;
      document.getElementById("cmiov").value = 
	      window.arguments[0].moz.issuerOrganization;
      document.getElementById("cmiouv").value = 
	      window.arguments[0].moz.issuerOrganizationUnit;
      
      document.getElementById("cmnbv").value = 
	      window.arguments[0].moz.notBeforeGMT;
      document.getElementById("cmnav").value = 
	      window.arguments[0].moz.notAfterGMT;
      
      document.getElementById("cmmd5v").value = 
	      window.arguments[0].moz.md5Fingerprint;
      document.getElementById("cmsha1v").value = 
	      window.arguments[0].moz.sha1Fingerprint;
}

