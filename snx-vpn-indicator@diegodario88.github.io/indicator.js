const { GObject } = imports.gi;
const QuickSettingsMenu = imports.ui.main.panel.statusArea.quickSettings;
const QuickSettings = imports.ui.quickSettings;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Util = Me.imports.util;
const Toggle = Me.imports.toggle;

var SnxIndicator = GObject.registerClass(
  class SnxIndicator extends QuickSettings.SystemIndicator {
    _init(hasTunsnxDevice = false) {
      super._init();

      this._indicator = this._addIndicator();
      this._indicator.icon_name = Util.getConstantByKey('ENABLED_VPN_ICON');
      this._indicator.visible = hasTunsnxDevice;
      this._snxToggle = new Toggle.SnxToggle(hasTunsnxDevice);
      this.quickSettingsItems.push(this._snxToggle);

      this.connect('destroy', () => {
        this.quickSettingsItems.forEach((item) => item.destroy());
      });

      QuickSettingsMenu._indicators.insert_child_at_index(this, 0);
      this.addQuickSettingsItems();
    }

    addQuickSettingsItems() {
      QuickSettingsMenu._addItems(this.quickSettingsItems);

      if (Util.getGnomeShellVersion() < 44) {
        return;
      }

      for (const item of this.quickSettingsItems) {
        QuickSettingsMenu.menu._grid.set_child_below_sibling(
          item,
          QuickSettingsMenu._backgroundApps.quickSettingsItems[0]
        );
      }
    }

    hide() {
      this._indicator.visible = false;
      this._snxToggle.checked = false;
      this._snxToggle.icon_name = Util.getConstantByKey('DISABLED_VPN_ICON');
    }

    show() {
      this._indicator.visible = true;
      this._snxToggle.checked = true;
      this._snxToggle.icon_name = Util.getConstantByKey('ENABLED_VPN_ICON');
    }
  }
);
