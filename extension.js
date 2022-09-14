const { GObject } = imports.gi;
const St = imports.gi.St;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;
const Clutter = imports.gi.Clutter;

const VpnIndicator = GObject.registerClass(
  {
    GTypeName: "VpnIndicator",
    Signals: { activate: {} },
  },
  class VpnIndicator extends PanelMenu.Button {
    _init(user) {
      super._init(0.0, "VPN SNX Indicator", false);

      this.uiIcon = new St.Icon({
        icon_name: "network-vpn-symbolic",
        style_class: "system-status-icon",
      });

      this.uiBtnVPN = new St.Label({
        y_align: Clutter.ActorAlign.CENTER,
        style_class: "system-status-icon",
      });

      this.uiBox = new St.BoxLayout();
      this.uiBox.add_actor(this.uiIcon);
      this.uiBox.add_actor(this.uiBtnVPN);
      this.add_actor(this.uiBox);

      this.uiMiDisconnectSNX = new PopupMenu.PopupMenuItem("Disconnect SNX");
      this.uiMiDisconnectSNX.connect(
        "activate",
        this._disconnectSNX.bind(this)
      );
      this.menu.addMenuItem(this.uiMiDisconnectSNX);

      Main.panel.addToStatusArea("vpn-snx-indicator", this);

      this._refresh();

      this._timer = Mainloop.timeout_add_seconds(2, this._refresh.bind(this));
    }

    _checkSNX() {
      let [res, out, err, exit] = GLib.spawn_sync(
        null,
        ["ip", "link", "show", "tunsnx"],
        null,
        GLib.SpawnFlags.SEARCH_PATH,
        null
      );
      return exit;
    }

    _disconnectSNX() {
      GLib.spawn_async(
        null,
        ["snx", "-d"],
        null,
        GLib.SpawnFlags.SEARCH_PATH,
        null
      );
      this._refresh();
    }

    _refresh() {
      let hasConnection = this._checkSNX();
      this.uiMiDisconnectSNX.visible = hasConnection == 0;
      this.visible = hasConnection == 0;

      if (hasConnection == 0) {
        this.uiBtnVPN.set_text("SNX-VPN");
        return true;
      }

      this.uiBtnVPN.set_text("");
      return true;
    }

    destroy() {
      this.uiMiDisconnectSNX.destroy();
      this.uiIcon.destroy();
      this.uiBtnVPN.destroy();
      this.uiBox.destroy();

      if (this._timer) {
        Mainloop.source_remove(this._timer);
        this._timer = undefined;
      }
      super.destroy();
    }
  }
);

var indicator = null;

function init() {}

function enable() {
  indicator = new VpnIndicator();
}

function disable() {
  indicator?.destroy();
  indicator = null;
}
