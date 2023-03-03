const { St, Clutter, GLib, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

class Extension {
  _timeout = null;
  _indicator = null;
  _intervalId = 0;

  constructor(uuid) {
    this._uuid = uuid;
    ExtensionUtils.initTranslations(Me.metadata.name);
  }

  checkConnection() {
    const [, stdoutPipe] = GLib.pipe(GLib.PipeFlags.NONBLOCK);
    const [, stderrPipe] = GLib.pipe(GLib.PipeFlags.NONBLOCK);

    const args = ["ifconfig", "-a"];
    const grepArgs = ["grep", "-E", "^(tun0|proton0|ppp0|tunsnx)"];

    const process = Gio.Subprocess.newv(
      [...args, "|", ...grepArgs],
      Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
    );

    process.communicate_async(
      null,
      stdoutPipe,
      stderrPipe,
      null,
      null,
      0,
      null
    );

    process.wait_async((process, result) => {
      const [, exitCode] = process.wait_check_finish(result);

      if (exitCode === 0) {
        const [_, stdoutData] = stdoutPipe.read_all(null);
        if (stdoutData.toString().trim() !== "") {
          showVpnIcon();
        } else {
          hideVpnIcon();
        }
      } else {
        const [_, stderrData] = stderrPipe.read_all(null);
        log(`ifconfig error: ${stderrData}`);
        hideVpnIcon();
      }
    });
  }

  disconnectSync() {
    GLib.spawn_async(
      null,
      ["snx", "-d"],
      null,
      GLib.SpawnFlags.SEARCH_PATH,
      null
    );

    this.checkConnection();
  }

  showVpnIcon() {
    const icon = new St.Icon({
      icon_name: "network-vpn-symbolic",
      style_class: "system-status-icon",
    });

    const popupItem = new PopupMenu.PopupMenuItem("Disconnect from SNX/VPN");

    popupItem.connect("activate", () => {
      this.disconnectSync();
      this.hideVpnIcon();
      Main.notify("Done disconnecting");
    });

    this._indicator = new PanelMenu.Button(0.0, Me.metadata.name, false);
    this._indicator.add_child(icon);
    this._indicator.menu.addMenuItem(popupItem);

    Main.panel.addToStatusArea(this._uuid, this._indicator);
  }

  hideVpnIcon() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
  }

  enable() {
    this.checkConnection();
    this._intervalId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      60,
      this.checkConnection.bind(this)
    );
  }

  disable() {
    if (this._intervalId) {
      GLib.source_remove(this._intervalId);
      this._intervalId = 0;
    }
    this.hideVpnIcon();
  }
}

function init() {
  return new Extension(Me.metadata.uuid);
}
