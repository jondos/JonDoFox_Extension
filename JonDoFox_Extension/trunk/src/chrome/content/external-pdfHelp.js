/******************************************************************************
 * Copyright (C) 2010, JonDos GmbH
 * Author: Georg Koppen
 *
 *****************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Debug stuff
///////////////////////////////////////////////////////////////////////////////

// Enable/disable debug messages here, do not forget 
// to create 'browser.dom.window.dump.enabled' first!
var mDebug = true;

// Send data to the console if we're in debug mode
function log(msg) {
  if (mDebug) dump("JonDoFox :: " + msg + "\n");
}

// Get the JDFManager
var jdfUtils = Components.classes['@jondos.de/jondofox-utils;1'].
                                 getService().wrappedJSObject;


function externalHelp() {
  try {
    var win = Components.classes['@mozilla.org/appshell/window-mediator;1'].
                 getService(Components.interfaces.nsIWindowMediator).
                 getMostRecentWindow('navigator:browser');
    win.openUILinkIn(jdfUtils.getString('jondofox.pdfHelp.url'), 'tab');
  } catch (e) {
    log("externalHelp(): " + e);
  }
}

