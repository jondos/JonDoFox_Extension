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
  getColumnProperties: function(col, elem, prop){},
  isSorted: function(){},
  isContainer: function(index){return false},
  isSeparator: function(index){return false},
  getRowProperties: function(index, prop){},
  getCellProperties: function(row, col, prop){},
  getImageSrc: function(row, col){},
  cycleHeader: function(col){},

  // Called from adBlocking.xul
  setView : function() {
    document.getElementById('adblock-tree').view = this;
  } 
}
