#!/bin/bash -e

dir=~/.local/share/gnome-shell/extensions/snx-vpn-indicator@diego.dario

if [ -d $dir ]; then
  rm -rf $dir
  echo "success"
fi
