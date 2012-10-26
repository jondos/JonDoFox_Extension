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

// The testing idea is to check the faked screen values (partly) via the hooks
// applied to the window object itself after deleting the hooked screen values.
// That means the results of this test should be interpreted looking at the
// results of the tests in testWindowHooksRemote.js. I.e. we can be sure that
// everything is okay with the screen hooks after trying to delete them if all
// tests in testWindowHooksRemote.js pass AND all tests below pass as well.

var setupModule = function (module) {
  module.controller = mozmill.getBrowserController();
  // We should make sure the user does not already have a window with multiples
  // of 50 by default.
  controller.window.resizeTo(511, 432);
  // Test requesting remote content.
  controller.open('https://www.torproject.org');
  controller.waitForPageLoad();
  // Thanks to whimboo for the help on IRC.
  // Global vars are evil...
  controller.testContentWin = XPCNativeWrapper.unwrap(controller.tabs.activeTab.
    defaultView);
  // Trying to delete the hooked screen values.
  var win = controller.testContentWin;
  if (null === win.__proto__) {
    // Gregory Fleischer's idea.
    win.__proto__ = win.valueOf.call().__proto__;
  }
  // If |win.__proto__| is available we try to delete the screen property. If
  // not, well, we just do all the tests and they should pass.
  if (win.__proto__) {
    delete controller.testContentWin.__proto__.screen;
  }
}

/**
 * We test whether height has the same size as window.innerHeight.
 */
var testScreenHeightHook = function() {
  controller.assert(function() {
    return controller.testContentWin.screen.height === controller.
      testContentWin.innerHeight;
  });
}

/**
 * We test whether width has the same size as window.innerWidth.
 */
var testScreenWidthHook = function() {
  controller.assert(function() {
    return controller.testContentWin.screen.width === controller.
      testContentWin.innerWidth;
  });
}

/**
 * We test whether top is 0.
 */
var testScreenTopHook = function() {
  controller.assert(function() {
    return controller.testContentWin.screen.top === 0;
  });
}

/**
 * We test whether left is 0.
 */
var testScreenLeftHook = function() {
  controller.assert(function() {
    return controller.testContentWin.screen.left === 0;
  });
}

/**
 * We test whether availTop is 0.
 */
var testScreenAvailTopHook = function() {
  controller.assert(function() {
    return controller.testContentWin.screen.availTop === 0;
  });
}

/**
 * We test whether availLeft is 0.
 */
var testScreenAvailLeftHook = function() {
  controller.assert(function() {
    return controller.testContentWin.screen.availLeft === 0;
  });
}

/**
 * We test whether availHeight has the same size as window.innerHeight.
 */
var testScreenAvailHeightHook = function() {
  controller.assert(function() {
    return controller.testContentWin.screen.availHeight === controller.
      testContentWin.innerHeight;
  });
}

/**
 * We test whether availWidth has the same size as window.innerWidth.
 */
var testScreenAvailWidthHook = function() {
  controller.assert(function() {
    return controller.testContentWin.screen.availWidth === controller.
      testContentWin.innerWidth;
  });
}

/**
 * We do not test |colorDepth| and |pixelDepth| as these are not faked.
 */
