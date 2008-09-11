///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

// Dump information to the console?
var mDebug = true;

// Send data to the console if we're in debug mode
// Don't forget to create 'browser.dom.window.dump.enabled' first!
function log(msg) {
  if (mDebug) dump("JonDoFox :: " + msg + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Append a JonDoFox customized string to the window's title
///////////////////////////////////////////////////////////////////////////////

// Get the Firefox version
var appInfo = Components.classes['@mozilla.org/xre/app-info;1'].
                            getService(Components.interfaces.nsIXULAppInfo);
// Preferences handler
var prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
                       getService().wrappedJSObject;

// Get both of the version strings and the application's name
var versionPref = "extensions.jondofox.profile_version";
var profileVersion = prefsHandler.getStringPreference(versionPref);
var appVersion = appInfo.version;
var appName = appInfo.name;

// Create an appendix for the title string
const titleString = "JonDoFox "+profileVersion+" ("+appName+" "+appVersion+")";
// Log something initially
log("This is " + titleString);

// Set the modifier only
function setTitleModifier() {
  log("Setting title modifier");
  try {
    // Set the 'titlemodifier' attribute in the current document
    var modAtt = document.documentElement.getAttribute("titlemodifier");
    if (modAtt) {
      document.documentElement.setAttribute("titlemodifier", titleString);
    }
    // XXX: This seems to be not needed
    //document.getElementById("content").updateTitlebar();
  } catch (e) {
    log("setModifier(): " + e);
  }
}

// Init a listener that calls setTitleModifier()
function initTitleListener() {
  log("Init TitleListener");
  try {
    // This seems to be enough?
    document.getElementById("content").addEventListener("DOMTitleChanged", 
                                          setTitleModifier, false);
    
    // XXX: Also not needed? .. mTabContainer ..
    //gBrowser.addEventListener("DOMNodeInserted", setTitleModifier, true);
    //gBrowser.addEventListener("DOMNodeRemoved", setTitleModifier, true);
  } catch (e) {
    log("initTitleListener(): " + e);
  }
}

// We have a new window
log("New window ..");
// Set the title once when initializing a new window
setTitleModifier();
// Rather use an anonymous function?
window.addEventListener("load", initTitleListener, false);
