///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

/**
 * Dump information to the console?
 */
var m_debug = true;

/**
 * Send data to the console if we're in debug mode
 * @param msg The string containing the log message
 *
 * Do not forget to create 'browser.dom.window.dump.enabled' first!
 */
function log(msg) {
  if (m_debug) dump("JonDoFox :: " + msg + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Code
///////////////////////////////////////////////////////////////////////////////

// Get the Firefox version
var appinfo = Components.classes['@mozilla.org/xre/app-info;1'].
                            getService(Components.interfaces.nsIXULAppInfo);
// Create the appendix for the title string
// TODO: Get the JonDoFox version from somewhere
const titleString = "JonDoFox 2.0.1 (Firefox " + appinfo.version + ")";
log("This is " + titleString);

// Reset the window's title
function setTitle() {
  log("Setting the title");
  try {
    var modifier = "titlemodifier";
    var docElement = document.documentElement.getAttribute(modifier);
    if (docElement) {
      // Get current version numbers from somewhere
      document.documentElement.setAttribute(modifier, titleString);
    }
    // Update Titlebar
    document.getElementById("content").updateTitlebar();
  } catch (e) {
    log("setTitle(): " + e);
  }
}

// Init listeners that call setTitle()
function initTitleListener() {
  log("Init title listeners");
  try {
    document.getElementById("content").addEventListener("DOMTitleChanged", 
                                          setTitle, false);
    gBrowser.mTabContainer.addEventListener("DOMNodeInserted", setTitle, true);
    gBrowser.mTabContainer.addEventListener("DOMNodeRemoved", setTitle, true);
  } catch (e) {
    log("initTitleListener(): " + e);
  }
}

log("New window ..");
window.addEventListener("load", initTitleListener, false);
