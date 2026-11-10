"""PS3 Pair - backend.

Pairs PS3 controllers (DualShock 3) over the USB cable and keeps their pairing
across SteamOS updates.

How pairing works: when a DS3 is plugged in over USB, BlueZ's "sixaxis" plugin
asks the default Bluetooth agent to authorize it. For a limited time window this
plugin registers its own agent as the default one, authorizes Sony controllers
only, then unregisters (BlueZ falls back to the previous agent).

Why pairings get lost: SteamOS updates switch between A/B partitions, each with
its own /var. The DS3 has no link key (cable pairing), so its BlueZ entry is not
carried over. A systemd service restores the entries from a backup in /home
before bluetooth.service starts.
"""

import asyncio
import glob
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "py_modules"))
sys.path.insert(0, os.path.dirname(__file__))

import decky  # noqa: E402
import pad  # noqa: E402
from jeepney import DBusAddress, MatchRule, Properties, new_method_call  # noqa: E402
from jeepney.io.asyncio import open_dbus_router  # noqa: E402
from jeepney.low_level import HeaderFields  # noqa: E402
from jeepney.wrappers import new_error, new_method_return, unwrap_msg  # noqa: E402

BLUEZ = "org.bluez"
AGENT_PATH = "/ps3pair/agent"
SONY_VENDOR = "054c"
BT_LIB = "/var/lib/bluetooth"

USER_HOME = getattr(decky, "DECKY_USER_HOME", "/home/deck")
PERSIST_DIR = os.path.join(USER_HOME, ".local/share/ps3-bt")
BACKUP_DIR = os.path.join(PERSIST_DIR, "backup")
SYNC_SCRIPT = os.path.join(PERSIST_DIR, "ps3-bt-sync.sh")
UNIT_NAME = "ps3-bt-sync.service"
UNIT_PATH = "/etc/systemd/system/" + UNIT_NAME
DEFAULTS = os.path.join(os.path.dirname(__file__), "defaults")
SETTINGS = os.path.join(PERSIST_DIR, "settings.json")
pad.STATE_FILE = os.path.join(PERSIST_DIR, "battery.json")


def _load_settings():
    try:
        with open(SETTINGS) as f:
            d = json.load(f)
            if isinstance(d, dict):
                return d
    except (OSError, ValueError):
        pass
    return {}


def _save_settings(d):
    os.makedirs(PERSIST_DIR, exist_ok=True)
    tmp = SETTINGS + ".tmp"
    with open(tmp, "w") as f:
        json.dump(d, f, indent=1, ensure_ascii=False)
    os.chmod(tmp, 0o644)
    os.replace(tmp, SETTINGS)


def _log(*a):
    decky.logger.info(" ".join(str(x) for x in a))


def _read_info(path):
    """Read a BlueZ info file into a flat {key: value} dict ([General] only)."""
    out, section = {}, None
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line.startswith("["):
                    section = line
                elif "=" in line and section == "[General]":
                    k, v = line.split("=", 1)
                    out[k] = v
    except OSError:
        pass
    return out


def _cable_devices():
    """Entries in /var/lib/bluetooth with CablePairing=true -> {(adapter, addr): info}."""
    found = {}
    for info in glob.glob(os.path.join(BT_LIB, "*", "*", "info")):
        d = _read_info(info)
        if d.get("CablePairing") == "true":
            dev = os.path.basename(os.path.dirname(info))
            ad = os.path.basename(os.path.dirname(os.path.dirname(info)))
            found[(ad, dev)] = d
    return found


def _backup_devices():
    found = {}
    for info in glob.glob(os.path.join(BACKUP_DIR, "*", "*", "info")):
        dev = os.path.basename(os.path.dirname(info))
        ad = os.path.basename(os.path.dirname(os.path.dirname(info)))
        found[(ad, dev)] = _read_info(info)
    return found


async def _run(*cmd):
    p = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT
    )
    out, _ = await p.communicate()
    return p.returncode, out.decode(errors="replace").strip()


