///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

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
// User agent spoofing
///////////////////////////////////////////////////////////////////////////////

// Instantiate the preferences handler
var m_JDF_prefs = Components.classes['@jondos.de/preferences-handler;1']
                     .getService().wrappedJSObject;

/**
 * Set several overrides
 */
function JDF_set_user_agent()
{
  JDF_dump("Setting user agent");
  
  m_JDF_prefs.setStringPreference("general.appname.override", "Netscape");
  m_JDF_prefs.setStringPreference("general.appversion.override", "5.0 (Windows; LANG)");
  m_JDF_prefs.setStringPreference("general.buildID.override", "0");
  m_JDF_prefs.setStringPreference("general.oscpu.override", "Windows NT 5.1");   
  m_JDF_prefs.setStringPreference("general.platform.override", "Win32"); 
  m_JDF_prefs.setStringPreference("general.productsub.override", "20080702");
  m_JDF_prefs.setStringPreference("general.useragent.override", "Mozilla/5.0 (Windows; U; Windows NT 5.1; LANG; rv:1.8.1.16) Gecko/20080702 Firefox/2.0.0.16");
  m_JDF_prefs.setStringPreference("general.useragent.vendor", "");
  m_JDF_prefs.setStringPreference("general.useragent.vendorSub", "");
}

/**
 * Clear all preferences that were set by us
 */
function JDF_clear_prefs() {
  JDF_dump("Clearing preferences");

  m_JDF_prefs.deletePreference("general.appname.override");
  m_JDF_prefs.deletePreference("general.appversion.override");
  m_JDF_prefs.deletePreference("general.buildID.override");
  m_JDF_prefs.deletePreference("general.oscpu.override");
  m_JDF_prefs.deletePreference("general.platform.override");
  m_JDF_prefs.deletePreference("general.productsub.override");
  m_JDF_prefs.deletePreference("general.useragent.override");
  m_JDF_prefs.deletePreference("general.useragent.vendor");
  m_JDF_prefs.deletePreference("general.useragent.vendorSub");
}

/**
 * Return the current number of browser windows
 */
function JDF_get_window_count() {
  var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"].
     getService(Components.interfaces.nsIWindowWatcher);  
  var window_enum = ww.getWindowEnumerator();
  var count = 0;
  while (window_enum.hasMoreElements()) {
    count++;
    window_enum.getNext();
  }
  return count;
}

/** Observer object */
var JDF_observer = {

  // Flag to indicate if preferences should be deleted
  _clear_prefs : false,

  observe : function(subject, topic, data) {
    JDF_dump("Detected: " + subject + " :: " + topic + " :: " + data);
    if (topic == "em-action-requested") {
      // Filter on the item ID here
      subject.QueryInterface(Components.interfaces.nsIUpdateItem);
      if (subject.id == "{437be45a-4114-11dd-b9ab-71d256d89593}") {
        if (data == "item-uninstalled" || data == "item-disabled") {
          // Uninstall or disable
          this._clear_prefs = true;
        } else if (data == "item-cancel-action") {
          // Cancellation ..
          this._clear_prefs = false;
        }
      }
    // Application quit
    } else if (topic == "quit-application-granted") {
      if (this._clear_prefs) {
        // Clear preferences on shutdown
        JDF_clear_prefs();
      }
      // Unregister the observer
      this.unregister( );
    // FIXME: Window closed
    } else if (topic == "xul-window-destroyed") {
      var i = JDF_get_window_count();
      JDF_dump("Closed window " + i);
      // Last browser window standing:
      // http://forums.mozillazine.org/viewtopic.php?t=308369
      if (i == 0 && this._clear_prefs) {
        JDF_clear_prefs();
      }
    }
  },

  register : function( ) {
    JDF_dump("Registering observer");
    // Register ourselves to process events
    var observerService = Components.classes["@mozilla.org/observer-service;1"].
                             getService(Components.interfaces.nsIObserverService);
    
    observerService.addObserver(this, "em-action-requested", false);
    observerService.addObserver(this, "quit-application-granted", false);
    observerService.addObserver(this, "xpcom-shutdown", false);
    observerService.addObserver(this, "xul-window-destroyed", false);    
   
    // FIXME Set preferences here? This is called whenever a new window opens!
    JDF_set_user_agent();
  },

  unregister : function() {
    JDF_dump("Unregistering observer");
    // Stop processing events
    var observerService = Components.classes["@mozilla.org/observer-service;1"].
                             getService(Components.interfaces.nsIObserverService);

    observerService.removeObserver(this, "em-action-requested");
    observerService.removeObserver(this, "quit-application-granted");    
    observerService.removeObserver(this, "xpcom-shutdown");
    observerService.removeObserver(this, "xul-window-destroyed", false);
  }
}

// Register the observer once (FIXME: For every window?)
JDF_observer.register();

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
