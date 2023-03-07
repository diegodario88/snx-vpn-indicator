/*
 * Snx VPN Indicator for GNOME Shell 43+
 * Copyright 2023 Diego Dario
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * If this extension breaks your desktop you get to keep all of the pieces...
 */

const { NM, St } = imports.gi;
const PanelMenu = imports.ui.panelMenu;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

let networkManagerClient = null;
let indicator = null;
const SNX_DEVICE_NAME = "tunsnx";

function init() {
  networkManagerClient = NM.Client.new(null);
}

function enable() {
  networkManagerClient.connect("any-device-added", onAnyDeviceAdded);
  networkManagerClient.connect("any-device-removed", onAnyDeviceRemoved);
}

function disable() {
  networkManagerClient.disconnect(onAnyDeviceAdded);
  networkManagerClient.disconnect(onAnyDeviceRemoved);
  networkManagerClient = null;
  destroyVpnIndicator();
}

function onAnyDeviceAdded(_, device) {
  const description = device.get_description();
  const shouldAvoid = description !== SNX_DEVICE_NAME;

  if (shouldAvoid) {
    return;
  }

  createVpnIndicator();
}

function onAnyDeviceRemoved(_, device) {
  const description = device.get_description();
  const shouldAvoid = description !== SNX_DEVICE_NAME;

  if (shouldAvoid) {
    return;
  }

  destroyVpnIndicator();
}

function destroyVpnIndicator() {
  if (!indicator) {
    return;
  }

  indicator.destroy();
  indicator = null;
}

function createVpnIndicator() {
  if (indicator) {
    return;
  }

  const icon = new St.Icon({
    icon_name: "network-vpn-symbolic",
    style_class: "system-status-icon",
  });

  indicator = new PanelMenu.Button(0.0, Me.metadata.name, false);
  indicator.add_child(icon);

  Main.panel.addToStatusArea(Me.metadata.uuid, indicator);
}
