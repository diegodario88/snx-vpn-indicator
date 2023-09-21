import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {
  QuickSettingsMenu,
  SystemIndicator
} from 'resource:///org/gnome/shell/ui/quickSettings.js';
import { SnxToggle } from './toggle.js';
import { CONSTANTS } from './util.js';

export const SnxIndicator = GObject.registerClass(
  class SnxIndicator extends SystemIndicator {
    _init(hasTunsnxDevice = false, cwd) {
      super._init();

      this._indicator = this._addIndicator();
      this._indicator.icon_name = CONSTANTS['ENABLED_VPN_ICON'];
      this._indicator.visible = hasTunsnxDevice;
      this._snxToggle = new SnxToggle(hasTunsnxDevice, cwd);
      this.quickSettingsItems.push(this._snxToggle);

      this.connect('destroy', () => {
        this.quickSettingsItems.forEach((item) => item.destroy());
      });

      Main.panel.statusArea.quickSettings.addExternalIndicator(this);
    }

    /**
     * @param {string} reason
     */
    hide(reason) {
      log(`[SnxIndicator] hide: ${reason}`);
      this._indicator.visible = false;
      this._snxToggle.checked = false;
      this._snxToggle.icon_name = CONSTANTS['DISABLED_VPN_ICON'];
      this._snxToggle._removeSessionParameters();
    }

    show() {
      this._indicator.visible = true;
      this._snxToggle.checked = true;
      this._snxToggle.icon_name = CONSTANTS['ENABLED_VPN_ICON'];
    }
  }
);
