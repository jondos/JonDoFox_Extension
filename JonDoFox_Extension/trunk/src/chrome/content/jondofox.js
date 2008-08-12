///////////////////////////////////////////////////////////////////////////////
// Debug stuff

/**
 * Dump information to the console?
 */
var m_JDF_debug = true;

/**
 * Sends data to the console if we're in debug mode
 * @param msg The string containing the log message
 */
function JDF_dump(msg) {
  if (m_JDF_debug) dump("JDF :: " + msg + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Start of the code

// Globals
var m_JDF_inited = false;
var m_JDF_jshooks = null;

var m_progress = Components.classes["@mozilla.org/docloaderservice;1"].
       getService(Components.interfaces.nsIWebProgress);

/**
 * Hook JS variables within a document
 */
function JDF_hookdoc(win, doc) {
  JDF_dump("JDF_hookdoc(): " + win + ", " + doc);

  // XXX What is this?
  if(typeof(win.wrappedJSObject) == 'undefined') {
    JDF_dump("Type of win.wrappedJSObject is undefined, returning ..")
    return;
  }

  //if (JDF_getPreferencesService().getBoolPref("extensions.a2s.disable")==true){
  //  return;			
  //}

  // m_JDF_jshooks contains sources of jshooks.js
  jshooks_code = m_JDF_jshooks;
	
  try {		
    // Define sandbox variable
    var s = new Components.utils.Sandbox(win.wrappedJSObject);
    s.window = win.wrappedJSObject; 
              
    // Übergeben der jew. Einstellung als Variablen an jshooks.js    
    s.h_outerHeight = win.outerHeight;
    s.h_outerWidth = win.outerWidth;
    s.h_innerHeight = win.innerHeight;
    s.h_innerWidth = win.innerWidth;
    s.h_height = screen.height;
    s.h_width = screen.width;   
    s.h_pageName = win.name;
        
    // Leave defaults here
    s.px = window.pageXOffset;
    s.py = window.pageYOffset;
    s.sx = window.screenX;
    s.sy = window.screenY;
		        
    var result = Components.utils.evalInSandbox(jshooks_code, s);
    // XXX: Do something with the result?    
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
  var channel = nsio.newChannel("chrome://jondofox/content/common/jshooks.js", 
     null, null);
  var istream = Components.classes["@mozilla.org/scriptableinputstream;1"].
     createInstance(Components.interfaces.nsIScriptableInputStream);
  // Open channel and read
  istream.init(channel.open());
  m_JDF_jshooks = istream.read(istream.available());
  istream.close();
  if (m_JDF_jshooks != null) {
    m_JDF_inited = true;
  }
  JDF_dump("JDF_init_jshooks(): " + m_JDF_inited);
}

// Website request
function JDF_check_progress(aProgress, aRequest) {
  JDF_dump("JDF_check_progress(): " + aProgress + ", " + aRequest) 
  // If this is the first call: init
  if (!m_JDF_inited) {
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
        JDF_hookdoc(DOMWindow.window, doc);
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

// FIXME: Not needed?
var JDF_extension = {
  init: function() {
    JDF_initialize();
  },
  
  uninit: function() {
    JDF_uninitialize();
  },
  
  // XXX For what?
  oldURL: null,

  // XXX For what?
  processNewURL: function(aURI) {
    if (aURI.spec == this.oldURL) return;    
    // URL is new
    alert(aURI.spec);
    this.oldURL = aURI.spec;
  }
};

// Initial logging
JDF_dump("Starting Jondofox Extension, adding EventListeners ..");
// Add listeners
window.addEventListener("load", function() {JDF_extension.init()}, false);
window.addEventListener("unload", function() {JDF_extension.uninit()}, false);
