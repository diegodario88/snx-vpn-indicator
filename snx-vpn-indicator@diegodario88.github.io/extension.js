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

/**
 * @typedef ExtensionMeta
 * @type {object}
 * @property {object} metadata - the metadata.json file, parsed as JSON
 * @property {string} uuid - the extension UUID
 * @property {number} type - the extension type; `1` for system, `2` for user
 * @property {Gio.File} dir - the extension directory
 * @property {string} path - the extension directory path
 * @property {string} error - an error message or an empty string if no error
 * @property {boolean} hasPrefs - whether the extension has a preferences dialog
 * @property {boolean} hasUpdate - whether the extension has a pending update
 * @property {boolean} canChange - whether the extension can be enabled/disabled
 * @property {string[]} sessionModes - a list of supported session modes
 */

/**
 * @typedef {Object} SessionParameters
 * @property {string} label - The Office Mode IP address
 * @property {string} value - 192.123.124.1
 */

const { Gio, GObject, NM, GLib, St } = imports.gi;
const { ModalDialog } = imports.ui.modalDialog;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const QuickSettings = imports.ui.quickSettings;
const QuickSettingsMenu = imports.ui.main.panel.statusArea.quickSettings;

/** @type {ExtensionMeta} Me */
const Me = ExtensionUtils.getCurrentExtension();

const SNX_DEVICE_NAME = "tunsnx";
const SNX_LABEL = "SNX VPN";
const ENABLED_VPN_ICON = "network-vpn-symbolic";
const DISABLED_VPN_ICON = "network-vpn-disabled-symbolic";
const ACQUIRING_VPN_ICON = "network-vpn-acquiring-symbolic";

const SnxToggle = GObject.registerClass(
  class SnxToggle extends QuickSettings.QuickMenuToggle {
    _init(hasTunsnxDevice = false) {
      super._init({
        label: SNX_LABEL,
        iconName: hasTunsnxDevice ? ENABLED_VPN_ICON : DISABLED_VPN_ICON,
        toggleMode: true,
        hasMenu: true,
        checked: hasTunsnxDevice,
      });

      this.identifier = SnxToggle.name;
      this.previousCancellable = null;
      this._mainItemsSection = new PopupMenu.PopupMenuSection();
      this._secondaryItemsSection = new PopupMenu.PopupMenuSection();
      this._separator = new PopupMenu.PopupSeparatorMenuItem("Connector");

      this._popupSwitchMenuItem = new PopupMenu.PopupSwitchMenuItem(
        SNX_LABEL,
        this.checked
      );

      this._mainItemsSection.addMenuItem(this._popupSwitchMenuItem);
      this.menu.setHeader(ENABLED_VPN_ICON, _("VPN"));
      this.menu.addMenuItem(this._mainItemsSection);
      this.menu.addMenuItem(this._separator);
      this.menu.addMenuItem(this._secondaryItemsSection);

      this.connectObject(
        "clicked",
        () => this._toggleMode().catch(logError),
        this
      );

      this._popupSwitchMenuItem.connect("toggled", () =>
        this._toggleMode().catch(logError)
      );

      this.connect("popup-menu", () => this.menu.open());

      this.bind_property(
        "checked",
        this._popupSwitchMenuItem._switch,
        "state",
        GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL
      );
    }

    /**
     *
     * @param {string} loginResponse
     */
    _addSessionParameters(loginResponse) {
      const sessionParams = parseSessionParameters(loginResponse);

      sessionParams.forEach((session) =>
        this._secondaryItemsSection.addMenuItem(
          new PopupMenu.PopupMenuItem(
            `${session.label.trim()} : ${session.value.trim()}`
          )
        )
      );

      this._separator.label.text = "Session parameters";
      this.menu.addMenuItem(this._secondaryItemsSection);
    }

    _removeSessionParameters() {
      this._secondaryItemsSection.removeAll();
      this._separator.label.text = "Connector";
    }

    async _toggleMode() {
      if (this.previousCancellable) {
        this.previousCancellable.cancel();
      }

      const cancellable = new Gio.Cancellable();
      this.icon_name = ACQUIRING_VPN_ICON;

      if (this.checked) {
        execCommunicate(
          [
            "zenity",
            "--password",
            "--title=SNX VPN Authentication",
            "--timeout=20",
          ],
          null,
          cancellable
        )
          .then(async (output) => {
            if (!output) {
              this.checked = false;
              this.icon_name = DISABLED_VPN_ICON;
              return;
            }

            const stdout = await execCommunicate(["snx"], output);
            const loginResponse = stdout
              .split("Please enter your password:")
              .pop()
              .trimEnd()
              .trimStart();

            if (
              loginResponse.includes("Access denied") ||
              loginResponse.includes("Authentication failed.")
            ) {
              this.checked = false;
              this.icon_name = DISABLED_VPN_ICON;

              throw new Gio.IOErrorEnum({
                code: Gio.IOErrorEnum.FAILED,
                message: loginResponse,
              });
            }

            this.icon_name = ENABLED_VPN_ICON;
            this._addSessionParameters(loginResponse);
            Main.notify(_("SNX VPN"), _("Successfully connected to VPN"));
          })
          .catch((error) => {
            logError(error);
            if (error.code !== 14) {
              Main.notifyError(_("SNX VPN"), _(error.message));
            }

            this.checked = false;
            this.icon_name = DISABLED_VPN_ICON;
          });

        this.previousCancellable = cancellable;
        return;
      }

      execCommunicate(["snx", "-d"], null, cancellable)
        .then((output) => {
          this._removeSessionParameters();
          Main.notify(_("SNX VPN"), _(output));
        })
        .catch((error) => {
          Main.notifyError(_("SNX VPN"), _(error.message));
        });

      this.previousCancellable = cancellable;
    }
  }
);

