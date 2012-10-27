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
  // Test requesting remote content.
  controller.open('https://www.torproject.org');
  controller.waitForPageLoad();
  // Thanks to whimboo for the help on IRC.
  // Global vars are evil...
  controller.testContentWin = XPCNativeWrapper.unwrap(controller.tabs.activeTab.
    defaultView);
}

/**
 * We test whether |outerHeight| equals |innerHeight|.
 */
var testWindowOuterHeigthHook = function() {
  controller.assert(function() {
    return controller.testContentWin.outerHeight === controller.testContentWin.
      innerHeight;
  });
}

/**
 * We test whether |outerWidth| euqals |innerWidth|.
 */
var testWindowOuterWidthHook = function() {
  controller.assert(function() {
    return controller.testContentWin.outerWidth === controller.testContentWin.
      innerWidth;
  });
}

/**
 * We test whether |screenX| is 0.
 */
var testWindowScreenXHook = function() {
  controller.assert(function() {
    return controller.testContentWin.screenX === 0;
  });
}

/**
 * We test whether |screenY| is 0.
 */
var testWindowScreenYHook = function() {
  controller.assert(function() {
    return controller.testContentWin.screenY === 0;
  });
}

/**
 * We test whether |mozInnerScreenX| is 0.
 */
var testWindowMozInnerScreenXHook = function() {
  controller.assert(function() {
    return controller.testContentWin.mozInnerScreenX === 0;
  });
}

/**
 * We test whether |mozInnerScreenY| is 0.
 */
var testWindowMozInnerScreenYHook = function() {
  controller.assert(function() {
    return controller.testContentWin.mozInnerScreenY === 0;
  });
}
