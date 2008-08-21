///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

m_debug = true;

// Log method
function log(message) {
  if (m_debug) dump("RefForgery :: " + message + "\n");
}

///////////////////////////////////////////////////////////////////////////////
// Observer for "http-on-modify-request"
///////////////////////////////////////////////////////////////////////////////

var refObserver = {

  // Method to forge a referrer
  refForgery: function(channel) {
    try {
      var ref = channel.URI.scheme + "://" + channel.URI.hostPort + "/";
      log("Setting referrer to " + ref);
      // Set the 'Referer' here
      channel.setRequestHeader("Referer", ref, false);
      if (channel.referrer) {
        channel.referrer.spec = ref;
      }
      return true;
    } catch (ex) {
      log("Got exception: " + ex);
    }
    // FIXME Never reached?
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

  // This is called once on application startup
  onAppStartup: function() {
    log("App startup");
    try {
      var observers = Components.classes["@mozilla.org/observer-service;1"].
                        getService(Components.interfaces.nsIObserverService);
                        
      observers.addObserver(this, "http-on-modify-request", true);      
    } catch (ex) {
      log("Got exception: " + ex);
    }
  },

  // Implement nsIObserver
  observe: function(subject, topic, data) {
    try {
      switch (topic) {
        case 'http-on-modify-request':
          subject.QueryInterface(Components.interfaces.nsIHttpChannel);
          this.onModifyRequest(subject);
          break;

        case 'app-startup':
          this.onAppStartup();
          break;

        default:
          log("Unknown topic: " + topic);
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

var refForgery = {
  
  CLASS_ID: Components.ID("{cd05fe5d-8815-4397-bcfd-ca3ae4029193}"),
  CONTRACT_ID: "@jondos.de/referrer-forgery;1",
  CLASS_NAME: "Referrer Forgery",

  firstTime: true,

  // Implement nsIModule
  registerSelf: function(compMgr, fileSpec, location, type) {
    log("Registering component: " + this.CLASS_NAME);
    if (this.firstTime) {
      this.firstTime = false;
      throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
    }
    compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(this.CLASS_ID, this.CLASS_NAME, 
       this.CONTRACT_ID, fileSpec, location, type);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
                    getService(Components.interfaces.nsICategoryManager);
    catMan.addCategoryEntry("app-startup", "RefForgery", this.CONTRACT_ID, 
       true, true);
  },

  unregisterSelf: function(compMgr, fileSpec, location) {
    log("Unregistering component: " + this.CLASS_NAME);
    // Remove the auto-startup
    compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.unregisterFactoryLocation(this.CLASS_ID, fileSpec);

    var catMan = Components.classes["@mozilla.org/categorymanager;1"].
                    getService(Components.interfaces.nsICategoryManager);
    catMan.deleteCategoryEntry("app-startup", this.CONTRACT_ID, true);
  },

  getClassObject: function(compMgr, cid, iid) {
    if (!cid.equals(this.CLASS_ID))
      throw Components.results.NS_ERROR_FACTORY_NOT_REGISTERED;
    if (!iid.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this.classFactory;
  },

  canUnload: function(compMgr) { 
    return true; 
  },
  // end Implement nsIModule

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
  return refForgery; 
}
