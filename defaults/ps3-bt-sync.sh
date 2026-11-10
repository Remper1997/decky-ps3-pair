#!/bin/sh
# Keeps cable pairings (CablePairing=true, e.g. DualShock 3) across SteamOS updates.
# Installed by the PS3 Pair Decky plugin (@HOME@ is replaced at install time).
# 1) restore entries missing from /var/lib/bluetooth using the backup in /home
# 2) refresh the backup with the CablePairing entries present now
BK=@HOME@/.local/share/ps3-bt/backup
LIB=/var/lib/bluetooth
PLUGINS=@HOME@/homebrew/plugins
UNIT=ps3-bt-sync.service
log() { echo "$*"; logger -t ps3-bt-sync "$*" 2>/dev/null || true; }

# Plugin uninstalled: disable this service and stop (the backup is kept).
if [ -d "$PLUGINS" ] && ! grep -qs '"name": *"PS3 Pair"' "$PLUGINS"/*/plugin.json; then
  log "PS3 Pair plugin not found in $PLUGINS: disabling $UNIT (backup kept in $BK)"
  systemctl disable "$UNIT" >/dev/null 2>&1
  rm -f "/etc/systemd/system/$UNIT"
  exit 0
fi

mkdir -p "$BK"; chmod 700 "$BK"
rest=0; saved=""

for f in "$BK"/*/*/info; do
  [ -f "$f" ] || continue
  dev=$(basename "$(dirname "$f")"); ad=$(basename "$(dirname "$(dirname "$f")")")
  [ -d "$LIB/$ad" ] || continue          # different adapter: skip
  if [ ! -f "$LIB/$ad/$dev/info" ]; then
    mkdir -p "$LIB/$ad/$dev" && cp "$f" "$LIB/$ad/$dev/info"
    # a cable-paired pad was authorized once: restore it as trusted, otherwise
    # BlueZ rejects the connection ("Access denied") when no agent answers
    sed -i 's/^Trusted=false$/Trusted=true/' "$LIB/$ad/$dev/info"
    chmod 700 "$LIB/$ad/$dev"; chmod 600 "$LIB/$ad/$dev/info"
    log "restored $dev"; rest=$((rest+1))
  fi
done

for f in "$LIB"/*/*/info; do
  [ -f "$f" ] || continue
  grep -q '^CablePairing=true' "$f" || continue
  dev=$(basename "$(dirname "$f")"); ad=$(basename "$(dirname "$(dirname "$f")")")
  mkdir -p "$BK/$ad/$dev" && sed 's/^Trusted=false$/Trusted=true/' "$f" > "$BK/$ad/$dev/info"
  saved="$saved $dev"
done
log "summary: restored=$rest, present and saved:${saved:- none}"
