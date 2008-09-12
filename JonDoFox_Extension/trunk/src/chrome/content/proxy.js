///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

// Dump information to the console?
var mDebug = true;

// Send data to the console if we're in debug mode
// Don't forget to create 'browser.dom.window.dump.enabled' first!
function log(msg) {
  if (mDebug) dump("Proxy :: " + msg + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Other methods
///////////////////////////////////////////////////////////////////////////////
    
// Get the proxy manager
var proxyManager = Components.classes['@jondos.de/proxy-manager;1'].
                                 getService().wrappedJSObject;

// Switch proxy according to its current state
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
