/******************************************************************************
 * This component is instanciated once on application startup to do the 
 * following:
 *
 * - Replace RefControl functionality by simply forging every referrer
 * - Check for the existence of RefControl to uninstall it in case it is there
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

m_debug = true;

// Log method
function log(message) {
  if (m_debug) dump("RefForgery :: " + message + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////

const CLASS_ID = Components.ID('{cd05fe5d-8815-4397-bcfd-ca3ae4029193}');
const CLASS_NAME = 'Referrer-Forgery'; 
const CONTRACT_ID = '@jondos.de/referrer-forgery;1';

///////////////////////////////////////////////////////////////////////////////
// Observer for "http-on-modify-request"
///////////////////////////////////////////////////////////////////////////////

var refObserver = {

  // Method to forge a referrer
  refForgery: function(channel) {
    try {
      var ref = channel.URI.scheme + "://" + channel.URI.hostPort + "/";
      //log("Forging referrer to " + ref);
      // Set the 'Referer' here
      channel.setRequestHeader("Referer", ref, false);
      if (channel.referrer) {
        // Set referrer.spec only if necessary
        // XXX: performance issue?
        if (channel.referrer.spec != ref) {
          channel.referrer.spec = ref;
        } else {
          //log("!! channel.referrer.spec is already = " + ref);
        }
      }
      return true;
    } catch (ex) {
      log("Got exception: " + ex);
    }
    return false;
  },

  // Call the forgery on every request
  onModifyRequest: function(httpChannel) {
    try {                        
      httpChannel.QueryInterface(Components.interfaces.nsIChannel);
      this.refForgery(httpChannel);
    } catch (ex) {
      log("Got exception: " + ex);
    }
  },

  // In case RefControl is installed, uninstall
  // TODO: Remove, this is now handled in jondofox-manager.js
  checkForRefControl: function() {
    // RefControl uuid
    var id = "{455D905A-D37C-4643-A9E2-F6FEFAA0424A}";
    log("Checking for RefControl ..");
    try {
      // Get the extensions manager
      var em = Components.classes["@mozilla.org/extensions/manager;1"].
                  getService(Components.interfaces.nsIExtensionManager);
      var loc = em.getInstallLocation(id);
      // If present, uninstall
      if (loc != null) {
        log("RefControl found, uninstalling ..");
        // Prompt a message window
        var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].
                         getService(Components.interfaces.nsIPromptService);
        prompts.alert(null, "Attention", "The extension 'RefControl' is now " +
                   "going to be uninstalled since the new version of the " +
                   "JonDoFox extension will replace RefControl's " +
                   "functionality!");
        // Uninstall
        em.uninstallItem(id);
      } else {
        log("RefControl not found");
      }
    } catch (ex) {
      log("Got exception: " + ex);
    }
  },

  // This is called once on application startup
  registerObservers: function() {
    log("Register observers");
    try {
      var observers = Components.classes["@mozilla.org/observer-service;1"].
                         getService(Components.interfaces.nsIObserverService);

      //observers.addObserver(this, "final-ui-startup", false);                 
      observers.addObserver(this, "http-on-modify-request", false);
      observers.addObserver(this, "quit-application-granted", false);
    } catch (ex) {
      log("Got exception: " + ex);
    }
  },

  // Call this once on application shutdown
  unregisterObservers: function() {
    log("Unregister observers");
    try {
      var observers = Components.classes["@mozilla.org/observer-service;1"].
                         getService(Components.interfaces.nsIObserverService);
      
      //observers.removeObserver(this, "final-ui-startup");
      observers.removeObserver(this, "http-on-modify-request");
      observers.removeObserver(this, "quit-application-granted");
    } catch (ex) {
      log("Got exception: " + ex);
    }
  },

  // Implement nsIObserver
  observe: function(subject, topic, data) {
    try {
      switch (topic) {
        case 'app-startup':
          log("Got topic --> " + topic);
          this.registerObservers();
          break;
        
        case 'quit-application-granted':
          log("Got topic --> " + topic);
          this.unregisterObservers();
          break;

        //case 'final-ui-startup':
          //log("Got topic --> " + topic);
          //this.checkForRefControl();
          //break;
        
        case 'http-on-modify-request':
          subject.QueryInterface(Components.interfaces.nsIHttpChannel);
          this.onModifyRequest(subject);
          break;

        default:
          log("!! Topic not handled --> " + topic);
          break;
      }
    } catch (ex) {
      log("Got exception: " + ex);
    }
  },

  // Implement nsISupports
  QueryInterface: function(iid) {
    if (!iid.equals(Components.interfaces.nsISupports) &&
        !iid.equals(Components.interfaces.nsIObserver) &&
        !iid.equals(Components.interfaces.nsISupportsWeakReference))
                        throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  }
}

///////////////////////////////////////////////////////////////////////////////
// The actual component
///////////////////////////////////////////////////////////////////////////////

var ReferrerForgeryModule = {
  
  //firstTime: true,

  // BEGIN nsIModule
  registerSelf: function(compMgr, fileSpec, location, type) {
    log("Registering '" + CLASS_NAME + "' ..");
    //if (this.firstTime) {
    //  this.firstTime = false;
    //  throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
    //}
    compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, 
               fileSpec, location, type);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
                    getService(Components.interfaces.nsICategoryManager);
    catMan.addCategoryEntry("app-startup", "RefForgery", CONTRACT_ID, true, 
              true);
  },

  unregisterSelf: function(compMgr, fileSpec, location) {
    log("Unregistering '" + CLASS_NAME + "' ..");
    // Remove the auto-startup
    compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation(CLASS_ID, fileSpec);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
                    getService(Components.interfaces.nsICategoryManager);
    catMan.deleteCategoryEntry("app-startup", CONTRACT_ID, true);
  },

  getClassObject: function(compMgr, cid, iid) {
    if (!cid.equals(CLASS_ID))
      throw Components.results.NS_ERROR_FACTORY_NOT_REGISTERED;
    if (!iid.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this.classFactory;
  },

  canUnload: function(compMgr) { 
    return true; 
  },
  // END nsIModule

  // Implement nsIFactory
  classFactory: {
    createInstance: function(outer, iid) {
      log("Creating instance");
      if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;

      return refObserver.QueryInterface(iid);
    }
  }
};

///////////////////////////////////////////////////////////////////////////////
// This function is called when the application registers the component
///////////////////////////////////////////////////////////////////////////////

function NSGetModule(comMgr, fileSpec) { 
  return ReferrerForgeryModule;
}
