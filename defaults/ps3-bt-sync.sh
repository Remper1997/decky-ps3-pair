#!/bin/sh
# Conserva i pairing "via cavo" (CablePairing=true, es. DualShock 3) tra gli aggiornamenti SteamOS.
# 1) ripristina in /var/lib/bluetooth le voci mancanti dal backup in /home
# 2) aggiorna il backup con le voci CablePairing presenti ora
BK=/home/deck/.local/share/ps3-bt/backup
LIB=/var/lib/bluetooth
mkdir -p "$BK"; chmod 700 "$BK"
log() { echo "$*"; logger -t ps3-bt-sync "$*" 2>/dev/null || true; }
rest=0; saved=""

for f in "$BK"/*/*/info; do
  [ -f "$f" ] || continue
  dev=$(basename "$(dirname "$f")"); ad=$(basename "$(dirname "$(dirname "$f")")")
  [ -d "$LIB/$ad" ] || continue          # adattatore diverso: ignora
  if [ ! -f "$LIB/$ad/$dev/info" ]; then
    mkdir -p "$LIB/$ad/$dev" && cp "$f" "$LIB/$ad/$dev/info"
    # un pad accoppiato via cavo è stato autorizzato: va ripristinato come fidato,
    # altrimenti BlueZ rifiuta la connessione ("Access denied") senza un agente
    sed -i 's/^Trusted=false$/Trusted=true/' "$LIB/$ad/$dev/info"
    chmod 700 "$LIB/$ad/$dev"; chmod 600 "$LIB/$ad/$dev/info"
    log "ripristinato $dev"; rest=$((rest+1))
  fi
done

for f in "$LIB"/*/*/info; do
  [ -f "$f" ] || continue
  grep -q '^CablePairing=true' "$f" || continue
  dev=$(basename "$(dirname "$f")"); ad=$(basename "$(dirname "$(dirname "$f")")")
  mkdir -p "$BK/$ad/$dev" && sed 's/^Trusted=false$/Trusted=true/' "$f" > "$BK/$ad/$dev/info"
  saved="$saved $dev"
done
log "riepilogo: ripristinati=$rest, presenti e salvati:${saved:- nessuno}"
