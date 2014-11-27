var certobj = window.arguments[0];
var CertPatrol = window.arguments[1];

function $() {
  return document.getElementById.apply(document, arguments);
}

function onLoad() {
  var warning;
  var threat = window.arguments[0].threat;
  $("cmdiag").setAttribute("description", "(" + certobj.host + ")");
  $("cmdiag").setAttribute("title", certobj.lang.changeEvent);       
  $("cmdiag").className += 'threat-' + threat;

  if (!certobj.old.cert) $("cmdetailso").disabled = true; 
  $("cmdetailsn").focus();
  $("cmbox").scrollTop = 0; 

  var keys = ["commonName", "organization", "organizationalUnit",
    // "serialNumber", "emailAddress",
    "notBeforeGMT", "notAfterGMT", "issuerCommonName", "issuerOrganization",
    "issuerOrganizationUnit", 
    // "issuerMd5Fingerprint", 
    "issuerSha1Fingerprint",
    // "md5Fingerprint",
    "sha1Fingerprint"];
  for (var i in keys) {
    var key = keys[i];
    if (certobj.now[key] == certobj.old[key]) {
      $(key).value = certobj.old[key];
      $(key+2).hidden = true;
    } else {
      $(key).value = certobj.old[key];
      $(key+2).value = certobj.now[key];
      $(key).className += " old";
      $(key+2).className += " new";
      $(key+2).hidden = false;
    }
  } 
  for (var k in certobj.warn) {
    if (certobj.warn[k]) {
      $("warn_"+k).hidden = false;
    }
  }

  CertPatrol.addCertChain($("cmchaino"), certobj.old.cert);
  CertPatrol.addCertChain($("cmchainn"), certobj.now.cert);
  if ($("cmchaino").value != $("cmchainn").value) {
    $("cmchaino").className += " old";
    $("cmchainn").className += " new";
  } 
}

function doOK() {}
