#!/bin/bash -e

dir=~/.local/share/gnome-shell/extensions/snx-vpn-indicator@diegodario88.github.io

if [ -d $dir ]; then
  rm -rf $dir
  echo "success"
fi
