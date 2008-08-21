///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

/**
 * Dump information to the console?
 */
var m_JDF_debug = true;

/**
 * Send data to the console if we're in debug mode
 * @param msg The string containing the log message
 */
function JDF_dump(msg) {
  if (m_JDF_debug) dump("JDF :: " + msg + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// JS hooking
///////////////////////////////////////////////////////////////////////////////

// Globals
var m_JDF_jshooks = null;

var m_progress = Components.classes["@mozilla.org/docloaderservice;1"].
       getService(Components.interfaces.nsIWebProgress);

/**
 * Hook JS variables within a document
 */
function JDF_hook_document(win, doc) {
  if(typeof(win.wrappedJSObject) == 'undefined') {
    JDF_dump("No JSObject for '" + win.location + "', returning ..")
    return;
  }
  JDF_dump("Hooking document: " + win.location);

  // m_JDF_jshooks contains sources of jshooks.js
  jshooks_code = m_JDF_jshooks;
	
  try {
    // Define sandbox variable
    var s = new Components.utils.Sandbox(win.wrappedJSObject);
    s.window = win.wrappedJSObject;
    var result = Components.utils.evalInSandbox(jshooks_code, s);
    // TODO: Check the result
  } catch (e) {
    // TODO: Add more debugging
    window.alert("Exception in sandbox evaluation! " + e);        
  }
}

/**
 * Read jshooks.js into member variable m_JDF_jshooks
 */
function JDF_init_jshooks() {
  var nsio = Components.classes["@mozilla.org/network/io-service;1"].
     getService(Components.interfaces.nsIIOService);
  var channel = nsio.newChannel("chrome://jondofox/content/jshooks.js", 
     null, null);
  var istream = Components.classes["@mozilla.org/scriptableinputstream;1"].
     createInstance(Components.interfaces.nsIScriptableInputStream);
  // Open channel and read
  istream.init(channel.open());
  m_JDF_jshooks = istream.read(istream.available());
  istream.close();
  JDF_dump("JDF_init_jshooks(): " + (m_JDF_jshooks != null));
}

// Website request
function JDF_check_progress(aProgress, aRequest) {
  JDF_dump("JDF_check_progress(): " + aProgress + ", " + aRequest) 
  // If this is the first call: init
  if (!m_JDF_jshooks) {
    JDF_init_jshooks();
  }
  // Get the window
  var DOMWindow = null;
  if(aProgress) {
    DOMWindow = aProgress.DOMWindow;        
  } else {
    try {
      DOMWindow = aRequest.notificationCallbacks.QueryInterface(
                     Components.interfaces.nsIInterfaceRequestor).
                     getInterface(Components.interfaces.nsIDOMWindow);
    } catch(e) { }
  }
  // This noise is a workaround for firefox bugs involving
  // enforcement of docShell.allowPlugins and docShell.allowJavascript
  // (Bugs 401296 and 409737 respectively) 
  // TODO: Remove?
  try {
    if(aRequest) {
      var chanreq = aRequest.QueryInterface(Components.interfaces.nsIChannel);
    }
  } catch(e) { }
    
  if(DOMWindow) {
    var doc = DOMWindow.document;
    try {
      if(doc && doc.domain) {
        // Call hookdoc here
        JDF_hook_document(DOMWindow.window, doc);
      }
    } catch(e) { }        
  } else { }
  // XXX
  return 0;    
}

// Define WebProgressListener
var myExt_urlBarListener = {
  QueryInterface: function(aIID) {
   if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
       aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
       aIID.equals(Components.interfaces.nsISupports))
     return this;
   throw Components.results.NS_NOINTERFACE;
  },

  onStateChange: function(aProgress, aRequest, aFlag, aStatus) { 
      return JDF_check_progress(aProgress, aRequest);
  },

  onLocationChange: function(aProgress, aRequest, aURI) {
      return JDF_check_progress(aProgress, aRequest);
  },

  onProgressChange: function(aProgress, aRequest, curSelfProgress, 
     maxSelfProgress, curTotalProgress, maxTotalProgress) { 
      return JDF_check_progress(aProgress, aRequest);
  },
  
  onStatusChange: function(aProgress, aRequest, stat, message) { 
      return JDF_check_progress(aProgress, aRequest);
  },
  
  onSecurityChange: function() {return 0;}, 
  onLinkIconAvailable: function() { return 0; }
};

/**
 * Initialize the extension
 */
function JDF_initialize(event) {
  JDF_dump("JDF_initialize(): " + event);
  var windowContent = window.document.getElementById("content");
  // If the window content is set
  if(windowContent)
  {
    // Try to remove the event listener
    try {
      window.removeEventListener("load", JDF_initialize, false);
    } catch(exception) {
      // Do nothing 
    }
  }
  // Add WebProgressListener
  m_progress.addProgressListener(myExt_urlBarListener,
     Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
}

/**
 * Uninitialize the extension
 */
function JDF_uninitialize(event) {
  JDF_dump("JDF_uninitialize(): " + event);
  var windowContent = window.document.getElementById("content");
  // If the window content is set
  if(windowContent) {
    // Try to remove the event listener
    try {
      window.removeEventListener("close", JDF_uninitialize, false);
    } catch(exception) {
      // Do nothing
    }
  }
  // Remove WebProgressListener
  m_progress.removeProgressListener(myExt_urlBarListener);
}

// Add listeners
// window.addEventListener("load", JDF_initialize, false);
// window.addEventListener("unload", JDF_uninitialize, false);
