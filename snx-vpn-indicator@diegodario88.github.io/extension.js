/*
 * Snx VPN Indicator for GNOME Shell 43+
 * Copyright 2024 Diego Dario
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

import NM from 'gi://NM';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { SnxIndicator } from './indicator.js';
import { CONSTANTS, NMDeviceStateReason } from './util.js';

export default class SnxVPNExtension extends Extension {
  constructor(metadata) {
    super(metadata);
    this._indicator = null;
    this._networkManagerClient = null;
  }

  /**
   * This function is called when your extension is enabled, which could be
   * done in GNOME Extensions, when you log in or when the screen is unlocked.
   *
   * This is when you should setup any UI for your extension, change existing
   * widgets, connect signals or modify GNOME Shell's behaviour.
   */
  enable() {
    this._networkManagerClient = NM.Client.new(null);
    const hasSNX = this.isTunsnxDevicePresent();
    this._indicator = new SnxIndicator(hasSNX, this.path);

    this._networkManagerClient.connect(
      'any-device-added',
      this.handleOnAnyDeviceAdded.bind(this)
    );

    this._networkManagerClient.connect(
      'any-device-removed',
      this.handleOnAnyDeviceRemoved.bind(this)
    );
  }

  /**
   * This function is called when your extension is uninstalled, disabled in
   * GNOME Extensions, when you log out or when the screen locks.
   *
   * Anything you created, modified or setup in enable() MUST be undone here.
   * Not doing so is the most common reason extensions are rejected in review!
   */
  disable() {
    this._indicator.destroy();
    this._indicator = null;

    this._networkManagerClient.disconnect(
      this.handleOnAnyDeviceAdded.bind(this)
    );

    this._networkManagerClient.disconnect(
      this.handleOnAnyDeviceRemoved.bind(this)
    );

    this._networkManagerClient = null;
  }

  /**
   * @returns {boolean} indicates the presence of an SSL Network Extender
   */
  isTunsnxDevicePresent() {
    return this._networkManagerClient
      .get_devices()
      .map((device) => device.get_description().trim())
      .some((description) => description === CONSTANTS['SNX_DEVICE_NAME']);
  }

  /**
   * Handle show quickSettings indicator whenever a device is added
   * @param {NMClient} _
   * @param {NMDevice} device
   * @returns void
   */
  handleOnAnyDeviceAdded(_, device) {
    const description = device.get_description();
    const shouldAvoid = description !== CONSTANTS['SNX_DEVICE_NAME'];

    if (shouldAvoid) {
      return;
    }

    this._indicator.show();
  }

  /**
   * Handle hide quickSettings indicator whenever a device is removed
   * @param {NMClient} _
   * @param {NMDevice} device
   * @returns void
   */
  handleOnAnyDeviceRemoved(_, device) {
    const description = device.get_description();
    const shouldAvoid = description !== CONSTANTS['SNX_DEVICE_NAME'];

    if (shouldAvoid) {
      return;
    }

    const stateReasonCode = device.get_state_reason();
    const reason = NMDeviceStateReason[stateReasonCode];
    this._indicator.hide(reason);
  }
}
