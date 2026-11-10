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

const PAIR_SECONDS = 60;
const startPairing = callable("start_pairing");
const stopPairing = callable("stop_pairing");
const pairingLeft = callable("pairing_left");
const listDevices = callable("list_devices");
const removeDevice = callable("remove_device");
const getPersist = callable("get_persist");
const setPersist = callable("set_persist");
const restoreNow = callable("restore_now");
function status(d) {
    if (d.connected)
        return "Connesso";
    if (!d.registered && d.saved)
        return "Solo nel backup — usa «Ripristina ora»";
    return d.saved ? "Registrato · salvato" : "Registrato · non salvato";
}
function Content() {
    const [left, setLeft] = SP_REACT.useState(0);
    const [devices, setDevices] = SP_REACT.useState([]);
    const [persist, setPersistState] = SP_REACT.useState(false);
    const [busy, setBusy] = SP_REACT.useState(false);
    const refresh = SP_REACT.useCallback(async () => {
        setDevices(await listDevices());
        setLeft(await pairingLeft());
    }, []);
    SP_REACT.useEffect(() => {
        refresh();
        getPersist().then(setPersistState);
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
            toaster.toast({ title: "PS3 Pair", body: "Impossibile attivare l'accoppiamento" });
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
            body: r.length ? `Ripristinati ${r.length} controller, Bluetooth riavviato` : "Niente da ripristinare",
        });
        refresh();
    };
    return (window.SP_REACT.createElement(window.SP_REACT.Fragment, null,
        window.SP_REACT.createElement(DFL.PanelSection, { title: "Accoppiamento" },
            window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.ButtonItem, { layout: "below", onClick: onPair }, left > 0 ? `In attesa del cavo… ${left}s (annulla)` : "Accoppia PS3")),
            left > 0 && (window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.Field, { label: "Collega ora il DS3 con il cavo USB", description: "Quando la luce lampeggia staccalo e premi il tasto PS.", bottomSeparator: "none" })))),
        window.SP_REACT.createElement(DFL.PanelSection, { title: "Aggiornamenti SteamOS" },
            window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.ToggleField, { label: "Ricorda i PS3 tra gli aggiornamenti", description: "Salva i pairing in /home e li ripristina all'avvio.", checked: persist, disabled: busy, onChange: onPersist })),
            persist && (window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.ButtonItem, { layout: "below", disabled: busy, onClick: onRestore }, "Ripristina ora")))),
        window.SP_REACT.createElement(DFL.PanelSection, { title: "Controller PS3" },
            devices.length === 0 && (window.SP_REACT.createElement(DFL.PanelSectionRow, null,
                window.SP_REACT.createElement(DFL.Field, { label: "Nessun controller registrato", bottomSeparator: "none" }))),
            devices.map((d) => (window.SP_REACT.createElement(DFL.PanelSectionRow, { key: d.adapter + d.address },
                window.SP_REACT.createElement(DFL.ButtonItem, { layout: "below", label: d.address, description: status(d), onClick: () => DFL.showModal(window.SP_REACT.createElement(DFL.ConfirmModal, { strTitle: "Rimuovere il controller?", strDescription: `${d.address} andrà riaccoppiato con il cavo.`, strOKButtonText: "Rimuovi", onOK: async () => {
                            await removeDevice(d.adapter, d.address);
                            toaster.toast({ title: "PS3 Pair", body: `${d.address} rimosso` });
                            refresh();
                        } })) }, "Rimuovi")))))));
}
var index = definePlugin(() => {
    const onPaired = (addr) => toaster.toast({ title: "PS3 Pair", body: `Controller ${addr} accoppiato: staccalo e premi PS` });
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
