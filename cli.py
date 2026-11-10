"""PS3 Pair from the terminal: uses the same backend as the Decky plugin (main.py).

Usage (root is needed to read /var/lib/bluetooth):
  sudo python3 -I cli.py status
  sudo python3 -I cli.py pair [seconds]
  sudo python3 -I cli.py trust
  sudo python3 -I cli.py backup
  sudo python3 -I cli.py identify AA:BB:CC:DD:EE:FF
  sudo python3 -I cli.py rumble AA:BB:CC:DD:EE:FF
  sudo python3 -I cli.py battery AA:BB:CC:DD:EE:FF
  sudo python3 -I cli.py off AA:BB:CC:DD:EE:FF
  sudo python3 -I cli.py combo [seconds]

All output is also appended to ~/.local/share/ps3-bt/cli.log
"""

import asyncio
import datetime
import os
import pwd
import sys
import types

HERE = os.path.dirname(os.path.abspath(__file__))
USER_HOME = pwd.getpwnam(os.environ.get("SUDO_USER") or "deck").pw_dir
LOG = os.path.join(USER_HOME, ".local/share/ps3-bt/cli.log")


def out(*a):
    line = datetime.datetime.now().strftime("%H:%M:%S ") + " ".join(str(x) for x in a)
    print(line, flush=True)
    try:
        with open(LOG, "a") as f:
            f.write(line + "\n")
        os.chmod(LOG, 0o644)
    except OSError:
        pass


# Fake "decky" module: the backend logs here instead of Decky's log.
decky = types.ModuleType("decky")
decky.DECKY_USER_HOME = USER_HOME
decky.logger = types.SimpleNamespace(info=lambda m: out("[backend]", m), debug=lambda m: None)


async def _emit(event, *args):
    out("[event]", event, *args)


decky.emit = _emit
sys.modules["decky"] = decky
sys.path.insert(0, HERE)
import main  # noqa: E402


def show_file(label, path):
    if not os.path.exists(path):
        out(f"  {label}: (missing)")
        return
    d = main._read_info(path)
    out(f"  {label}: Trusted={d.get('Trusted', '?')} CablePairing={d.get('CablePairing', '?')}")


async def status(p):
    out("== STATUS")
    out("persistence (service enabled):", await p.get_persist())
    keys = set(main._cable_devices()) | set(main._backup_devices())
    try:
        objs = await p._objects()
    except Exception as e:
        objs = {}
        out("D-Bus not available:", repr(e))
    live = {}
    for path, ifaces in objs.items():
        d = ifaces.get("org.bluez.Device1")
        if d:
            live[d["Address"][1].upper()] = (path, d)
    if not keys:
        out("no cable-paired controller in BlueZ or in the backup")
    for ad, dev in sorted(keys):
        out(f"- {dev} (adapter {ad})")
        show_file("BlueZ file", os.path.join(main.BT_LIB, ad, dev, "info"))
        show_file("backup    ", os.path.join(main.BACKUP_DIR, ad, dev, "info"))
        if dev.upper() in live:
            _, d = live[dev.upper()]
            g = lambda k: d.get(k, ("b", "?"))[1]
            out(
                f"  BlueZ live: Trusted={g('Trusted')} Connected={g('Connected')} "
                f"player={main.pad.player_number(dev)} battery={main.pad.battery(dev)}"
            )
        else:
            out("  BlueZ live: not loaded")


async def trust(p):
    """Mark every cable-paired controller loaded in BlueZ as trusted."""
    cable = {dev.upper() for _, dev in main._cable_devices()}
    for path, ifaces in (await p._objects()).items():
        d = ifaces.get("org.bluez.Device1")
        if d and d["Address"][1].upper() in cable and not d.get("Trusted", ("b", False))[1]:
            await p._set_trusted(path)
            out("set Trusted:", d["Address"][1])
    await asyncio.sleep(2)


async def run(cmd, arg):
    p = main.Plugin()
    try:
        if cmd == "status":
            await status(p)
        elif cmd == "pair":
            secs = int(arg or 60)
            out(f"== PAIR: {secs}s window, plug the PS3 in with the cable (Ctrl+C to quit)")
            await p.start_pairing(secs)
            while await p.pairing_left() > 0:
                await asyncio.sleep(1)
            await asyncio.sleep(4)  # let _after_pair finish
            await status(p)
        elif cmd == "trust":
            await trust(p)
            await status(p)
        elif cmd == "identify":
            out("identify", arg, "->", await p.identify(arg or ""))
        elif cmd == "off":
            out("off", arg, "->", await p.power_off(arg or ""))
        elif cmd == "rumble":
            out("rumble", arg, "->", await p.rumble(arg or ""))
        elif cmd == "battery":
            out("battery", arg, main.pad.battery(arg or ""), "-> LEDs", await p.show_battery(arg or ""))
        elif cmd == "combo":
            out("== COMBO: hold SELECT+START for 1.5 s on a PS3 (Ctrl+C to quit)")
            w = main.pad.ComboWatcher(lambda *a: out("[combo]", *a))
            w.start()
            await asyncio.sleep(int(arg or 60))
            w.stop()
        elif cmd == "backup":
            out("sync:", await p._sync() or "(nothing to restore)")
            await status(p)
        else:
            print(__doc__)
    finally:
        await p._unload()


if __name__ == "__main__":
    if os.geteuid() != 0:
        print("Run with sudo (needed to read /var/lib/bluetooth).")
        sys.exit(1)
    try:
        asyncio.run(run(sys.argv[1] if len(sys.argv) > 1 else "", sys.argv[2] if len(sys.argv) > 2 else None))
    except KeyboardInterrupt:
        out("interrupted")
