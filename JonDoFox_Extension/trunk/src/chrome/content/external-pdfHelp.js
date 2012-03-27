/******************************************************************************
 * Copyright (C) 2010-2012, JonDos GmbH
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

Components.utils.import("resource://jondofox/jdfUtils.jsm");

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

