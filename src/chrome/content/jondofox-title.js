/******************************************************************************
 * Copyright (C) 2008-2012, JonDos GmbH
 * Author: Johannes Renner
 *
 * This code adds a customized string to the window title
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

// Dump information to the console?
var mDebug = true;

// Send data to the console if we're in debug mode
// Don't forget to create 'browser.dom.window.dump.enabled' first!
function log(msg) {
  if (mDebug) dump("JDFTitle :: " + msg + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Append a JonDoFox customized string to the window's title
///////////////////////////////////////////////////////////////////////////////

// Get the preferences handler
var prefsHandler = Cc['@jondos.de/preferences-handler;1'].
                     getService().wrappedJSObject;

// Get the appInfo service
var appInfo = Cc['@mozilla.org/xre/app-info;1'].getService(Ci.nsIXULAppInfo);

var versionPref;
var jondosApp;
var jdbUpdater = prefsHandler.isPreferenceSet('jondobrowser.version');
var jdbNoUpdater = prefsHandler.
  isPreferenceSet('extensions.jondofox.browser_version');
  // Get both of the version strings and the application's name
if (jdbUpdater || jdbNoUpdater) {
  jondosApp = "JonDoBrowser";
  if (jdbUpdater) {
    // We are having a JonDoBrowser with an updater.
    versionPref = "jondobrowser.version";
  } else {
    versionPref = "extensions.jondofox.browser_version";
  }
} else {
  versionPref = "extensions.jondofox.profile_version";
  jondosApp = "JonDoFox";
}
var profileVersion = prefsHandler.getStringPref(versionPref);
var appVersion = appInfo.version;
var appName = appInfo.name;

// Create an appendix for the title string
const titleString = jondosApp + " " + profileVersion + " (" + appName + " " +
  appVersion + ")";

// Set the title modifier
// FIXME: This does not work on Macs?
function setTitleModifier() {
  //log("Setting title modifier");
  try {
    // Set the 'titlemodifier' attribute in the current document
    var modAtt = document.documentElement.getAttribute("titlemodifier");
    if (modAtt) {
      document.documentElement.setAttribute("titlemodifier", titleString);
    }
    // This throws an exception if 'docShell' is not set
    if (this.docShell) {
      //log("'this.docShell' is not null");
      document.getElementById("content").updateTitlebar();
    }
  } catch (e) {
    log("setTitleModifier(): " + e);
  }
}

function initTitleListener() {
  try {
    // Add event listener to the content element
    document.getElementById("content").addEventListener("DOMTitleChanged",
                                          setTitleModifier, false);

    // XXX: Not needed? .. mTabContainer ..
    //gBrowser.addEventListener("DOMNodeInserted", setTitleModifier, true);
    //gBrowser.addEventListener("DOMNodeRemoved", setTitleModifier, true);

  } catch (e) {
    log("initTitleListener(): " + e);
  }
}

// Log something initially
log("This is " + titleString);
setTitleModifier();
window.addEventListener("load", initTitleListener, false);
