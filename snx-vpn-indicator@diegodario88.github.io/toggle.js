const Main = imports.ui.main;
const { Gio, GObject } = imports.gi;
const QuickSettings = imports.ui.quickSettings;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Util = Me.imports.util;

var SnxToggle = GObject.registerClass(
  class SnxToggle extends QuickSettings.QuickMenuToggle {
    _init(hasTunsnxDevice = false) {
      super._init({
        label: Util.getConstantByKey('SNX_LABEL'),
        iconName: hasTunsnxDevice
          ? Util.getConstantByKey('ENABLED_VPN_ICON')
          : Util.getConstantByKey('DISABLED_VPN_ICON'),
        toggleMode: true,
        hasMenu: true,
        checked: hasTunsnxDevice
      });

      this.previousCancellable = null;
      this._mainItemsSection = new PopupMenu.PopupMenuSection();
      this._secondaryItemsSection = new PopupMenu.PopupMenuSection();
      this._separator = new PopupMenu.PopupSeparatorMenuItem('Connector');

      this._popupSwitchMenuItem = new PopupMenu.PopupSwitchMenuItem(
        Util.getConstantByKey('SNX_LABEL'),
        this.checked
      );

      this._mainItemsSection.addMenuItem(this._popupSwitchMenuItem);
      this.menu.setHeader(Util.getConstantByKey('ENABLED_VPN_ICON'), _('VPN'));
      this.menu.addMenuItem(this._mainItemsSection);
      this.menu.addMenuItem(this._separator);
      this.menu.addMenuItem(this._secondaryItemsSection);

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
      const sessionParams = Util.parseSessionParameters(loginResponse);

      sessionParams.forEach((session) =>
        this._secondaryItemsSection.addMenuItem(
          new PopupMenu.PopupMenuItem(
            `${session.label.trim()} : ${session.value.trim()}`
          )
        )
      );

      this._separator.label.text = 'Session parameters';
      this.menu.addMenuItem(this._secondaryItemsSection);
    }

    _removeSessionParameters() {
      this._secondaryItemsSection.removeAll();
      this._separator.label.text = 'Connector';
    }

    /**
     *
     * @param {Gio.Cancellable} cancellable
     * @returns void
     */
    async _handleCheckedAction(cancellable) {
      try {
        const passwordPromptOutput = await Util.execCommunicate(
          [
            'zenity',
            '--password',
            '--title=SNX VPN Authentication',
            '--timeout=20'
          ],
          null,
          cancellable
        );

        if (!passwordPromptOutput) {
          this.checked = false;
          this.icon_name = Util.getConstantByKey('DISABLED_VPN_ICON');
          return;
        }

        const stdout = await Util.execCommunicate(
          [`${Me.dir.get_path()}/bridge-snx-cli.sh`, passwordPromptOutput],
          null
        );

        const loginResponse = stdout
          .split('Please enter your password:')
          .pop()
          .trimEnd()
          .trimStart();

        if (
          loginResponse.includes('Access denied') ||
          loginResponse.includes('Authentication failed.')
        ) {
          this.checked = false;
          this.icon_name = Util.getConstantByKey('DISABLED_VPN_ICON');

          throw new Gio.IOErrorEnum({
            code: Gio.IOErrorEnum.FAILED,
            message: loginResponse
          });
        }

        this.icon_name = Util.getConstantByKey('ENABLED_VPN_ICON;');
        this._addSessionParameters(loginResponse);
        Main.notify(_('SNX VPN'), _('Successfully connected to VPN'));
      } catch (error) {
        logError(error);
        if (error.code !== 14) {
          Main.notifyError(_('SNX VPN'), _(error.message));
        }

        this.checked = false;
        this.icon_name = Util.getConstantByKey('DISABLED_VPN_ICON');
      }
    }

    /**
     *
     * @param {Gio.Cancellable} cancellable
     * @returns void
     */
    _handleUncheckedAction(cancellable) {
      Util.execCommunicate(['/usr/bin/snx', '-d'], null, cancellable)
        .then((output) => {
          this._removeSessionParameters();
          Main.notify(_('SNX VPN'), _(output));
        })
        .catch((error) => {
          Main.notifyError(_('SNX VPN'), _(error.message));
        });
    }

    async _toggleMode() {
      if (this.previousCancellable) {
        this.previousCancellable.cancel();
      }

      const cancellable = new Gio.Cancellable();
      this.icon_name = Util.getConstantByKey('ACQUIRING_VPN_ICON');

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
