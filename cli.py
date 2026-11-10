"""PS3 Pair da terminale: usa lo stesso backend del plugin Decky (main.py).

Uso (serve root per leggere /var/lib/bluetooth):
  sudo python3 -I /home/deck/Projects/decky-ps3-pair/cli.py stato
  sudo python3 -I /home/deck/Projects/decky-ps3-pair/cli.py accoppia [secondi]
  sudo python3 -I /home/deck/Projects/decky-ps3-pair/cli.py fidati
  sudo python3 -I /home/deck/Projects/decky-ps3-pair/cli.py backup
  sudo python3 -I /home/deck/Projects/decky-ps3-pair/cli.py identifica AA:BB:CC:DD:EE:FF
  sudo python3 -I /home/deck/Projects/decky-ps3-pair/cli.py vibra AA:BB:CC:DD:EE:FF
  sudo python3 -I /home/deck/Projects/decky-ps3-pair/cli.py batteria AA:BB:CC:DD:EE:FF
  sudo python3 -I /home/deck/Projects/decky-ps3-pair/cli.py combo [secondi]

Tutto l'output va anche in /home/deck/.local/share/ps3-bt/cli.log
"""

import asyncio
import datetime
import os
import sys
import types

HERE = os.path.dirname(os.path.abspath(__file__))
LOG = "/home/deck/.local/share/ps3-bt/cli.log"


def out(*a):
    line = datetime.datetime.now().strftime("%H:%M:%S ") + " ".join(str(x) for x in a)
    print(line, flush=True)
    try:
        with open(LOG, "a") as f:
            f.write(line + "\n")
        os.chmod(LOG, 0o644)
    except OSError:
        pass


# Modulo "decky" finto: il backend scrive i log qui invece che nel log di Decky.
decky = types.ModuleType("decky")
decky.DECKY_USER_HOME = "/home/deck"
decky.logger = types.SimpleNamespace(info=lambda m: out("[backend]", m), debug=lambda m: None)


async def _emit(event, *args):
    out("[evento]", event, *args)


decky.emit = _emit
sys.modules["decky"] = decky
sys.path.insert(0, HERE)
import main  # noqa: E402


def show_file(label, path):
    if not os.path.exists(path):
        out(f"  {label}: (assente)")
        return
    d = main._read_info(path)
    out(f"  {label}: Trusted={d.get('Trusted', '?')} CablePairing={d.get('CablePairing', '?')}")


async def stato(p):
    out("== STATO")
    out("persistenza (servizio abilitato):", await p.get_persist())
    keys = set(main._cable_devices()) | set(main._backup_devices())
    try:
        objs = await p._objects()
    except Exception as e:
        objs = {}
        out("D-Bus non disponibile:", repr(e))
    live = {}
    for path, ifaces in objs.items():
        d = ifaces.get("org.bluez.Device1")
        if d:
            live[d["Address"][1].upper()] = (path, d)
    if not keys:
        out("nessun controller via cavo né in BlueZ né nel backup")
    for ad, dev in sorted(keys):
        out(f"- {dev} (adattatore {ad})")
        show_file("file BlueZ ", os.path.join(main.BT_LIB, ad, dev, "info"))
        show_file("backup     ", os.path.join(main.BACKUP_DIR, ad, dev, "info"))
        if dev.upper() in live:
            _, d = live[dev.upper()]
            g = lambda k: d.get(k, ("b", "?"))[1]
            out(f"  BlueZ live : Trusted={g('Trusted')} Connected={g('Connected')} giocatore={main.pad.player_number(dev)} batteria={main.pad.battery(dev)}")
        else:
            out("  BlueZ live : non caricato")


async def fidati(p):
    """Segna come fidati tutti i controller via cavo caricati in BlueZ."""
    cable = {dev.upper() for _, dev in main._cable_devices()}
    for path, ifaces in (await p._objects()).items():
        d = ifaces.get("org.bluez.Device1")
        if d and d["Address"][1].upper() in cable and not d.get("Trusted", ("b", False))[1]:
            await p._set_trusted(path)
            out("impostato Trusted:", d["Address"][1])
    await asyncio.sleep(2)


async def run(cmd, arg):
    p = main.Plugin()
    try:
        if cmd == "stato":
            await stato(p)
        elif cmd == "accoppia":
            secs = int(arg or 60)
            out(f"== ACCOPPIA: finestra di {secs}s, collega il PS3 col cavo (Ctrl+C per uscire)")
            await p.start_pairing(secs)
            while await p.pairing_left() > 0:
                await asyncio.sleep(1)
            await asyncio.sleep(4)  # lascia finire _after_pair
            await stato(p)
        elif cmd == "fidati":
            await fidati(p)
            await stato(p)
        elif cmd == "identifica":
            out("identifica", arg, "->", await p.identify(arg or ""))
        elif cmd == "spegni":
            out("spegni", arg, "->", await p.power_off(arg or ""))
        elif cmd == "vibra":
            out("vibra", arg, "->", await p.rumble(arg or ""))
        elif cmd == "batteria":
            out("batteria", arg, main.pad.battery(arg or ""), "-> LED", await p.show_battery(arg or ""))
        elif cmd == "combo":
            out("== COMBO: tieni premuti SELECT+START per 1,5 s su un PS3 (Ctrl+C per uscire)")
            w = main.pad.ComboWatcher(lambda *a: out("[combo]", *a))
            w.start()
            await asyncio.sleep(int(arg or 60))
            w.stop()
        elif cmd == "backup":
            out("sync:", await p._sync() or "(niente da ripristinare)")
            await stato(p)
        else:
            print(__doc__)
    finally:
        await p._unload()


if __name__ == "__main__":
    if os.geteuid() != 0:
        print("Lancia con sudo (serve per leggere /var/lib/bluetooth).")
        sys.exit(1)
    try:
        asyncio.run(run(sys.argv[1] if len(sys.argv) > 1 else "", sys.argv[2] if len(sys.argv) > 2 else None))
    except KeyboardInterrupt:
        out("interrotto")
