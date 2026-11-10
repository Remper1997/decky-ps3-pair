#!/bin/sh
# Installa PS3 Pair in Decky Loader (da lanciare con sudo)
set -e
SRC=$(cd "$(dirname "$0")" && pwd)
DST=/home/deck/homebrew/plugins/decky-ps3-pair
rm -rf "$DST"
mkdir -p "$DST/dist"
cp "$SRC/plugin.json" "$SRC/package.json" "$SRC/main.py" "$SRC/pad.py" "$DST/"
cp "$SRC/dist/index.js" "$DST/dist/"
cp -r "$SRC/py_modules" "$SRC/defaults" "$DST/"
systemctl restart plugin_loader
echo "PS3 Pair installato in $DST"
