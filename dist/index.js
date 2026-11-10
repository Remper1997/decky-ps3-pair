const manifest = {"name":"PS3 Pair"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const callable = api.callable;
const addEventListener = api.addEventListener;
const removeEventListener = api.removeEventListener;
const toaster = api.toaster;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

var DefaultContext = {
  color: undefined,
  size: undefined,
  className: undefined,
  style: undefined,
  attr: undefined
};
var IconContext = SP_REACT.createContext && /*#__PURE__*/SP_REACT.createContext(DefaultContext);

var _excluded = ["attr", "size", "title"];
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function Tree2Element(tree) {
  return tree && tree.map((node, i) => /*#__PURE__*/SP_REACT.createElement(node.tag, _objectSpread({
    key: i
  }, node.attr), Tree2Element(node.child)));
}
function GenIcon(data) {
  return props => /*#__PURE__*/SP_REACT.createElement(IconBase, _extends({
    attr: _objectSpread({}, data.attr)
  }, props), Tree2Element(data.child));
}
function IconBase(props) {
  var elem = conf => {
    var attr = props.attr,
      size = props.size,
      title = props.title,
      svgProps = _objectWithoutProperties(props, _excluded);
    var computedSize = size || conf.size || "1em";
    var className;
    if (conf.className) className = conf.className;
    if (props.className) className = (className ? className + " " : "") + props.className;
    return /*#__PURE__*/SP_REACT.createElement("svg", _extends({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, conf.attr, attr, svgProps, {
      className: className,
      style: _objectSpread(_objectSpread({
        color: props.color || conf.color
      }, conf.style), props.style),
      height: computedSize,
      width: computedSize,
      xmlns: "http://www.w3.org/2000/svg"
    }), title && /*#__PURE__*/SP_REACT.createElement("title", null, title), props.children);
  };
  return IconContext !== undefined ? /*#__PURE__*/SP_REACT.createElement(IconContext.Consumer, null, conf => elem(conf)) : elem(DefaultContext);
}

// THIS FILE IS AUTO GENERATED
function FaPlaystation (props) {
  return GenIcon({"attr":{"viewBox":"0 0 576 512"},"child":[{"tag":"path","attr":{"d":"M570.9 372.3c-11.3 14.2-38.8 24.3-38.8 24.3L327 470.2v-54.3l150.9-53.8c17.1-6.1 19.8-14.8 5.8-19.4-13.9-4.6-39.1-3.3-56.2 2.9L327 381.1v-56.4c23.2-7.8 47.1-13.6 75.7-16.8 40.9-4.5 90.9.6 130.2 15.5 44.2 14 49.2 34.7 38 48.9zm-224.4-92.5v-139c0-16.3-3-31.3-18.3-35.6-11.7-3.8-19 7.1-19 23.4v347.9l-93.8-29.8V32c39.9 7.4 98 24.9 129.2 35.4C424.1 94.7 451 128.7 451 205.2c0 74.5-46 102.8-104.5 74.6zM43.2 410.2c-45.4-12.8-53-39.5-32.3-54.8 19.1-14.2 51.7-24.9 51.7-24.9l134.5-47.8v54.5l-96.8 34.6c-17.1 6.1-19.7 14.8-5.8 19.4 13.9 4.6 39.1 3.3 56.2-2.9l46.4-16.9v48.8c-51.6 9.3-101.4 7.3-153.9-10z"},"child":[]}]})(props);
}

// Testi dell'interfaccia: italiano se Steam è in italiano, altrimenti inglese.
const it = {
    player: (n) => `PS3 · giocatore ${n}`,
    connected: (a) => `Connesso · ${a}`,
    onlyBackup: "Solo nel backup — usa «Ripristina ora»",
    offSaved: "Spento · salvato",
    offNotSaved: "Spento · non salvato",
    pairFailed: "Impossibile attivare l'accoppiamento",
    restored: (n) => `Ripristinati ${n} controller, Bluetooth riavviato`,
    nothingToRestore: "Niente da ripristinare",
    secPairing: "Accoppiamento",
    waiting: (s) => `In attesa del cavo… ${s}s (annulla)`,
    pairButton: "Accoppia PS3",
    plugNow: "Collega ora il DS3 con il cavo USB",
    plugNowDesc: "Quando la luce lampeggia staccalo e premi il tasto PS.",
    secUpdates: "Aggiornamenti SteamOS",
    persist: "Ricorda i PS3 tra gli aggiornamenti",
    persistDesc: "Salva i pairing in /home e li ripristina all'avvio.",
    restoreNow: "Ripristina ora",
    secControllers: "Controller PS3",
    noControllers: "Nessun controller registrato",
    ledUnreachable: "LED non raggiungibili",
    identify: "Identifica (LED e vibrazione)",
    removeTitle: "Rimuovere il controller?",
    removeDesc: (a) => `${a} andrà riaccoppiato con il cavo.`,
    remove: "Rimuovi",
    removed: (a) => `${a} rimosso`,
    options: "Opzioni",
    paired: (a) => `Controller ${a} accoppiato: staccalo e premi PS`,
    battery: (n) => `batteria ${n}%`,
    charging: "in carica",
    rumble: "Vibra",
    showBattery: "Mostra batteria sui LED",
    rename: "Rinomina",
    renameTitle: "Nome del controller",
    renameHint: "Lascia vuoto per usare il nome predefinito",
    save: "Salva",
    cancel: "Annulla",
    secOptions: "Opzioni",
    combo: "Batteria con SELECT + START",
    comboDesc: "Tieni premuti SELECT e START per 1,5 s: i LED del pad mostrano la carica (1–4).",
    batteryInfo: "Info batteria",
    close: "Chiudi",
    hm: (h, m) => (h ? `${h} h ${m} min` : `${m} min`),
    cycleNow: (d, u) => `Dall'ultima carica completa (${d}): ${u} di utilizzo`,
    cycleNone: "Nessuna carica completa registrata: lascia il pad col cavo finché arriva al 100%.",
    cycleLast: (u, pct) => `Ciclo precedente: ${u} di utilizzo, da 100% a ${pct}`,
    cycleNote: "Conta solo il tempo in cui il pad è acceso. Confronta i cicli nel tempo: se la durata cala molto, la batteria si sta consumando.",
    powerOff: "Spegni",
    powerOffAll: "Spegni tutti i PS3",
    poweredOff: (n) => (n === 1 ? "1 controller spento" : `${n} controller spenti`),
    chargeLeds: "Mostra la ricarica sui LED",
    chargeLedsDesc: "Col cavo collegato: barra che si riempie in carica, 4 LED fissi quando è carico.",
};
const en = {
    player: (n) => `PS3 · player ${n}`,
    connected: (a) => `Connected · ${a}`,
    onlyBackup: "Only in backup — use “Restore now”",
    offSaved: "Off · saved",
    offNotSaved: "Off · not saved",
    pairFailed: "Could not start pairing",
    restored: (n) => `Restored ${n} controller(s), Bluetooth restarted`,
    nothingToRestore: "Nothing to restore",
    secPairing: "Pairing",
    waiting: (s) => `Waiting for cable… ${s}s (cancel)`,
    pairButton: "Pair PS3",
    plugNow: "Plug the DS3 in with the USB cable now",
    plugNowDesc: "When the lights blink, unplug it and press the PS button.",
    secUpdates: "SteamOS updates",
    persist: "Remember PS3 controllers across updates",
    persistDesc: "Keeps pairings in /home and restores them at boot.",
    restoreNow: "Restore now",
    secControllers: "PS3 controllers",
    noControllers: "No controllers registered",
    ledUnreachable: "LEDs not reachable",
    identify: "Identify (LEDs and rumble)",
    removeTitle: "Remove controller?",
    removeDesc: (a) => `${a} will need to be paired again with the cable.`,
    remove: "Remove",
    removed: (a) => `${a} removed`,
    options: "Options",
    paired: (a) => `Controller ${a} paired: unplug it and press PS`,
    battery: (n) => `battery ${n}%`,
    charging: "charging",
    rumble: "Rumble",
    showBattery: "Show battery on LEDs",
    rename: "Rename",
    renameTitle: "Controller name",
    renameHint: "Leave empty to use the default name",
    save: "Save",
    cancel: "Cancel",
    secOptions: "Options",
    combo: "Battery with SELECT + START",
    comboDesc: "Hold SELECT and START for 1.5 s: the pad LEDs show the charge (1–4).",
    batteryInfo: "Battery info",
    close: "Close",
    hm: (h, m) => (h ? `${h} h ${m} min` : `${m} min`),
    cycleNow: (d, u) => `Since the last full charge (${d}): ${u} of use`,
    cycleNone: "No full charge recorded yet: leave the pad on the cable until it reaches 100%.",
    cycleLast: (u, pct) => `Previous cycle: ${u} of use, from 100% to ${pct}`,
    cycleNote: "Only time with the pad switched on is counted. Compare cycles over time: a big drop in duration means the battery is wearing out.",
    powerOff: "Turn off",
    powerOffAll: "Turn off all PS3 controllers",
    poweredOff: (n) => (n === 1 ? "1 controller turned off" : `${n} controllers turned off`),
    chargeLeds: "Show charging on LEDs",
    chargeLedsDesc: "With the cable plugged in: a filling bar while charging, 4 steady LEDs when full.",
};
function steamLanguage() {
    const w = window;
    try {
        const loc = w.LocalizationManager?.m_rgLocalesToUse?.[0];
        if (typeof loc === "string" && loc)
            return loc.toLowerCase();
    }
    catch {
        /* ignora */
    }
    return (navigator.language || "en").toLowerCase();
}
let t = en;
async function initLanguage() {
    let lang = steamLanguage();
    try {
        const s = await window.SteamClient?.Settings?.GetCurrentLanguage?.();
        if (typeof s === "string" && s)
            lang = s.toLowerCase();
    }
    catch {
        /* ignora */
    }
    t = lang.startsWith("it") ? it : en; // "italian" (Steam) o "it-IT" (browser)
}
initLanguage();

const PAIR_SECONDS = 60;
const startPairing = callable("start_pairing");
const stopPairing = callable("stop_pairing");
const pairingLeft = callable("pairing_left");
const listDevices = callable("list_devices");
const removeDevice = callable("remove_device");
const getPersist = callable("get_persist");
const setPersist = callable("set_persist");
const restoreNow = callable("restore_now");
const identify = callable("identify");
const rumble = callable("rumble");
const powerOff = callable("power_off");
const powerOffAll = callable("power_off_all");
const showBattery = callable("show_battery");
const setName = callable("set_name");
const getCombo = callable("get_combo");
const setCombo = callable("set_combo");
const getChargeLeds = callable("get_charge_leds");
const setChargeLeds = callable("set_charge_leds");
function title(d) {
    const base = d.player ? t.player(d.player) : "PS3";
    return d.alias ? `${d.alias} · ${base.replace("PS3 · ", "")}` : base;
}
function batteryText(d) {
    if (!d.battery)
        return "";
    const b = t.battery(d.battery.capacity);
    return d.battery.status === "Charging" ? `${b} (${t.charging})` : b;
}
function dur(sec) {
    const m = Math.floor(sec / 60);
    return t.hm(Math.floor(m / 60), m % 60);
}
function BatteryInfoModal({ d, closeModal }) {
    const st = d.stats;
    const when = (ts) => new Date(ts * 1000).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const pct = (lv) => (lv ? `~${lv * 25}%` : "?");
    return (window.SP_REACT.createElement(DFL.ModalRoot, { closeModal: closeModal },
        window.SP_REACT.createElement("div", { className: DFL.staticClasses.Title, style: { marginBottom: 12 } },
            t.batteryInfo,
            " \u00B7 ",
            title(d)),
        window.SP_REACT.createElement("p", null, st.full_at && st.use_s !== null ? t.cycleNow(when(st.full_at), dur(st.use_s)) : t.cycleNone),
        st.last_cycle && window.SP_REACT.createElement("p", null, t.cycleLast(dur(st.last_cycle.use_s), pct(st.last_cycle.to_level))),
        window.SP_REACT.createElement("p", { style: { opacity: 0.7, fontSize: "0.9em" } }, t.cycleNote),
        window.SP_REACT.createElement(DFL.DialogButton, { style: { marginTop: 12 }, onClick: () => closeModal?.() }, t.close)));
}
function RenameModal({ d, closeModal, onDone }) {
    const [name, setNameState] = SP_REACT.useState(d.alias);
    const save = async () => {
        await setName(d.address, name);
        closeModal?.();
        onDone();
    };
    return (window.SP_REACT.createElement(DFL.ModalRoot, { closeModal: closeModal },
        window.SP_REACT.createElement("div", { className: DFL.staticClasses.Title, style: { marginBottom: 12 } }, t.renameTitle),
        window.SP_REACT.createElement(DFL.TextField, { label: d.address, description: t.renameHint, value: name, onChange: (e) => setNameState(e.target.value) }),
        window.SP_REACT.createElement(DFL.Focusable, { style: { display: "flex", gap: 8, marginTop: 16 }, "flow-children": "horizontal" },
            window.SP_REACT.createElement(DFL.DialogButton, { onClick: () => closeModal?.() }, t.cancel),
            window.SP_REACT.createElement(DFL.DialogButton, { onClick: save }, t.save))));
}
function status(d) {
    if (d.connected) {
        const b = batteryText(d);
        return b ? `${t.connected(d.address)} · ${b}` : t.connected(d.address);
    }
    if (!d.registered && d.saved)
        return t.onlyBackup;
    return `${d.saved ? t.offSaved : t.offNotSaved} · ${d.address}`;
}
function Content() {
    const [left, setLeft] = SP_REACT.useState(0);
    const [devices, setDevices] = SP_REACT.useState([]);
    const [persist, setPersistState] = SP_REACT.useState(false);
    const [busy, setBusy] = SP_REACT.useState(false);
    const [combo, setComboState] = SP_REACT.useState(true);
    const [chargeLeds, setChargeLedsState] = SP_REACT.useState(true);
    const refresh = SP_REACT.useCallback(async () => {
        setDevices(await listDevices());
        setLeft(await pairingLeft());
    }, []);
    SP_REACT.useEffect(() => {
        refresh();
        getPersist().then(setPersistState);
        getCombo().then(setComboState);
        getChargeLeds().then(setChargeLedsState);
        const t = setInterval(refresh, 2000);
        return () => clearInterval(t);
    }, [refresh]);
    const onPair = async () => {
        if (left > 0) {
            await stopPairing();
            setLeft(0);
            return;
        }
        const ok = await startPairing(PAIR_SECONDS);
        if (!ok) {
            toaster.toast({ title: "PS3 Pair", body: t.pairFailed });
            return;
        }
        setLeft(PAIR_SECONDS);
    };
    const onPersist = async (v) => {
        setBusy(true);
        setPersistState(await setPersist(v));
        setBusy(false);
        refresh();
    };
    const onRestore = async () => {
        setBusy(true);
        const r = await restoreNow();
        setBusy(false);
        toaster.toast({
            title: "PS3 Pair",
            body: r.length ? t.restored(r.length) : t.nothingToRestore,
        });
        refresh();
    };
    return (window.SP_REACT.createElement(window.SP_REACT.Fragment, null,
        window.SP_REACT.createElement(DFL.PanelSection, { title: t.secPairing },
            window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.ButtonItem, { layout: "below", onClick: onPair }, left > 0 ? t.waiting(left) : t.pairButton)),
            left > 0 && (window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.Field, { label: t.plugNow, description: t.plugNowDesc, bottomSeparator: "none" })))),
        window.SP_REACT.createElement(DFL.PanelSection, { title: t.secUpdates },
            window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.ToggleField, { label: t.persist, description: t.persistDesc, checked: persist, disabled: busy, onChange: onPersist })),
            persist && (window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: onRestore }, t.restoreNow)))),
        window.SP_REACT.createElement(DFL.PanelSection, { title: t.secOptions },
            window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.ToggleField, { label: t.combo, description: t.comboDesc, checked: combo, onChange: async (v) => setComboState(await setCombo(v)) })),
            window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.ToggleField, { label: t.chargeLeds, description: t.chargeLedsDesc, checked: chargeLeds, onChange: async (v) => setChargeLedsState(await setChargeLeds(v)) }))),
        window.SP_REACT.createElement(DFL.PanelSection, { title: t.secControllers },
            devices.length === 0 && (window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.Field, { label: t.noControllers, bottomSeparator: "none" }))),
            devices.some((d) => d.connected) && (window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.ButtonItem, { layout: "below", onClick: async () => {
                        const n = await powerOffAll();
                        toaster.toast({ title: "PS3 Pair", body: t.poweredOff(n) });
                        refresh();
                    } }, t.powerOffAll))),
            devices.map((d) => (window.SP_REACT.createElement(DFL.PanelSectionRow, { key: d.adapter + d.address },
                window.SP_REACT.createElement(DFL.ButtonItem, { layout: "below", label: title(d), description: status(d), onClick: (e) => DFL.showContextMenu(window.SP_REACT.createElement(DFL.Menu, { label: title(d) },
                        d.connected && (window.SP_REACT.createElement(DFL.MenuItem, { onSelected: async () => {
                                if (!(await identify(d.address)))
                                    toaster.toast({ title: "PS3 Pair", body: t.ledUnreachable });
                            } }, t.identify)),
                        d.connected && window.SP_REACT.createElement(DFL.MenuItem, { onSelected: () => rumble(d.address) }, t.rumble),
                        d.connected && (window.SP_REACT.createElement(DFL.MenuItem, { onSelected: async () => {
                                await powerOff(d.address);
                                refresh();
                            } }, t.powerOff)),
                        d.connected && d.battery && (window.SP_REACT.createElement(DFL.MenuItem, { onSelected: () => showBattery(d.address) }, t.showBattery)),
                        window.SP_REACT.createElement(DFL.MenuItem, { onSelected: () => DFL.showModal(window.SP_REACT.createElement(BatteryInfoModal, { d: d })) }, t.batteryInfo),
                        window.SP_REACT.createElement(DFL.MenuItem, { onSelected: () => DFL.showModal(window.SP_REACT.createElement(RenameModal, { d: d, onDone: refresh })) }, t.rename),
                        window.SP_REACT.createElement(DFL.MenuItem, { tone: "destructive", onSelected: () => DFL.showModal(window.SP_REACT.createElement(DFL.ConfirmModal, { strTitle: t.removeTitle, strDescription: t.removeDesc(d.address), strOKButtonText: t.remove, onOK: async () => {
                                    await removeDevice(d.adapter, d.address);
                                    toaster.toast({ title: "PS3 Pair", body: t.removed(d.address) });
                                    refresh();
                                } })) }, t.remove)), e.currentTarget ?? window) }, t.options)))))));
}
var index = definePlugin(() => {
    initLanguage();
    const onPaired = (addr) => toaster.toast({ title: "PS3 Pair", body: t.paired(addr) });
    addEventListener("ps3_paired", onPaired);
    return {
        name: "PS3 Pair",
        titleView: window.SP_REACT.createElement("div", { className: DFL.staticClasses.Title }, "PS3 Pair"),
        content: window.SP_REACT.createElement(Content, null),
        icon: window.SP_REACT.createElement(FaPlaystation, null),
        onDismount() {
            removeEventListener("ps3_paired", onPaired);
        },
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