class Plugin:
    router = None
    _router_cm = None
    agent_task = None
    pairing_until = 0.0
    paired_now = []
    watcher = None
    charge = None

    # ---------- D-Bus ----------

    async def _bus(self):
        if self.router is None:
            self._router_cm = open_dbus_router(bus="SYSTEM")
            self.router = await self._router_cm.__aenter__()
        return self.router

    async def _call(self, path, iface, method, sig=None, body=()):
        r = await self._bus()
        msg = new_method_call(DBusAddress(path, bus_name=BLUEZ, interface=iface), method, sig, body)
        return unwrap_msg(await r.send_and_get_reply(msg))

    async def _objects(self):
        return (await self._call("/", "org.freedesktop.DBus.ObjectManager", "GetManagedObjects"))[0]

    async def _modalias(self, dev_path):
        try:
            r = await self._bus()
            msg = Properties(DBusAddress(dev_path, bus_name=BLUEZ, interface="org.bluez.Device1")).get("Modalias")
            return unwrap_msg(await r.send_and_get_reply(msg))[0][1].lower()
        except Exception:
            return ""

    # ---------- Agent ----------

    async def _handle_agent(self, msg):
        r = await self._bus()
        member = msg.header.fields.get(HeaderFields.member)
        body = msg.body
        if member in ("Release", "Cancel"):
            await r.send(new_method_return(msg))
            return
        if member == "AuthorizeService":
            dev_path, uuid = body
            ma = await self._modalias(dev_path)
            addr = dev_path.rsplit("dev_", 1)[-1].replace("_", ":")
            if ma.startswith("usb:v" + SONY_VENDOR):
                _log("authorizing Sony controller", addr, ma, uuid)
                await r.send(new_method_return(msg))
                self.paired_now.append(addr)
                asyncio.get_event_loop().create_task(self._after_pair(addr, dev_path))
                return
            _log("rejecting non-Sony AuthorizeService", addr, ma)
        else:
            _log("rejecting agent request", member)
        await r.send(new_error(msg, "org.bluez.Error.Rejected"))

    async def _set_trusted(self, dev_path):
        r = await self._bus()
        msg = Properties(DBusAddress(dev_path, bus_name=BLUEZ, interface="org.bluez.Device1")).set(
            "Trusted", "b", True
        )
        unwrap_msg(await r.send_and_get_reply(msg))

    async def _after_pair(self, addr, dev_path):
        # Like KDE does: mark the pad as trusted, so Bluetooth reconnections
        # do not need another authorization from an agent.
        await asyncio.sleep(1)
        try:
            await self._set_trusted(dev_path)
            _log("set Trusted", addr)
        except Exception as e:
            _log("setting Trusted failed:", addr, repr(e))
        # Give BlueZ time to write the info file, then refresh the backup.
        await asyncio.sleep(2)
        if await self.get_persist():
            await self._sync()
        await decky.emit("ps3_paired", addr)

    async def _agent_loop(self, seconds):
        r = await self._bus()
        mgr = ("/org/bluez", "org.bluez.AgentManager1")
        rule = MatchRule(type="method_call", path=AGENT_PATH)
        with r.filter(rule, bufsize=16) as queue:
            await self._call(*mgr, "RegisterAgent", "os", (AGENT_PATH, "NoInputNoOutput"))
            try:
                await self._call(*mgr, "RequestDefaultAgent", "o", (AGENT_PATH,))
                _log("agent active for", seconds, "s")
                loop = asyncio.get_event_loop()
                self.pairing_until = loop.time() + seconds
                while True:
                    left = self.pairing_until - loop.time()
                    if left <= 0:
                        break
                    try:
                        m = await asyncio.wait_for(queue.get(), timeout=left)
                    except asyncio.TimeoutError:
                        break
                    try:
                        await self._handle_agent(m)
                    except Exception as e:
                        _log("agent error:", repr(e))
            finally:
                self.pairing_until = 0.0
                try:
                    await self._call(*mgr, "UnregisterAgent", "o", (AGENT_PATH,))
                except Exception as e:
                    _log("UnregisterAgent:", repr(e))
                _log("agent removed")
                await decky.emit("ps3_pairing_ended", list(self.paired_now))

    # ---------- Persistence ----------

    async def _sync(self):
        if not os.path.exists(SYNC_SCRIPT):
            return ""
        _, out = await _run("/bin/sh", SYNC_SCRIPT)
        if out:
            _log("sync:", out)
        return out

    def _install_files(self):
        """Install script and unit, replacing @HOME@ with the user's home."""
        os.makedirs(PERSIST_DIR, exist_ok=True)
        for src, dst, mode in (
            ("ps3-bt-sync.sh", SYNC_SCRIPT, 0o755),
            (UNIT_NAME, UNIT_PATH, 0o644),
        ):
            with open(os.path.join(DEFAULTS, src)) as f:
                text = f.read().replace("@HOME@", USER_HOME)
            tmp = dst + ".tmp"
            with open(tmp, "w") as f:
                f.write(text)
            os.chmod(tmp, mode)
            os.replace(tmp, dst)

    async def _enable_service(self):
        self._install_files()
        await _run("systemctl", "daemon-reload")
        code, out = await _run("systemctl", "enable", UNIT_NAME)
        if code != 0:
            _log("enable failed:", out)
            return False
        await self._sync()  # create the backup right away
        return True

    # ---------- API for the frontend ----------

    async def start_pairing(self, seconds: int = 60):
        if self.agent_task and not self.agent_task.done():
            self.pairing_until = asyncio.get_event_loop().time() + seconds
            return True
        self.paired_now = []
        self.agent_task = asyncio.get_event_loop().create_task(self._agent_loop(int(seconds)))
        await asyncio.sleep(0.5)
        if self.agent_task.done() and self.agent_task.exception():
            _log("starting the agent failed:", repr(self.agent_task.exception()))
            return False
        return True

    async def stop_pairing(self):
        self.pairing_until = 0.0
        if self.agent_task and not self.agent_task.done():
            self.agent_task.cancel()
        return True

    async def pairing_left(self):
        if not self.agent_task or self.agent_task.done():
            return 0
        return max(0, int(self.pairing_until - asyncio.get_event_loop().time()))

    async def list_devices(self):
        cable = _cable_devices()
        backup = _backup_devices()
        connected = {}
        try:
            for path, ifaces in (await self._objects()).items():
                d = ifaces.get("org.bluez.Device1")
                if d:
                    connected[d["Address"][1].upper()] = bool(d.get("Connected", ("b", False))[1])
        except Exception as e:
            _log("GetManagedObjects:", repr(e))
        names = _load_settings().get("names", {})
        out = []
        for key in sorted(set(cable) | set(backup)):
            ad, dev = key
            info = cable.get(key) or backup.get(key) or {}
            out.append({
                "adapter": ad,
                "address": dev,
                "name": info.get("Name", "Controller"),
                "registered": key in cable,
                "saved": key in backup,
                "connected": connected.get(dev.upper(), False),
                "player": pad.player_number(dev) if connected.get(dev.upper(), False) else None,
                "battery": pad.battery(dev) if connected.get(dev.upper(), False) else None,
                "alias": names.get(dev.upper(), ""),
                "stats": pad.battery_stats(dev),
            })
        out.sort(key=lambda d: (d["player"] is None, d["player"] or 0, d["address"]))
        return out

    async def identify(self, address: str):
        """Blink the LEDs and rumble the pad for a few seconds."""
        paths = pad.begin_leds(address)
        if not paths:
            return False

        async def blink():
            for i in range(12):
                pad.write_leds(paths, [1 if (i + j) % 2 == 0 else 0 for j in range(4)])
                await asyncio.sleep(0.25)

        try:
            await asyncio.gather(blink(), pad.rumble(address, ms=500))
        finally:
            pad.end_leds(address, paths)
        return True

    async def power_off(self, address: str):
        """Turn the pad off: a DS3 switches itself off when the host closes the
        Bluetooth connection. With the cable plugged in it stays powered by USB."""
        for path, ifaces in (await self._objects()).items():
            d = ifaces.get("org.bluez.Device1")
            if d and d["Address"][1].upper() == address.upper():
                if not d.get("Connected", ("b", False))[1]:
                    return False
                await self._call(path, "org.bluez.Device1", "Disconnect")
                _log("turned off", address)
                return True
        return False

    async def power_off_all(self):
        n = 0
        for d in await self.list_devices():
            if d["connected"]:
                try:
                    if await self.power_off(d["address"]):
                        n += 1
                except Exception as e:
                    _log("turning off failed:", d["address"], repr(e))
        return n

    async def rumble(self, address: str):
        return await pad.rumble(address)

    async def show_battery(self, address: str):
        return await pad.show_battery(address)

    async def set_name(self, address: str, name: str):
        s = _load_settings()
        names = s.setdefault("names", {})
        name = (name or "").strip()[:40]
        if name:
            names[address.upper()] = name
        else:
            names.pop(address.upper(), None)
        _save_settings(s)
        return True

    async def get_charge_leds(self):
        return bool(_load_settings().get("charge_leds", True))

    async def set_charge_leds(self, enabled: bool):
        s = _load_settings()
        s["charge_leds"] = bool(enabled)
        _save_settings(s)
        if self.charge:
            self.charge.enabled = bool(enabled)
        return bool(enabled)

    async def get_combo(self):
        return bool(_load_settings().get("battery_combo", True))

    async def set_combo(self, enabled: bool):
        s = _load_settings()
        s["battery_combo"] = bool(enabled)
        _save_settings(s)
        if self.watcher:
            self.watcher.enabled = bool(enabled)
        return bool(enabled)

    async def remove_device(self, adapter: str, address: str):
        # Remove from BlueZ (if present) and from the backup.
        try:
            objs = await self._objects()
            for path, ifaces in objs.items():
                d = ifaces.get("org.bluez.Device1")
                if d and d["Address"][1].upper() == address.upper():
                    await self._call(d["Adapter"][1], "org.bluez.Adapter1", "RemoveDevice", "o", (path,))
        except Exception as e:
            _log("RemoveDevice:", repr(e))
        b = os.path.join(BACKUP_DIR, adapter, address)
        if os.path.isdir(b):
            shutil.rmtree(b, ignore_errors=True)
        return True

    async def get_persist(self):
        code, _ = await _run("systemctl", "is-enabled", "--quiet", UNIT_NAME)
        return code == 0

    async def set_persist(self, enabled: bool):
        """Called from the toggle: the user's choice is remembered and respected."""
        s = _load_settings()
        s["persist_choice"] = "on" if enabled else "off"
        _save_settings(s)
        if enabled:
            if not await self._enable_service():
                return False
        else:
            await _run("systemctl", "disable", UNIT_NAME)
            try:
                os.remove(UNIT_PATH)
            except OSError:
                pass
            await _run("systemctl", "daemon-reload")
        return await self.get_persist()

    async def restore_now(self):
        """Restore from the backup and restart Bluetooth if something changed."""
        out = await self._sync()
        restored = [l.split()[-1] for l in out.splitlines() if l.startswith("restored")]
        if restored:
            await _run("systemctl", "restart", "bluetooth.service")
        return restored

    # ---------- Lifecycle ----------

    async def _main(self):
        _log("PS3 Pair started")
        self.watcher = pad.ComboWatcher(_log)
        self.watcher.enabled = await self.get_combo()
        self.watcher.start()
        self.charge = pad.ChargeMonitor(_log)
        self.charge.enabled = await self.get_charge_leds()
        self.charge.start()

        s = _load_settings()
        if await self.get_persist():
            # Refresh script and unit with this plugin version, then the backup.
            try:
                self._install_files()
                await _run("systemctl", "daemon-reload")
            except Exception as e:
                _log("updating files:", repr(e))
            await self._sync()
        elif "persist_choice" not in s:
            # First start: remembering controllers across updates is the main
            # feature, so it is on by default until the user turns it off.
            _log("first start: enabling", UNIT_NAME)
            if await self._enable_service():
                s["persist_choice"] = "auto"
                _save_settings(s)

    async def _unload(self):
        await self.stop_pairing()
        if self.watcher:
            self.watcher.stop()
        if self.charge:
            self.charge.stop()
        pad.restore_all()
        if self._router_cm is not None:
            try:
                await self._router_cm.__aexit__(None, None, None)
            except Exception:
                pass
            self.router = None
