/**
 * @typedef {Object} SessionParameters
 * @property {string} label - The Office Mode IP address
 * @property {string} value - 192.123.124.1
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import {
  Notification,
  Source
} from 'resource:///org/gnome/shell/ui/messageTray.js';

/**
 * Execute a command asynchronously and return the output from `stdout` on
 * success or throw an error with output from `stderr` on failure.
 *
 * If given, @input will be passed to `stdin` and @cancellable can be used to
 * stop the process before it finishes.
 *
 * @param {string[]} argv - a list of string arguments
 * @param {string} [input] - Input to write to `stdin` or %null to ignore
 * @param {Gio.Cancellable} [cancellable] - optional cancellable object
 * @returns {Promise<string>} - The process output
 */
export async function execCommunicate(argv, input = null, cancellable = null) {
  let cancelId = 0;
  let flags = Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE;

  if (input !== null) {
    flags |= Gio.SubprocessFlags.STDIN_PIPE;
  }

  const proc = new Gio.Subprocess({
    argv: argv,
    flags: flags
  });

  proc.init(cancellable);

  if (cancellable instanceof Gio.Cancellable) {
    cancelId = cancellable.connect(() => proc.force_exit());
  }

  return new Promise((resolve, reject) => {
    proc.communicate_utf8_async(input, null, (proc, res) => {
      try {
        let [, stdout, stderr] = proc.communicate_utf8_finish(res);
        const status = proc.get_exit_status();

        if (status !== 0) {
          throw new Gio.IOErrorEnum({
            code: Gio.io_error_from_errno(status),
            message: stderr ? stderr.trim() : GLib.strerror(status)
          });
        }

        resolve(stdout.trim());
      } catch (e) {
        reject(e);
      } finally {
        if (cancelId > 0) {
          cancellable.disconnect(cancelId);
        }
      }
    });
  });
}

/**
 * Extracts session parameters from a formatted string.
 *
 * @param {string} formattedString - The formatted string to extract parameters from.
 * @returns {SessionParameters[]} An array containing the extracted session parameters.
 */
export function parseSessionParameters(formattedString) {
  return formattedString
    .split(/\r?\n|\r/g)
    .splice(4, 4)
    .map((p) => ({
      label: p.split(':').shift(),
      value: p.split(':').pop()
    }));
}

/**
 * @param {string} body
 * @param {string} icon
 */
export function VPN_NOTIFY(body, icon) {
  const source = new MessageTray.getSystemSource();
  const params = {
    source: source,
    title: 'Check Point',
    body: body,
    isTransient: true
  };

  const notification = new MessageTray.Notification(params);

  notification.set({ iconName: icon });

  source.addNotification(notification);
}

export const CONSTANTS = {
  SNX_DEVICE_NAME: 'tunsnx',
  SNX_LABEL: 'SNX VPN',
  SNX_LABEL_EXTENDED: 'SSL Network Extender',
  ENABLED_VPN_ICON: 'network-vpn-symbolic',
  DISABLED_VPN_ICON: 'network-vpn-disabled-symbolic',
  DISCONNECTED_VPN_ICON: 'network-vpn-disconnected-symbolic',
  ACQUIRING_VPN_ICON: 'network-vpn-acquiring-symbolic',
  NO_ROUTE_VPN_ICON: 'network-vpn-no-route-symbolic',
  HOME_DIR: GLib.get_home_dir()
};

export const NMDeviceStateReason = {
  0: 'No reason given',
  1: 'Unknown error',
  2: 'Device is now managed',
  3: 'Device is now unmanaged',
  4: 'The device could not be readied for configuration',
  5: 'IP configuration could not be reserved (no available address, timeout, etc)',
  6: 'The IP config is no longer valid',
  7: 'Secrets were required, but not provided',
  8: '802.1x supplicant disconnected',
  9: '802.1x supplicant configuration failed',
  10: '802.1x supplicant failed',
  11: '802.1x supplicant took too long to authenticate',
  12: 'PPP service failed to start',
  13: 'PPP service disconnected',
  14: 'PPP failed',
  15: 'DHCP client failed to start',
  16: 'DHCP client error',
  17: 'DHCP client failed',
  18: 'Shared connection service failed to start',
  19: 'Shared connection service failed',
  20: 'AutoIP service failed to start',
  21: 'AutoIP service error',
  22: 'AutoIP service failed',
  23: 'The line is busy',
  24: 'No dial tone',
  25: 'No carrier could be established',
  26: 'The dialing request timed out',
  27: 'The dialing attempt failed',
  28: 'Modem initialization failed',
  29: 'Failed to select the specified APN',
  30: 'Not searching for networks',
  31: 'Network registration denied',
  32: 'Network registration timed out',
  33: 'Failed to register with the requested network',
  34: 'PIN check failed',
  35: 'Necessary firmware for the device may be missing',
  36: 'The device was removed',
  37: 'NetworkManager went to sleep',
  38: "The device's active connection disappeared",
  39: 'Device disconnected by user or client',
  40: 'Carrier/link changed',
  41: "The device's existing connection was assumed",
  42: 'The supplicant is now available',
  43: 'The modem could not be found',
  44: 'The Bluetooth connection failed or timed out',
  45: "GSM Modem's SIM Card not inserted",
  46: "GSM Modem's SIM Pin required",
  47: "GSM Modem's SIM Puk required",
  48: "GSM Modem's SIM wrong",
  49: 'InfiniBand device does not support connected mode',
  50: 'A dependency of the connection failed',
  51: 'Problem with the RFC 2684 Ethernet over ADSL bridge',
  52: 'ModemManager not running',
  53: 'The WiFi network could not be found',
  54: 'A secondary connection of the base connection failed',
  55: 'DCB or FCoE configuration failed'
};
