/** Copyright (C) 2012 by Georg Koppen
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var setupModule = function (module) {
  module.controller = mozmill.getBrowserController();
  // We should make sure the user does not already have a window with multiples
  // of 50 by default.
  controller.window.resizeTo(511, 432);
  // Test requesting local content. We can be sure that this very file exists
  // locally during executing, thus throwing the execption which should give
  // us the platform dependent filename. But as the test is executed inside
  // the Mozmill extension (in particular using the frame.js) we need to get
  // rid of that part of the filename output first...
  controller.open(Components.Exception().filename.
    replace("resource://mozmill/modules/frame.js -> ", ""));
  controller.waitForPageLoad();
  // Thanks to whimboo for the help on IRC.
  // Global vars are evil...
  controller.testContentWin = XPCNativeWrapper.unwrap(controller.tabs.activeTab.
    defaultView);
}

/**
 * We test whether innerHeight is a multiple of 50.
 */
var testWindowInnerHeigthHook = function() {
  controller.assert(function() {
    return controller.testContentWin.innerHeight % 50 === 0;
  });
}

/**
 * We test whether innerWidth is a multiple of 50.
 */
var testWindowInnerWidthHook = function() {
  controller.assert(function() {
    return controller.testContentWin.innerWidth % 50 === 0;
  });
}

/**
 * We test whether outerHeight is a multiple of 50.
 */
var testWindowOuterHeigthHook = function() {
  controller.assert(function() {
    return controller.testContentWin.outerHeight % 50 === 0;
  });
}

/**
 * We test whether outerWidth is a multiple of 50.
 */
var testWindowOuterWidthHook = function() {
  controller.assert(function() {
    return controller.testContentWin.outerWidth % 50 === 0;
  });
}

/**
 * We test whether screenX is 0.
 */
var testWindowScreenXHook = function() {
  controller.assert(function() {
    return controller.testContentWin.screenX === 0;
  });
}

/**
 * We test whether screenY is 0.
 */
var testWindowScreenYHook = function() {
  controller.assert(function() {
    return controller.testContentWin.screenY === 0;
  });
}

