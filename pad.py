"""Features of a connected PS3 pad: LEDs, rumble, battery and button combo.

Uses kernel interfaces only (hid-sony driver):
  /sys/bus/hid/devices/<hid>/leds/*::sony1..4             player LEDs
  /sys/class/power_supply/sony_controller_battery_<mac>   battery
  /dev/input/eventN                                       buttons and rumble (force feedback)
  /dev/hidrawN                                            output report (all 4 LEDs at once)
"""

import asyncio
import fcntl
import glob
import json
import os
import struct
import time

# --- evdev ---
EV_KEY = 0x01
EV_FF = 0x15
FF_RUMBLE = 0x50
BTN_SELECT = 314
BTN_START = 315
EVIOCSFF = 0x40304580  # _IOW('E', 0x80, struct ff_effect), sizeof = 48
EVIOCRMFF = 0x40044581  # _IOW('E', 0x81, int)
INPUT_EVENT = struct.Struct("llHHi")  # timeval, type, code, value (24 bytes on x86_64)

COMBO = {BTN_SELECT, BTN_START}
BUSY = set()  # pads whose LEDs are used by an animation right now
ORIGINAL = {}  # pad HID dir -> player LEDs seen before any of our animations
STATE_FILE = None  # set by main.py: battery level and statistics of each pad
SETTLE = 60.0  # seconds after unplugging during which readings are ignored (bounce)
MIN_CYCLE = 3600  # cycles shorter than this (seconds of use) are not archived
_state = None  # addr -> {"level", "full_at", "use_s", "last_cycle"}
_runtime = {}  # addr -> {"prev", "settle_until", "last_t", "charged"}
_saved_at = 0.0
COMBO_HOLD = 1.5  # seconds
BATTERY_SHOW = 4.0  # seconds (charging animation / low battery blink)
BATTERY_HOLD = 3.0  # seconds showing the steady level


def hid_dirs(addr):
    """Kernel HID dirs of the pad with this address."""
    out = []
    for d in glob.glob("/sys/bus/hid/devices/*:054C:0268.*"):
        try:
            with open(os.path.join(d, "uevent")) as f:
                if ("HID_UNIQ=" + addr).lower() in f.read().lower():
                    out.append(d)
        except OSError:
            pass
    return out


def connected_addresses():
    """Addresses of the PS3 pads connected right now (Bluetooth or USB)."""
    out = []
    for d in glob.glob("/sys/bus/hid/devices/*:054C:0268.*"):
        try:
            with open(os.path.join(d, "uevent")) as f:
                for line in f:
                    if line.startswith("HID_UNIQ=") and line.strip() != "HID_UNIQ=":
                        out.append(line.strip().split("=", 1)[1].upper())
        except OSError:
            pass
    return sorted(set(out))


def led_paths(addr):
    for d in hid_dirs(addr):
        leds = sorted(glob.glob(os.path.join(d, "leds", "*::sony[1-4]")))
        if len(leds) == 4:
            return [os.path.join(l, "brightness") for l in leds]
    return []


def read_leds(paths):
    vals = []
    for p in paths:
        with open(p) as f:
            vals.append(f.read().strip())
    return vals


def _sixaxis_report(leds):
    """DS3 output report (same as sixaxis_output_report in hid-sony),
    with all 4 LEDs at once and rumble off."""
    bitmap = 0
    for i, v in enumerate(leds):
        if int(v):
            bitmap |= 1 << (i + 1)
    led = bytes([0xFF, 0x27, 0x10, 0x00, 0x32])
    return (
        bytes([0x01])  # report id
        + bytes([0x01, 0xFF, 0x00, 0xFF, 0x00])  # rumble: off
        + bytes(4)
        + bytes([bitmap])
        + led * 4
        + bytes(5)
    )


def _hidraw_for(paths):
    """/dev/hidrawN of the same HID device as the LEDs."""
    hid = os.path.dirname(os.path.dirname(os.path.dirname(paths[0])))
    nodes = glob.glob(os.path.join(hid, "hidraw", "hidraw*"))
    return "/dev/" + os.path.basename(nodes[0]) if nodes else None


