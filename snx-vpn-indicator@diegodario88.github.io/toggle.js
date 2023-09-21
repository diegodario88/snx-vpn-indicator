import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import {
  PopupMenuSection,
  PopupSeparatorMenuItem,
  PopupSwitchMenuItem,
  PopupMenuItem
} from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { QuickMenuToggle } from 'resource:///org/gnome/shell/ui/quickSettings.js';
import {
  CONSTANTS,
  VPN_NOTIFY,
  execCommunicate,
  parseSessionParameters
} from './util.js';

export const SnxToggle = GObject.registerClass(
  class SnxToggle extends QuickMenuToggle {
    _init(hasTunsnxDevice = false, cwd) {
      const config = {
        toggleMode: true,
        hasMenu: true,
        checked: hasTunsnxDevice
      };

      config.title = CONSTANTS['SNX_LABEL'];

      super._init(config);

      this.cwd = cwd;
      this.icon_name = hasTunsnxDevice
        ? CONSTANTS['ENABLED_VPN_ICON']
        : CONSTANTS['DISABLED_VPN_ICON'];

      this.previousCancellable = null;
      this._mainItemsSection = new PopupMenuSection();
      this._separator = new PopupSeparatorMenuItem('Connector');

      this._popupSwitchMenuItem = new PopupSwitchMenuItem(
        CONSTANTS['SNX_LABEL_EXTENDED'],
        this.checked
      );

      this._mainItemsSection.addMenuItem(this._popupSwitchMenuItem);
      this.menu.setHeader(CONSTANTS['ENABLED_VPN_ICON'], _('VPN'));
      this.menu.addMenuItem(this._mainItemsSection);
      this.menu.addMenuItem(this._separator);

      this.connectObject(
        'clicked',
        () => this._toggleMode().catch(logError),
        this
      );

      this._popupSwitchMenuItem.connect('toggled', () =>
        this._toggleMode().catch(logError)
      );

      this.connect('popup-menu', () => this.menu.open());

      this.bind_property(
        'checked',
        this._popupSwitchMenuItem._switch,
        'state',
        GObject.BindingFlags.SYNC_CREATE | GObject.BindingFlags.BIDIRECTIONAL
      );
    }

    /**
     *
     * @param {string} loginResponse
     */
    _addSessionParameters(loginResponse) {
      this._removeSessionParameters();
      const sessionParams = parseSessionParameters(loginResponse);

      sessionParams.forEach((session) =>
        this.menu.addMenuItem(
          new PopupMenuItem(`${session.label.trim()} : ${session.value.trim()}`)
        )
      );

      this._separator.label.text = 'Session parameters';
    }

    _removeSessionParameters() {
      const items = this.menu._getMenuItems();
      items.forEach((item) => {
        if (item instanceof PopupMenuItem) {
          item.destroy();
        }
      });

      this._separator.label.text = 'Connector';
    }

    /**
     *
     * @param {Gio.Cancellable} cancellable
     * @returns void
     */
    async _handleCheckedAction(cancellable) {
      try {
        const passwordPromptOutput = await execCommunicate(
          [
            'zenity',
            '--password',
            '--title=SNX VPN Authentication ',
            '--timeout=20'
          ],
          null,
          cancellable
        );

        if (!passwordPromptOutput) {
          throw new Gio.IOErrorEnum({
            code: Gio.IOErrorEnum.FAILED,
            message: 'No password'
          });
        }

        const stdout = await execCommunicate(
          [`${this.cwd}/bridge-snx-cli.sh`, passwordPromptOutput],
          null
        );

        const loginResponse = stdout
          .split('Please enter your password:')
          .pop()
          .trimEnd()
          .trimStart();

        if (!loginResponse.includes('Session parameters:')) {
          throw new Gio.IOErrorEnum({
            code: Gio.IOErrorEnum.FAILED,
            message: loginResponse
          });
        }

        this._addSessionParameters(loginResponse);

        VPN_NOTIFY(
          _('Successfully connected to VPN'),
          CONSTANTS['ENABLED_VPN_ICON']
        );
      } catch (error) {
        logError(error);
        if (error.code !== 14) {
          VPN_NOTIFY(_(error.message), CONSTANTS['NO_ROUTE_VPN_ICON']);
        }

        this.checked = false;
        this.icon_name = CONSTANTS['DISABLED_VPN_ICON'];
      }
    }

    /**
     *
     * @param {Gio.Cancellable} cancellable
     * @returns void
     */
    async _handleUncheckedAction(cancellable) {
      try {
        const output = await execCommunicate(
          ['/usr/bin/snx', '-d'],
          null,
          cancellable
        );

        VPN_NOTIFY(_(output), CONSTANTS['DISCONNECTED_VPN_ICON']);
      } catch (error) {
        logError(error);
        VPN_NOTIFY(_(error.message), CONSTANTS['NO_ROUTE_VPN_ICON']);
      }
    }

    async _toggleMode() {
      if (this.previousCancellable) {
        this.previousCancellable.cancel();
      }

      const cancellable = new Gio.Cancellable();
      this.icon_name = CONSTANTS['ACQUIRING_VPN_ICON'];

      if (this.checked) {
        this._handleCheckedAction(cancellable);
        this.previousCancellable = cancellable;
        return;
      }

      this._handleUncheckedAction(cancellable);
      this.previousCancellable = cancellable;
    }
  }
);
