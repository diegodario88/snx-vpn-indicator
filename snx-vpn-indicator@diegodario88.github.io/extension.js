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

  checkSnxConnectivity() {
    const ifConfigCommand = ["sh", "-c", "ifconfig -a | grep 'tunsnx'"];

    const [, , , stdout] = GLib.spawn_async_with_pipes(
      null,
      ifConfigCommand,
      null,
      GLib.SpawnFlags.SEARCH_PATH,
      null
    );

    const stdoutInputStream = new Gio.DataInputStream({
      base_stream: new Gio.UnixInputStream({ fd: stdout }),
    });

    const [result] = stdoutInputStream.read_line(null);

    stdoutInputStream.close(null);

    return result;
  }

  disconnectSync() {
    GLib.spawn_async(
      null,
      ["snx", "-d"],
      null,
      GLib.SpawnFlags.SEARCH_PATH,
      null
    );

    this.refresh();
  }

  showVpnIcon() {
    if (this._indicator) {
      return;
    }

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

  refresh() {
    const hasConnection = this.checkSnxConnectivity();

    if (hasConnection) {
      this.showVpnIcon();
      return;
    }

    this.hideVpnIcon();
  }

  enable() {
    this.refresh();
    this._intervalId = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      60,
      this.refresh.bind(this)
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