def _hidiocsoutput(length):
    # _IOC(_IOC_READ|_IOC_WRITE, 'H', 0x0B, len)
    return (3 << 30) | (length << 16) | (ord("H") << 8) | 0x0B


def write_leds_atomic(paths, vals):
    """Send the 4 LEDs in a single SET_REPORT so they switch together.
    The driver's LED state (sysfs) is untouched and keeps the player number."""
    node = _hidraw_for(paths) if paths else None
    if not node:
        return False
    rep = bytearray(_sixaxis_report(vals))
    try:
        fd = os.open(node, os.O_RDWR)
    except OSError:
        return False
    try:
        fcntl.ioctl(fd, _hidiocsoutput(len(rep)), rep, True)
        return True
    except OSError:
        return False
    finally:
        os.close(fd)


def write_leds(paths, vals):
    if write_leds_atomic(paths, vals):
        return
    for p, v in zip(paths, vals):
        try:
            with open(p, "w") as f:
                f.write(str(v))
        except OSError:
            pass


def _hid_key(paths):
    return os.path.dirname(os.path.dirname(os.path.dirname(paths[0])))  # .../hid/devices/<id>


def begin_leds(addr):
    """Take the pad's LEDs for an animation. Returns the paths, or None if busy.
    The player LEDs are remembered the first time and never re-read, so an
    interrupted animation can never become the new "player number"."""
    paths = led_paths(addr)
    if not paths or addr in BUSY:
        return None
    key = _hid_key(paths)
    if key not in ORIGINAL:
        ORIGINAL[key] = read_leds(paths)
    BUSY.add(addr)
    return paths


def end_leds(addr, paths):
    key = _hid_key(paths)
    if key in ORIGINAL:
        write_leds(paths, ORIGINAL[key])
    BUSY.discard(addr)


def restore_all():
    """Put the player LEDs back on every pad we touched (plugin shutdown)."""
    for key, vals in ORIGINAL.items():
        leds = sorted(glob.glob(os.path.join(key, "leds", "*::sony[1-4]")))
        if len(leds) == 4:
            write_leds([os.path.join(l, "brightness") for l in leds], vals)
    BUSY.clear()


def player_number(addr):
    """Number of the lit LED (1-4), None if unreadable."""
    try:
        vals = [int(v or 0) for v in read_leds(led_paths(addr))]
    except (OSError, ValueError):
        return None
    on = [i + 1 for i, v in enumerate(vals) if v > 0]
    # 1-4: a single LED; other combinations are shown as their sum (5 = 4+1, ...)
    return sum(on) if on else None


def battery(addr):
    """{'capacity': 0-100, 'status': 'Discharging'|'Charging'|'Full'|...} or None."""
    b = "/sys/class/power_supply/sony_controller_battery_" + addr.lower()
    try:
        with open(os.path.join(b, "capacity")) as f:
            cap = int(f.read().strip())
        with open(os.path.join(b, "status")) as f:
            status = f.read().strip()
        return {"capacity": cap, "status": status}
    except (OSError, ValueError):
        return None


def _load_state():
    global _state
    if _state is None:
        _state = {}
        if STATE_FILE:
            try:
                with open(STATE_FILE) as f:
                    d = json.load(f)
                    if isinstance(d, dict):
                        _state = d
            except (OSError, ValueError):
                pass
    return _state


def save_state(force=True):
    global _saved_at
    now = time.monotonic()
    if not STATE_FILE or (not force and now - _saved_at < 60):
        return
    _saved_at = now
    try:
        tmp = STATE_FILE + ".tmp"
        with open(tmp, "w") as f:
            json.dump(_load_state(), f, indent=1)
        os.chmod(tmp, 0o644)
        os.replace(tmp, STATE_FILE)
    except OSError:
        pass


def _pad_state(addr):
    return _load_state().setdefault(addr.upper(), {})


def _set_level(addr, cap):
    lv = sum(battery_leds(cap))
    st = _pad_state(addr)
    if lv and st.get("level") != lv:
        st["level"] = lv
        save_state()


