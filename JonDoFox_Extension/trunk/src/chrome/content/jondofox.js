///////////////////////////////////////////////////////////////////////////////
// Debug stuff

/**
 * Dump information to the console?
 */
var JDF_debug = true;

/**
 * Sends data to the console if we're in debug mode
 * @param msg The string containing the message to display
 */
function JDF_dump(msg) {
  if (JDF_debug) dump("JDF --> " + msg + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Start of the code

// Init flag
var m_JDF_inited = false;

var progress = Components.classes["@mozilla.org/docloaderservice;1"].
       getService(Components.interfaces.nsIWebProgress);

// Javascript hooks
function JDF_hookdoc(win, doc) {
  // XXX What is this?
  if(typeof(win.wrappedJSObject) == 'undefined') {
    return;
  }
    
  // Wenn die A2S-Funktionalität deaktiert ist: abbrechen
  //if (JDF_getPreferencesService().getBoolPref("extensions.a2s.disable")==true){
  //  return;			
  //}

  // m_JDF_jshooks enthält den vollständigen Quellcode der Datei jshooks.js
  str2 = m_JDF_jshooks;
	
  try {		
    // Definieren einer Sandbox-Variablen
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
        
    // Folgende Werte bei Standard-Werten belassen
    s.px = window.pageXOffset;
    s.py = window.pageYOffset;
    s.sx = window.screenX;
    s.sy = window.screenY;
		        
    var result = Components.utils.evalInSandbox(str2, s);
        
    } catch (e) {
        window.alert("Exception in sandbox evaluation.");        
    }
}

// Website request
function JDF_check_progress(aProgress, aRequest) {
  if (!m_JDF_inited) {
    var nsio = Components.classes["@mozilla.org/network/io-service;1"].
	          getService(Components.interfaces.nsIIOService);
    var channel = nsio.newChannel("chrome://jondofox/content/common/jshooks.js", null, null);
    var istream = Components.classes["@mozilla.org/scriptableinputstream;1"].
	             createInstance(Components.interfaces.nsIScriptableInputStream);
		
    // Einlesen der jshooks.js Datei in eine Variable
    istream.init(channel.open());
    m_JDF_jshooks = istream.read(istream.available());
    istream.close();        
    m_JDF_inited = true;
  }
  
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
        JDF_hookdoc(DOMWindow.window, doc);
      }
    } catch(e) { }        
  } else { }
  return 0;    
}

// WebListener
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

  onProgressChange: function(aProgress, aRequest, curSelfProgress, maxSelfProgress, curTotalProgress, maxTotalProgress) { 
      return JDF_check_progress(aProgress, aRequest);
  },
  
  onStatusChange: function(aProgress, aRequest, stat, message) { 
      return JDF_check_progress(aProgress, aRequest);
  },
  
  onSecurityChange: function() {return 0;}, 
  onLinkIconAvailable: function() { return 0; }
};

var jondofoxExtension = {  
  init: function() {
    // Call initialize
    JDF_initialize();
    // Add listener
    progress.addProgressListener(myExt_urlBarListener,
       Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
  },
  
  uninit: function() {  	
    // Call uninitialize
    JDF_uninitialize();
    // Remove listener
    progress.removeProgressListener(myExt_urlBarListener);
  },
  
  oldURL: null,

  // XXX For what?
  processNewURL: function(aURI) {
    if (aURI.spec == this.oldURL) return;    
    // URL is new
    alert(aURI.spec);
    this.oldURL = aURI.spec;
  }
};

// Initialize the extension
function JDF_initialize(event)
{
  var windowContent = window.document.getElementById("content");
        	
  // If the window content is set
  if(windowContent)
  {
    //var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);		
    //a2s_setupLocalizedOptions();

    //windowContent.addEventListener("load", JDF_pageLoad, true);

    // If the observer service is set
    //if(observerService)
    //{
    //  observerService.addObserver(JDFQuitObserver, "quit-application-requested", false);
    //}

    // Try to remove the event listener
    try {
      window.removeEventListener("load", JDF_initialize, false);
    } catch(exception) {
      // Do nothing
    }
        
    // Initialisieren des A2S-Buttons
    //if (a2s_getPreferencesService().getBoolPref("extensions.a2s.disable")==false){    	   	  	
    //  document.getElementById("a2s-button").removeAttribute("default");	
    //}
    //else {
    //  document.getElementById("a2s-button").setAttribute("default", "false");
    //}  
  }
}

// Uninitialize the extension
function JDF_uninitialize(event)
{
  var windowContent = window.document.getElementById("content");

  // If the window content is set
  if(windowContent) {
    //var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);

    // If the observer service is set
    //if(observerService) {
      // Try to remove the observer
      //try {
      //  observerService.removeObserver(a2sQuitObserver, "quit-application-requested");
      //} catch (exception) {
        // Do nothing
      //}
    //}

    // Try to remove the event listener
    //try {
    //  windowContent.removeEventListener("load", JDF_pageLoad, true);
    //} catch(exception) {
      // Do nothing
    //}
        
    // Try to remove the event listener
    try {
      window.removeEventListener("close", JDF_uninitialize, false);
    } catch(exception) {
      // Do nothing
    }
  }
}

JDF_dump("Starting Jondofox Extension");
// Add listeners
window.addEventListener("load", function() {jondofoxExtension.init()}, false);
window.addEventListener("unload", function() {jondofoxExtension.uninit()}, false);
