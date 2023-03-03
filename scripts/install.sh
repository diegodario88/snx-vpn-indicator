#!/bin/bash

echo "Packing the extension..."
rm ../snx-vpn-indicator@diegodario88.github.io.shell-extension.zip -v
gnome-extensions pack ../snx-vpn-indicator@diegodario88.github.io \
    --out-dir="../"

echo "Uninstalling old extension..."
gnome-extensions uninstall snx-vpn-indicator@diegodario88.github.io
rm -rfv ~/.local/share/gnome-shell/extensions/snx-vpn-indicator@diegodario88.github.io

echo "Installing the extension..."
gnome-extensions install ../snx-vpn-indicator@diegodario88.github.io.shell-extension.zip

echo "Cleaning up..."
#rm ../snx-vpn-indicator@diegodario88.github.io.shell-extension.zip

echo "Done! Now restart your session."