def remember_level(addr, b):
    """Level read with SELECT+START: only counts once the battery has settled."""
    if not b or b["status"] in ("Charging", "Full"):
        return
    rt = _runtime.get(addr.upper(), {})
    if time.monotonic() < rt.get("settle_until", 0):
        return
    _set_level(addr, b["capacity"])


def track(addr, b):
    """Called continuously for every connected pad.
    - remembers the last level once the battery has settled (SETTLE s after unplugging)
    - cycle: if the pad settles at 100% after charging, usage time starts
      counting; at the next charge the cycle is archived as the previous one."""
    if not b:
        return
    now = time.monotonic()
    key = addr.upper()
    rt = _runtime.setdefault(key, {"prev": None, "settle_until": 0.0, "last_t": now})
    st = _pad_state(addr)
    dt = now - rt["last_t"]
    rt["last_t"] = now
    status = b["status"]
    if status in ("Charging", "Full"):
        if rt["prev"] not in ("Charging", "Full"):
            if st.get("full_at"):
                # a short cycle (e.g. unplugged and plugged back in) says nothing
                # about the battery: keep the previous archived cycle instead
                if st.get("use_s", 0) >= MIN_CYCLE:
                    st["last_cycle"] = {
                        "use_s": int(st.get("use_s", 0)),
                        "to_level": st.get("level"),
                        "full_at": st["full_at"],
                        "ended": int(time.time()),
                    }
                st["full_at"] = None
                st["use_s"] = 0
                save_state()
        rt["charged"] = True
    else:
        if rt["prev"] in ("Charging", "Full"):
            rt["settle_until"] = now + SETTLE
        if now >= rt["settle_until"]:
            _set_level(addr, b["capacity"])
            if rt.pop("charged", False) and b["capacity"] >= 100:
                st["full_at"] = int(time.time())
                st["use_s"] = 0
                save_state()
        if st.get("full_at") and 0 < dt < 5:
            st["use_s"] = st.get("use_s", 0) + dt
            save_state(force=False)
    rt["prev"] = status


def battery_stats(addr):
    st = _load_state().get(addr.upper(), {})
    last = st.get("last_cycle")
    if last and last.get("use_s", 0) < MIN_CYCLE:
        last = None  # archived by an older version, too short to be meaningful
    return {
        "full_at": st.get("full_at"),
        "use_s": int(st.get("use_s", 0)) if st.get("full_at") else None,
        "last_cycle": last,
    }


def charge_frame(addr, step):
    """Frame of the charging animation.
    First round 0,1,2,3,4; later rounds start from the last known level
    (e.g. level 2: 2,3,4,2,3,4...). With level 4 it alternates 3 and 4, so it
    does not look like "full". Without a known level: always 0..4."""
    if step < 5:
        n = step
    else:
        lv = _load_state().get(addr.upper(), {}).get("level")
        if not lv:
            n = step % 5
        else:
            start = min(lv, 3)
            span = 4 - start + 1
            n = start + (step - 5) % span
    return [1 if k < n else 0 for k in range(4)]


