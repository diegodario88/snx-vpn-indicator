/**
 * @typedef {Object} SessionParameters
 * @property {string} label - The Office Mode IP address
 * @property {string} value - 192.123.124.1
 */

const { Gio, GLib } = imports.gi;

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
function parseSessionParameters(formattedString) {
  return formattedString
    .split(/\r?\n|\r/g)
    .splice(4, 4)
    .map((p) => ({
      label: p.split(':').shift(),
      value: p.split(':').pop()
    }));
}

/**
 * Returns the value of the constant based on the given key.
 *
 * @param {string} key - The key of the constant to look for.
 * @returns {string} -The value of the constant corresponding to the key.
 */
function getConstantByKey(key) {
  const constants = {
    SNX_DEVICE_NAME: 'tunsnx',
    SNX_LABEL: 'SNX VPN',
    ENABLED_VPN_ICON: 'network-vpn-symbolic',
    DISABLED_VPN_ICON: 'network-vpn-disabled-symbolic',
    DISCONNECTED_VPN_ICON: 'network-vpn-disconnected-symbolic',
    ACQUIRING_VPN_ICON: 'network-vpn-acquiring-symbolic',
    NO_ROUTE_VPN_ICON: 'network-vpn-no-route-symbolic',
    HOME_DIR: GLib.get_home_dir()
  };
  return constants[key];
}

/**
 *
 * @param {string} text
 * @param {string} body
 * @param {string} icon
 */
function vpnNotify(text, body, icon) {
  const source = new imports.ui.messageTray.Source(
    _(getConstantByKey('SNX_LABEL')),
    icon
  );

  imports.ui.main.messageTray.add(source);

  const notification = new imports.ui.messageTray.Notification(
    source,
    text,
    body
  );

  notification.setTransient(true);
  source.showNotification(notification);
}
