#!/bin/bash

echo "Packing the extension..."

rm -v snx-vpn-indicator@diegodario88.github.io.shell-extension.zip

gnome-extensions pack snx-vpn-indicator@diegodario88.github.io

echo "Uninstalling old extension..."
gnome-extensions uninstall snx-vpn-indicator@diegodario88.github.io
rm -rfv ~/.local/share/gnome-shell/extensions/snx-vpn-indicator@diegodario88.github.io

echo "Installing the extension..."
gnome-extensions install snx-vpn-indicator@diegodario88.github.io.shell-extension.zip

echo "Done! Now restart your session."