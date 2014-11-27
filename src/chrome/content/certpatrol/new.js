var certobj = window.arguments[0];
var CertPatrol = window.arguments[1];

function $() {
  return document.getElementById.apply(document, arguments);
} 

function onLoad() {
  $("cmdiag").setAttribute("description", "(" + certobj.host + ")");
  $("cmdiag").setAttribute("title", certobj.lang.newEvent);
      
  var keys = [ 'commonName', 'organization', 'organizationalUnit',
               // 'md5Fingerprint', 
               'sha1Fingerprint', 'notAfterGMT', 'emailAddress' 
	      // NOT SHOWN ANYMORE (go details):
	      // 'serialNumber',
	      // 'issuerCommonName', 'issuerOrganization',
	      // 'issuerOrganizationUnit',
	      // 'issuerMd5Fingerprint', 'issuerSha1Fingerprint',
	      // 'notBefore',
	      // TO BE SHOWN IN FUTURE:
	      // 'countryName', 'localityName', 'stateOrProvinceName',
	         
  ];
  for (var i in keys) {
    var key = keys[i];
    $(key).value = certobj.now[key];
  } 
  CertPatrol.addCertChain($("cmchain"), certobj.now.cert);
}
