"use strict";

if(!jondofox) var jondofox = {};
if(!jondofox.adblock) jondofox.adblock = {};

jondofox.adblock = {
  jdfManager : Components.classes['@jondos.de/jondofox-manager;1'].
      getService().wrappedJSObject,

  // nsITreeView
  get rowCount() {return this.jdfManager.filterList.length;},
  getCellText : function(row,column){
    return this.jdfManager.filterList[row];
  },
  setTree: function(treebox){ this.treebox = treebox; },

  // Called from adBlocking.xul
  setView : function() {
    document.getElementById('adblock-tree').view = this;
  } 
}
