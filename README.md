# PS3 Pair

A [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin for using **DualShock 3** (PS3) controllers on the Steam Deck.
The interface follows the Steam language (English and Italian).

## Features

- **Remember PS3 controllers across SteamOS updates.** A DS3 pairs over the cable and BlueZ stores no link key for it, so the A/B partition switch of a SteamOS update loses the pad's entry. A systemd service keeps a backup of those entries in `/home` and restores them at boot, before Bluetooth starts. It is enabled on the plugin's first start and can be turned off from the menu.
- **Pair PS3**: for 60 s the plugin acts as the BlueZ agent, authorizes Sony controllers plugged in over USB (and nothing else), then marks them as trusted.
- **Controller list** with player number (read from the LEDs), battery, custom name.
- **Identify** (LEDs + rumble), **Rumble**, **Turn off** / **Turn off all**.
- **Battery on the LEDs**: hold **SELECT + START** for 1.5 s.
- **Charging on the LEDs** while the cable is plugged in.
- **Battery info**: usage time since the last full charge and for the previous cycle, to spot a worn battery.

## Install

PS3 Pair is not in the Decky plugin store: it is installed manually from a release zip.

1. In Decky, open **Settings → General** and turn on **Developer mode**.
2. Open the new **Developer** tab and use **Install Plugin from ZIP File** (or **Install Plugin from URL** with the link of the zip in the [Releases](../../releases) page).
3. Open the plugin from the Decky menu. On the first start it enables the restore service on its own.

To update, install the newer zip the same way. To uninstall, remove the plugin from Decky's settings: at the next boot the restore service disables itself.

## First connection of a new controller

A DS3 cannot be discovered over Bluetooth: it only connects to the address stored inside it, and that address can only be written over USB. The cable is needed **once** per controller.

1. Turn the Deck's Bluetooth on.
2. Plug the PS3 controller into the Deck with a USB cable. In Game Mode Steam usually authorizes it on its own; if the pad does not connect, open the plugin, press **Pair PS3** and plug it in again within 60 s.
3. Wait a few seconds, unplug the cable and press the **PS** button: the pad connects over Bluetooth.
4. From now on, just press **PS**. With "Remember PS3 controllers across updates" on, this survives SteamOS updates too.

Note: a DS3 remembers a single host. Plugging it into a PS3 console or another PC pairs it there, and it will need the cable on the Deck again.

## What the LEDs mean

| LEDs | Meaning |
|---|---|
| ▮▯▯▯ … ▯▯▯▮ steady | player number (1–4) |
| all off → bar fills → 2 blinks → steady | battery level after **SELECT + START**: 1 LED up to 25%, 2 up to 50%, 3 up to 75%, 4 up to 100% |
| LED 1 blinking (after SELECT + START) | battery below 25% |
| bar filling in a loop (cable plugged in) | charging. The first round goes 0→4, later rounds start from the last known level |
| 4 steady (cable plugged in) | fully charged |
| fast alternating blink + rumble | **Identify** from the plugin |
| all 4 blinking together, pad not connected | the pad is looking for its host (normal DS3 behaviour): press PS again, or pair it with the cable |

While charging, a DS3 does not report its level, so the bar only means "charging". The battery level has 25% steps (0, 25, 50, 75, 100) and may bounce for a minute right after unplugging; the plugin ignores readings during that minute.

## Build and install

```sh
npm install
npm run build
sudo ./install.sh        # copies to ~/homebrew/plugins/decky-ps3-pair and restarts Decky
```

`cli.py` runs the backend from a terminal:

```sh
sudo python3 -I cli.py status
sudo python3 -I cli.py pair 60
sudo python3 -I cli.py battery AA:BB:CC:DD:EE:FF
```

## Files on the Deck

| Path | Content |
|---|---|
| `~/.local/share/ps3-bt/backup/` | backup of the PS3 BlueZ entries |
| `~/.local/share/ps3-bt/ps3-bt-sync.sh` | restore script, run by `ps3-bt-sync.service` |
| `~/.local/share/ps3-bt/settings.json` | names and options |
| `~/.local/share/ps3-bt/battery.json` | last level and battery cycles |

If the plugin is uninstalled, the service notices at the next boot and disables itself; the backup is kept.

## Licenses

Plugin code: BSD 3-Clause (see `LICENSE`).
Bundles [jeepney](https://gitlab.com/takluyver/jeepney) 0.9.0 in `py_modules/` (MIT license, `py_modules/jeepney-0.9.0.dist-info/licenses/`).
