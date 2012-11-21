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
  // Thanks to whimboo for the help on IRC.
  // Global vars are evil...
  controller.testContentWin = XPCNativeWrapper.unwrap(controller.tabs.activeTab.
    defaultView);
}

/**
 * We test whether the window width on startup is a multiple of 200
 */

var testWindowOuterWidthStartup = function() {
  controller.assert(function() {
    return controller.testContentWin.outerWidth % 200 === 0;
  });
}

/**
 * We test whether the window height on startup is a multiple of 100
 */

var testWindowOuterHeightStartup = function() {
  controller.assert(function() {
    return controller.testContentWin.outerHeight % 100 === 0;
  });
}
