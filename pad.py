"""Funzioni sul pad PS3 collegato: LED, vibrazione, batteria e combinazione di tasti.

Usa solo interfacce del kernel (driver hid-sony):
  /sys/bus/hid/devices/<hid>/leds/*::sony1..4      LED giocatore
  /sys/class/power_supply/sony_controller_battery_<mac>   batteria
  /dev/input/eventN                                  tasti e vibrazione (force feedback)
"""

import asyncio
import fcntl
import glob
import os
import struct

# --- evdev ---
EV_KEY = 0x01
EV_FF = 0x15
FF_RUMBLE = 0x50
BTN_SELECT = 314
BTN_START = 315
EVIOCSFF = 0x40304580  # _IOW('E', 0x80, struct ff_effect) con sizeof = 48
EVIOCRMFF = 0x40044581  # _IOW('E', 0x81, int)
INPUT_EVENT = struct.Struct("llHHi")  # timeval, type, code, value (24 byte su x86_64)

COMBO = {BTN_SELECT, BTN_START}
BUSY = set()  # pad su cui un'animazione sta usando i LED
ORIGINAL = {}  # cartella HID del pad -> LED del giocatore visti prima di ogni nostra animazione
COMBO_HOLD = 1.5  # secondi
BATTERY_SHOW = 4.0  # secondi


def hid_dirs(addr):
    """Cartelle HID del kernel per il pad con questo indirizzo."""
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
    """Indirizzi dei PS3 collegati adesso (Bluetooth o USB)."""
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


def write_leds(paths, vals):
    for p, v in zip(paths, vals):
        try:
            with open(p, "w") as f:
                f.write(str(v))
        except OSError:
            pass


def begin_leds(addr):
    """Prende i LED del pad per un'animazione. Ritorna i percorsi, o None se occupati.
    I LED del giocatore vengono ricordati la prima volta e non riletti dopo,
    così un'animazione interrotta non può diventare il nuovo "numero giocatore"."""
    paths = led_paths(addr)
    if not paths or addr in BUSY:
        return None
    key = os.path.dirname(os.path.dirname(os.path.dirname(paths[0])))  # .../hid/devices/<id>
    if key not in ORIGINAL:
        ORIGINAL[key] = read_leds(paths)
    BUSY.add(addr)
    return paths


def end_leds(addr, paths):
    key = os.path.dirname(os.path.dirname(os.path.dirname(paths[0])))
    if key in ORIGINAL:
        write_leds(paths, ORIGINAL[key])
    BUSY.discard(addr)


def restore_all():
    """Rimette i LED del giocatore su tutti i pad toccati (chiusura del plugin)."""
    for key, vals in ORIGINAL.items():
        leds = sorted(glob.glob(os.path.join(key, "leds", "*::sony[1-4]")))
        if len(leds) == 4:
            write_leds([os.path.join(l, "brightness") for l in leds], vals)
    BUSY.clear()


def player_number(addr):
    """Numero del LED acceso (1-4), None se non leggibile."""
    try:
        vals = [int(v or 0) for v in read_leds(led_paths(addr))]
    except (OSError, ValueError):
        return None
    on = [i + 1 for i, v in enumerate(vals) if v > 0]
    # 1-4: un LED solo; combinazioni diverse le mostriamo come somma (5 = 4+1, ...)
    return sum(on) if on else None


def battery(addr):
    """{'capacity': 0-100, 'status': 'Discharging'|'Charging'|'Full'|...} o None."""
    b = "/sys/class/power_supply/sony_controller_battery_" + addr.lower()
    try:
        with open(os.path.join(b, "capacity")) as f:
            cap = int(f.read().strip())
        with open(os.path.join(b, "status")) as f:
            status = f.read().strip()
        return {"capacity": cap, "status": status}
    except (OSError, ValueError):
        return None


