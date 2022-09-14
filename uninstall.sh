#!/bin/bash -e

dir=~/.local/share/gnome-shell/extensions/vpn-snx-indicator@diego.dario

if [ -d $dir ]; then
  rm -rf $dir
  echo "success"
fi