def battery_leds(cap):
    """LED bar: 1-25% -> 1 LED, ... 76-100% -> 4 LEDs; 0 -> none."""
    n = 0 if cap <= 0 else min(4, (cap + 24) // 25)
    return [1 if i < n else 0 for i in range(4)]


def event_node(addr):
    """/dev/input/eventN of the pad (not the motion sensors one)."""
    nodes = event_nodes(addr)
    return nodes[-1] if nodes else None


def event_nodes(addr):
    """All button nodes of the pad (with a cable there may be a USB one too)."""
    out = []
    for d in hid_dirs(addr):
        for inp in glob.glob(os.path.join(d, "input", "input*")):
            try:
                with open(os.path.join(inp, "name")) as f:
                    if "Motion" in f.read():
                        continue
            except OSError:
                continue
            ev = glob.glob(os.path.join(inp, "event*"))
            if ev:
                out.append("/dev/input/" + os.path.basename(ev[0]))
    return sorted(out, key=lambda n: int(n.rsplit("event", 1)[1]))


async def rumble(addr, ms=600, strong=0xC000, weak=0xC000):
    """Rumble the pad. False if it has no input node or no force feedback."""
    node = event_node(addr)
    if not node:
        return False
    fd = os.open(node, os.O_RDWR)
    try:
        # struct ff_effect: type, id, direction, trigger(button, interval),
        # replay(length, delay), [pad], union { rumble(strong, weak) ... } -> 48 bytes
        eff = bytearray(struct.pack("<HhHHHHH2xHH28x", FF_RUMBLE, -1, 0, 0, 0, ms, 0, strong, weak))
        fcntl.ioctl(fd, EVIOCSFF, eff, True)
        eff_id = struct.unpack_from("<h", eff, 2)[0]
        os.write(fd, INPUT_EVENT.pack(0, 0, EV_FF, eff_id, 1))
        await asyncio.sleep(ms / 1000 + 0.1)
        fcntl.ioctl(fd, EVIOCRMFF, eff_id)
        return True
    except OSError:
        return False
    finally:
        os.close(fd)


async def show_battery(addr):
    """Show the battery on the 4 LEDs for a few seconds, then restore the player number."""
    b = battery(addr)
    if not b:
        return False
    paths = begin_leds(addr)
    if not paths:
        return False
    remember_level(addr, b)
    level = sum(battery_leds(b["capacity"]))
    # Right after unplugging the reading bounces up (e.g. 75% instead of 25%):
    # during the settle time show the last settled level, if there is one.
    rt = _runtime.get(addr.upper(), {})
    saved = _load_state().get(addr.upper(), {}).get("level")
    if b["status"] != "Charging" and saved and time.monotonic() < rt.get("settle_until", 0):
        level = saved
    bar = lambda n: [1 if k < n else 0 for k in range(4)]
    try:
        # start from all off, so it is not mistaken for the player LED;
        # then the bar fills up to the level (skipped while charging: level unknown)
        if b["status"] != "Charging":
            write_leds(paths, bar(0))
            await asyncio.sleep(0.4)
            for n in range(1, max(level, 1) + 1):
                write_leds(paths, bar(n))
                await asyncio.sleep(0.2)
        if b["status"] == "Charging":
            # while charging the DS3 does not report its level (driver says 100%):
            # the bar fills from 0 to 4, in a loop
            end = asyncio.get_event_loop().time() + BATTERY_SHOW
            step = 0
            while asyncio.get_event_loop().time() < end:
                write_leds(paths, charge_frame(addr, step))
                step += 1
                await asyncio.sleep(0.6)
        elif level <= 1 and b["capacity"] < 25:
            # almost empty: the first LED blinks
            for i in range(int(BATTERY_SHOW / 0.25)):
                write_leds(paths, [1 - i % 2, 0, 0, 0])
                await asyncio.sleep(0.25)
        else:
            # level reached: 2 blinks all together, then steady
            for _ in range(2):
                write_leds(paths, bar(0))
                await asyncio.sleep(0.25)
                write_leds(paths, bar(level))
                await asyncio.sleep(0.25)
            await asyncio.sleep(BATTERY_HOLD)
    finally:
        end_leds(addr, paths)
    return True


class ChargeMonitor:
    """With the cable plugged in, shows the state on the LEDs with no button press:
    charging -> bar filling in a loop; full -> 4 steady LEDs.
    When unplugged, the player LEDs come back."""

    STEP = 0.6

    def __init__(self, log):
        self.log = log
        self.enabled = True
        self.task = None
        self.state = {}  # addr -> {"mode": "Charging"/"Full", "paths": [...], "step": n}

    def start(self):
        if self.task is None or self.task.done():
            self.task = asyncio.get_event_loop().create_task(self._loop())

    def stop(self):
        if self.task:
            self.task.cancel()
        self.release_all()
        save_state()

    def release_all(self):
        for addr in list(self.state):
            self._release(addr)

    def _release(self, addr):
        st = self.state.pop(addr, None)
        if st:
            end_leds(addr, st["paths"])
            self.log("charge: animation ended on", addr)

    async def _loop(self):
        while True:
            try:
                self._tick()
            except Exception as e:
                self.log("charge:", repr(e))
            await asyncio.sleep(self.STEP)

    def _tick(self):
        present = set(connected_addresses())
        for addr in list(self.state):
            if addr not in present:
                self.state.pop(addr, None)
                BUSY.discard(addr)
        batteries = {addr: battery(addr) for addr in present}
        for addr, b in batteries.items():
            track(addr, b)
        if not self.enabled:
            self.release_all()
            return
        for addr in present:
            b = batteries[addr]
            mode = b["status"] if b and b["status"] in ("Charging", "Full") else None
            st = self.state.get(addr)
            if mode is None:
                if st:
                    self._release(addr)
                continue
            if st is None:
                paths = begin_leds(addr)  # None if another animation is running
                if not paths:
                    continue
                st = self.state[addr] = {"mode": None, "paths": paths, "step": 0}
                self.log("charge: cable plugged in on", addr, mode)
            paths = st["paths"]
            if mode != st["mode"]:
                st["mode"] = mode
                st["step"] = 0
            if mode == "Full":
                write_leds(paths, [1, 1, 1, 1])
            else:
                write_leds(paths, charge_frame(addr, st["step"]))
                st["step"] += 1


class ComboWatcher:
    """Reads the buttons of every connected PS3; holding Select+Start -> battery on the LEDs."""

    def __init__(self, log):
        self.log = log
        self.enabled = True
        self.watching = {}  # /dev/input/eventN node -> fd
        self.task = None

    def start(self):
        if self.task is None or self.task.done():
            self.task = asyncio.get_event_loop().create_task(self._scan_loop())

    def stop(self):
        if self.task:
            self.task.cancel()
        loop = asyncio.get_event_loop()
        for node, fd in list(self.watching.items()):
            self._close(loop, node, fd)

    def _close(self, loop, node, fd):
        try:
            loop.remove_reader(fd)
        except Exception:
            pass
        try:
            os.close(fd)
        except OSError:
            pass
        self.watching.pop(node, None)

    async def _scan_loop(self):
        loop = asyncio.get_event_loop()
        while True:
            try:
                for addr in connected_addresses():
                    for node in event_nodes(addr):
                        if node not in self.watching:
                            self._watch(loop, addr, node)
            except Exception as e:
                self.log("combo scan:", repr(e))
            await asyncio.sleep(3)

    def _watch(self, loop, addr, node):
        try:
            fd = os.open(node, os.O_RDONLY | os.O_NONBLOCK)
        except OSError as e:
            self.log("combo: cannot open", node, repr(e))
            return
        self.watching[node] = fd
        state = {"held": set(), "timer": None, "busy": False}
        self.log("combo: watching buttons of", addr, node)

        def fire():
            state["timer"] = None
            if self.enabled and not state["busy"]:
                state["busy"] = True
                self.log("combo: battery requested on", addr, battery(addr))

                async def go():
                    try:
                        await show_battery(addr)
                    finally:
                        state["busy"] = False

                loop.create_task(go())

        def on_read():
            try:
                data = os.read(fd, INPUT_EVENT.size * 64)
            except BlockingIOError:
                return
            except OSError:
                # pad disconnected
                self._close(loop, node, fd)
                return
            if not data:
                self._close(loop, node, fd)
                return
            for off in range(0, len(data) - INPUT_EVENT.size + 1, INPUT_EVENT.size):
                _, _, typ, code, val = INPUT_EVENT.unpack_from(data, off)
                if typ != EV_KEY or code not in COMBO:
                    continue
                if val:
                    state["held"].add(code)
                else:
                    state["held"].discard(code)
                if state["held"] == COMBO and state["timer"] is None:
                    state["timer"] = loop.call_later(COMBO_HOLD, fire)
                elif state["held"] != COMBO and state["timer"] is not None:
                    state["timer"].cancel()
                    state["timer"] = None

        loop.add_reader(fd, on_read)
