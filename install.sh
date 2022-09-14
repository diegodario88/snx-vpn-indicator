#!/bin/bash -e

dir=~/.local/share/gnome-shell/extensions/vpn-snx-indicator@diego.dario

if [ -d $dir ]; then
  rm -rf $dir
else
  echo "brand-new install..."
fi
mkdir -p $dir
cp -R . $dir

echo "installed:"
ls -al $dir
