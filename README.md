# PS3 Pair

Plugin [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) per usare i controller **DualShock 3** sullo Steam Deck.
*A Decky Loader plugin for using DualShock 3 controllers on the Steam Deck (English UI included).*

## Funzioni

- **Ricorda i PS3 tra gli aggiornamenti di SteamOS.** Il DS3 si accoppia via cavo e BlueZ non salva una chiave: con il cambio di partizione A/B dell'aggiornamento la voce del pad va persa. Un servizio systemd salva le voci in `/home` e le ripristina all'avvio, prima del Bluetooth.
- **Accoppia PS3**: per 60 s il plugin fa da agente BlueZ e autorizza solo i controller Sony collegati via cavo, poi li segna come fidati.
- **Lista dei controller** con numero giocatore (dai LED), batteria, nome personalizzato.
- **Identifica** (LED + vibrazione), **Vibra**, **Spegni** / **Spegni tutti**.
- **Batteria sui LED** tenendo premuti **SELECT + START** per 1,5 s.
- **Ricarica sui LED** col cavo collegato: barra in loop durante la carica, 4 LED fissi a carica completa.
- **Info batteria**: tempo di utilizzo dall'ultima carica completa e del ciclo precedente.
- Interfaccia in italiano e inglese, secondo la lingua di Steam.

## Build e installazione

```sh
npm install
npm run build
sudo ./install.sh        # copia in ~/homebrew/plugins/decky-ps3-pair e riavvia Decky
```

`cli.py` permette di provare il backend da terminale:

```sh
sudo python3 -I cli.py stato
sudo python3 -I cli.py accoppia 60
sudo python3 -I cli.py batteria AA:BB:CC:DD:EE:FF
```

## File sul Deck

| Percorso | Contenuto |
|---|---|
| `~/.local/share/ps3-bt/backup/` | copia delle voci BlueZ dei PS3 |
| `~/.local/share/ps3-bt/ps3-bt-sync.sh` | script di ripristino (`ps3-bt-sync.service`) |
| `~/.local/share/ps3-bt/settings.json` | nomi e opzioni |
| `~/.local/share/ps3-bt/battery.json` | ultimo livello e cicli della batteria |

## Licenze

Codice del plugin: BSD 3-Clause (vedi `LICENSE`).
Include [jeepney](https://gitlab.com/takluyver/jeepney) 0.9.0 in `py_modules/` (licenza MIT, `py_modules/jeepney-0.9.0.dist-info/licenses/`).
