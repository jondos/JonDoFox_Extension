window.__HookObjects = function() { 

  // Return if hooks are already set
  if (typeof(window.__JDF_hooks_ran) === "boolean") {     
    return false;
  }

  // Definition neuer Prototypen für das window-Objekt und Übergabe der Werte
  if (true) {
    window.__proto__.__defineGetter__("outerWidth", function() { return window.innerWidth; });
    window.__proto__.__defineGetter__("outerHeight", function() {  return window.innerHeight; });
    
    //window.__proto__.__defineGetter__("innerWidth", function() { return h_innerWidth;});
    //window.__proto__.__defineGetter__("innerHeight", function() {  return h_innerHeight; }); 
    
    window.__proto__.__defineGetter__("screenX", function() { return 0; });
    window.__proto__.__defineGetter__("screenY", function() { return 0; });    
    window.__proto__.__defineGetter__("pageXOffset", function() { return 0; });
    window.__proto__.__defineGetter__("pageYOffset", function() { return 0; });
    
    //window.__proto__.__defineGetter__("name", function() { return h_pageName; });   
  	  
    // In eine Funktion einbinden um die scr-Variablen zu schützen
    (function () {          
       // Für das window.screen Objekt können keine individuelle getters/setter definiert werden.. 
       var scr = new Object();
       var origScr = window.screen;
          
       scr.__defineGetter__("height", function() { return window.innerHeight; });
       scr.__defineGetter__("width", function() { return window.innerWidth; });      
       scr.__defineGetter__("availTop", function() { return 0; });
       scr.__defineGetter__("availLeft", function() { return 0; });
       scr.__defineGetter__("top", function() { return 0; });
       scr.__defineGetter__("left", function() { return 0; });
       scr.__defineGetter__("availHeight", function() { return window.innerHeight; });
       scr.__defineGetter__("availWidth", function() { return window.innerWidth; });
       scr.__defineGetter__("colorDepth", function() { return origScr.colorDepth; });
       scr.__defineGetter__("pixelDepth", function() { return origScr.pixelDepth; });

       window.__defineGetter__("screen", function() { return scr; });
       window.__defineSetter__("screen", function(a) { return; });
       window.__proto__.__defineGetter__("screen", function() { return scr; });

       // Für Firefox bug 418983 notwendig:
       with(window) {
         var screen = scr;
       }
    })();
  }

  // Use wrappers for objects
  with(window) {
    XPCNativeWrapper = function(a) { return a; };
  }
  with(window.__proto__) {
    XPCNativeWrapper = function(a) { return a; };
  }
  
  // Schutz vor einer Aufdeckung mittels delete-Befehl
  window.__proto__ = null;
  return true;
}

if (typeof(window.__HookObjects) != "undefined") {
  // Set the result
  var res = 23;
  if(!window.__HookObjects()) res = 13;

  window.__HookObjects = undefined; 
  delete window['__HookObjects'];
  window.__JDF_hooks_ran = true;
  
  // XXX
  res;
} else {
  42;
}