const SnxIndicator = GObject.registerClass(
  class SnxIndicator extends QuickSettings.SystemIndicator {
    _init(hasTunsnxDevice = false) {
      super._init();

      this._indicator = this._addIndicator();
      this._indicator.icon_name = "network-vpn-symbolic";
      this._indicator.visible = hasTunsnxDevice;
      this._snxToggle = new SnxToggle(hasTunsnxDevice);
      this.quickSettingsItems.push(this._snxToggle);

      this.connect("destroy", () => {
        this.quickSettingsItems.forEach((item) => item.destroy());
      });

      QuickSettingsMenu._indicators.insert_child_at_index(this, 0);
      QuickSettingsMenu._addItems(this.quickSettingsItems);
    }

    hide() {
      this._indicator.visible = false;
      this._snxToggle.checked = false;
      this._snxToggle.icon_name = DISABLED_VPN_ICON;
    }

    show() {
      this._indicator.visible = true;
      this._snxToggle.checked = true;
      this._snxToggle.icon_name = ENABLED_VPN_ICON;
    }
  }
);

class Extension {
  constructor() {
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
    this._indicator = new SnxIndicator(hasSNX);

    this._networkManagerClient.connect(
      "any-device-added",
      this.handleOnAnyDeviceAdded.bind(this)
    );

    this._networkManagerClient.connect(
      "any-device-removed",
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
  }

  /**
   * @returns {boolean} indicates the presence of an SSL Network Extender
   */
  isTunsnxDevicePresent() {
    return this._networkManagerClient
      .get_devices()
      .map((device) => device.get_description().trim())
      .some((description) => description === SNX_DEVICE_NAME);
  }

  /**
   * Handle show quickSettings indicator whenever a device is added
   * @param {NMClient} _
   * @param {NMDevice} device
   * @returns void
   */
  handleOnAnyDeviceAdded(_, device) {
    const description = device.get_description();
    const shouldAvoid = description !== SNX_DEVICE_NAME;

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
    const shouldAvoid = description !== SNX_DEVICE_NAME;

    if (shouldAvoid) {
      return;
    }

    this._indicator.hide();
  }
}

/**
 * This function is called once when your extension is loaded, not enabled. This
 * is a good time to setup translations or anything else you only do once.
 *
 * You MUST NOT make any changes to GNOME Shell, connect any signals or add any
 * MainLoop sources here.
 *
 * @param {ExtensionMeta} meta - An extension meta object, described below.
 * @returns {Object} an object with enable() and disable() methods
 */
function init(meta) {
  log(`initializing ${meta.metadata.name} version ${meta.metadata.version}`);
  ExtensionUtils.initTranslations();
  return new Extension();
}

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
async function execCommunicate(argv, input = null, cancellable = null) {
  let cancelId = 0;
  let flags = Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE;

  if (input !== null) {
    flags |= Gio.SubprocessFlags.STDIN_PIPE;
  }

  const proc = new Gio.Subprocess({
    argv: argv,
    flags: flags,
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
            message: stderr ? stderr.trim() : GLib.strerror(status),
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
function parseSessionParameters(formattedString) {
  return formattedString
    .split(/\r?\n|\r/g)
    .splice(4, 4)
    .map((p) => ({
      label: p.split(":").shift(),
      value: p.split(":").pop(),
    }));
}
