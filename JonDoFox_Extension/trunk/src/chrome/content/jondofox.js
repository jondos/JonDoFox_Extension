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
// Proxy switching methods
///////////////////////////////////////////////////////////////////////////////

// Get the preferences handler
var prefsHandler = Components.classes['@jondos.de/preferences-handler;1'].
                                 getService().wrappedJSObject;
    
// Get the proxy manager
var proxyManager = Components.classes['@jondos.de/proxy-manager;1'].
                                 getService().wrappedJSObject;

// Switch the proxy according to its current state
function switchProxy() {
  log("Switching Proxy ..");
  try {
    // Get the current status
    var state = proxyManager.getProxyState();
    if (state > 0) {
      // Disable
      proxyManager.disableProxy();
    } else {
      // Enable
      proxyManager.setProxyAll("127.0.0.1", 4001);
      proxyManager.enableProxy();
    }
  } catch (e) {
    log("switchProxy(): " + e);
  }
}

// Return a proxy-status label string
function getLabel() {
  log("Determine proxy-status label");
  try {
    // Get the state
    var state = proxyManager.getProxyState();
    switch (state) {
      case 0:
        return "Proxy:None";
        break;
      
      case 1:
        // TODO: Check which proxy is used
        return "Proxy:JonDo";
        break;

      default:
        return "Proxy:Unknown";
        log("Unknown status " + state + "!");
        break;
    }
  } catch (e) {
    log("getLabel(): " + e);
  }
}

// Set the current label to the proxy-status
function setLabel() {
  log("Set label");
  try {
    document.getElementById('proxy-status').setAttribute('label', getLabel());
  } catch (e) {
    log("setLabel(): " + e)
  }
}

// Observer for proxy preferences
var proxyObserver = {
  // Implement nsIObserver
  observe: function(subject, topic, data) {
    switch (topic) {
      case 'nsPref:changed':
        log(topic + " --> " + data);
        if (data == 'network.proxy.type') {
          // Reset the label on type change
          setLabel();
        }
        break;

      default:
        log("Wrong topic " + topic);
        break;
    }
  }
}

// Initialize the proxy status label
function init() {
  log("Init proxy status");
  try {
    // Remove this listener again
    window.removeEventListener("load", init, true);
    // Initially set the label
    setLabel();
    // Add a proxy preferences observer
    prefsHandler.getPrefs().addObserver("network.proxy", proxyObserver, false);
  } catch (e) {
    log("init(): " + e);
  }
}

///////////////////////////////////////////////////////////////////////////////
// Append a JonDoFox customized string to the window's title
///////////////////////////////////////////////////////////////////////////////

// Get the Firefox version
var appInfo = Components.classes['@mozilla.org/xre/app-info;1'].
                            getService(Components.interfaces.nsIXULAppInfo);

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
  //log("Setting title modifier");
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
  log("Init title listener");
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