def battery_leds(cap):
    """Barra di LED: 1-25% -> 1 LED, ... 76-100% -> 4 LED; 0 -> nessuno."""
    n = 0 if cap <= 0 else min(4, (cap + 24) // 25)
    return [1 if i < n else 0 for i in range(4)]


def event_node(addr):
    """/dev/input/eventN del pad (non quello dei sensori di movimento)."""
    nodes = event_nodes(addr)
    return nodes[-1] if nodes else None


def event_nodes(addr):
    """Tutti i nodi tasti del pad: col cavo ce n'è uno USB oltre a quello Bluetooth."""
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
    """Fa vibrare il pad. False se il pad non ha un nodo input o non supporta la vibrazione."""
    node = event_node(addr)
    if not node:
        return False
    fd = os.open(node, os.O_RDWR)
    try:
        # struct ff_effect: type, id, direction, trigger(button, interval),
        # replay(length, delay), [pad], union { rumble(strong, weak) ... } -> 48 byte
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
    """Mostra la batteria sui 4 LED per qualche secondo, poi rimette il numero giocatore."""
    b = battery(addr)
    if not b:
        return False
    paths = begin_leds(addr)
    if not paths:
        return False
    level = sum(battery_leds(b["capacity"]))
    bar = lambda n: [1 if k < n else 0 for k in range(4)]
    try:
        # intro: la barra si riempie fino a 4 LED e poi scende fino al livello di carica
        # (in carica il livello non è noto: niente intro, parte subito l'animazione)
        if b["status"] != "Charging":
            for n in (1, 2, 3, 4):
                write_leds(paths, bar(n))
                await asyncio.sleep(0.2)
            await asyncio.sleep(0.5)
            for n in range(3, max(level, 1) - 1, -1):
                write_leds(paths, bar(n))
                await asyncio.sleep(0.2)
        if b["status"] == "Charging":
            # in carica il DS3 non comunica il livello (il driver dice sempre 100%):
            # la barra si riempie da 1 a 4, in loop
            end = asyncio.get_event_loop().time() + BATTERY_SHOW
            n = 1
            while asyncio.get_event_loop().time() < end:
                write_leds(paths, bar(n))
                n = n + 1 if n < 4 else 1
                await asyncio.sleep(0.6)
        elif b["capacity"] < 25:
            # quasi scarico: il primo LED lampeggia
            for i in range(int(BATTERY_SHOW / 0.25)):
                write_leds(paths, [1 - i % 2, 0, 0, 0])
                await asyncio.sleep(0.25)
        else:
            write_leds(paths, bar(level))
            await asyncio.sleep(BATTERY_SHOW)
    finally:
        end_leds(addr, paths)
    return True


class ChargeMonitor:
    """Col cavo collegato mostra lo stato sui LED senza premere nulla:
    in carica -> barra che si riempie in loop; carico -> 4 LED fissi.
    Staccato il cavo rimette i LED del giocatore."""

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

    def release_all(self):
        for addr in list(self.state):
            self._release(addr)

    def _release(self, addr):
        st = self.state.pop(addr, None)
        if st:
            end_leds(addr, st["paths"])
            self.log("carica: fine animazione su", addr)

    async def _loop(self):
        while True:
            try:
                self._tick()
            except Exception as e:
                self.log("carica:", repr(e))
            await asyncio.sleep(self.STEP)

    def _tick(self):
        present = set(connected_addresses())
        for addr in list(self.state):
            if addr not in present:
                self.state.pop(addr, None)
                BUSY.discard(addr)
        if not self.enabled:
            self.release_all()
            return
        for addr in present:
            b = battery(addr)
            mode = b["status"] if b and b["status"] in ("Charging", "Full") else None
            st = self.state.get(addr)
            if mode is None:
                if st:
                    self._release(addr)
                continue
            if st is None:
                paths = begin_leds(addr)  # None se c'è già un'altra animazione
                if not paths:
                    continue
                st = self.state[addr] = {"mode": None, "paths": paths, "step": 0}
                self.log("carica: cavo collegato su", addr, mode)
            paths = st["paths"]
            if mode != st["mode"]:
                st["mode"] = mode
                st["step"] = 0
            if mode == "Full":
                write_leds(paths, [1, 1, 1, 1])
            else:
                n = st["step"] % 4 + 1
                write_leds(paths, [1 if k < n else 0 for k in range(4)])
                st["step"] += 1


class ComboWatcher:
    """Legge i tasti di ogni PS3 collegato; Select+Start tenuti premuti -> batteria sui LED."""

    def __init__(self, log):
        self.log = log
        self.enabled = True
        self.watching = {}  # nodo /dev/input/eventN -> fd
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
            self.log("combo: non posso aprire", node, repr(e))
            return
        self.watching[node] = fd
        state = {"held": set(), "timer": None, "busy": False}
        self.log("combo: controllo i tasti di", addr, node)

        def fire():
            state["timer"] = None
            if self.enabled and not state["busy"]:
                state["busy"] = True
                self.log("combo: batteria richiesta su", addr, battery(addr))

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
                # pad scollegato
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
