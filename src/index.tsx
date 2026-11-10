import {
  ButtonItem,
  ConfirmModal,
  DialogButton,
  Focusable,
  ModalRoot,
  TextField,
  Field,
  Menu,
  MenuItem,
  PanelSection,
  PanelSectionRow,
  ToggleField,
  showContextMenu,
  showModal,
  staticClasses,
} from "@decky/ui";
import { addEventListener, callable, definePlugin, removeEventListener, toaster } from "@decky/api";
import { useCallback, useEffect, useState } from "react";
import { FaPlaystation } from "react-icons/fa";
import { initLanguage, t } from "./i18n";

type Device = {
  adapter: string;
  address: string;
  name: string;
  registered: boolean;
  saved: boolean;
  connected: boolean;
  player: number | null;
  battery: { capacity: number; status: string } | null;
  alias: string;
  stats: {
    full_at: number | null;
    use_s: number | null;
    last_cycle: { use_s: number; to_level: number | null; full_at: number; ended: number } | null;
  };
};

const PAIR_SECONDS = 60;

const startPairing = callable<[seconds: number], boolean>("start_pairing");
const stopPairing = callable<[], boolean>("stop_pairing");
const pairingLeft = callable<[], number>("pairing_left");
const listDevices = callable<[], Device[]>("list_devices");
const removeDevice = callable<[adapter: string, address: string], boolean>("remove_device");
const getPersist = callable<[], boolean>("get_persist");
const setPersist = callable<[enabled: boolean], boolean>("set_persist");
const restoreNow = callable<[], string[]>("restore_now");
const identify = callable<[address: string], boolean>("identify");
const rumble = callable<[address: string], boolean>("rumble");
const powerOff = callable<[address: string], boolean>("power_off");
const powerOffAll = callable<[], number>("power_off_all");
const showBattery = callable<[address: string], boolean>("show_battery");
const setName = callable<[address: string, name: string], boolean>("set_name");
const getCombo = callable<[], boolean>("get_combo");
const setCombo = callable<[enabled: boolean], boolean>("set_combo");
const getChargeLeds = callable<[], boolean>("get_charge_leds");
const setChargeLeds = callable<[enabled: boolean], boolean>("set_charge_leds");

function title(d: Device): string {
  const base = d.player ? t.player(d.player) : "PS3";
  return d.alias ? `${d.alias} · ${base.replace("PS3 · ", "")}` : base;
}

function batteryText(d: Device): string {
  if (!d.battery) return "";
  const b = t.battery(d.battery.capacity);
  return d.battery.status === "Charging" ? `${b} (${t.charging})` : b;
}

function dur(sec: number): string {
  const m = Math.floor(sec / 60);
  return t.hm(Math.floor(m / 60), m % 60);
}

function BatteryInfoModal({ d, closeModal }: { d: Device; closeModal?: () => void }) {
  const st = d.stats;
  const when = (ts: number) =>
    new Date(ts * 1000).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const pct = (lv: number | null) => (lv ? `~${lv * 25}%` : "?");
  return (
    <ModalRoot closeModal={closeModal}>
      <div className={staticClasses.Title} style={{ marginBottom: 12 }}>
        {t.batteryInfo} · {title(d)}
      </div>
      <p>{st.full_at && st.use_s !== null ? t.cycleNow(when(st.full_at), dur(st.use_s)) : t.cycleNone}</p>
      {st.last_cycle && <p>{t.cycleLast(dur(st.last_cycle.use_s), pct(st.last_cycle.to_level))}</p>}
      <p style={{ opacity: 0.7, fontSize: "0.9em" }}>{t.cycleNote}</p>
      <DialogButton style={{ marginTop: 12 }} onClick={() => closeModal?.()}>
        {t.close}
      </DialogButton>
    </ModalRoot>
  );
}

function GuideModal({ closeModal }: { closeModal?: () => void }) {
  return (
    <ModalRoot closeModal={closeModal}>
      <div className={staticClasses.Title} style={{ marginBottom: 8 }}>
        {t.guideFirstTitle}
      </div>
      <ol style={{ marginTop: 0, paddingLeft: 20 }}>
        {t.guideFirstSteps.map((step, i) => (
          <li key={i} style={{ marginBottom: 4 }}>
            {step}
          </li>
        ))}
      </ol>
      <p style={{ opacity: 0.7, fontSize: "0.9em" }}>{t.guideFirstNote}</p>
      <div className={staticClasses.Title} style={{ margin: "16px 0 8px" }}>
        {t.guideLedsTitle}
      </div>
      {t.guideLeds.map(([pattern, meaning], i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <b>{pattern}</b>
          <br />
          <span style={{ opacity: 0.85 }}>{meaning}</span>
        </div>
      ))}
      <p style={{ opacity: 0.7, fontSize: "0.9em" }}>{t.guideLedsNote}</p>
      <DialogButton style={{ marginTop: 12 }} onClick={() => closeModal?.()}>
        {t.close}
      </DialogButton>
    </ModalRoot>
  );
}

function RenameModal({ d, closeModal, onDone }: { d: Device; closeModal?: () => void; onDone: () => void }) {
  const [name, setNameState] = useState(d.alias);
  const save = async () => {
    await setName(d.address, name);
    closeModal?.();
    onDone();
  };
  return (
    <ModalRoot closeModal={closeModal}>
      <div className={staticClasses.Title} style={{ marginBottom: 12 }}>
        {t.renameTitle}
      </div>
      <TextField
        label={d.address}
        description={t.renameHint}
        value={name}
        onChange={(e) => setNameState(e.target.value)}
      />
      <Focusable style={{ display: "flex", gap: 8, marginTop: 16 }} flow-children="horizontal">
        <DialogButton onClick={() => closeModal?.()}>{t.cancel}</DialogButton>
        <DialogButton onClick={save}>{t.save}</DialogButton>
      </Focusable>
    </ModalRoot>
  );
}

function status(d: Device): string {
  if (d.connected) {
    const b = batteryText(d);
    return b ? `${t.connected(d.address)} · ${b}` : t.connected(d.address);
  }
  if (!d.registered && d.saved) return t.onlyBackup;
  return `${d.saved ? t.offSaved : t.offNotSaved} · ${d.address}`;
}

function Content() {
  const [left, setLeft] = useState(0);
  const [devices, setDevices] = useState<Device[]>([]);
  const [persist, setPersistState] = useState(false);
  const [busy, setBusy] = useState(false);
  const [combo, setComboState] = useState(true);
  const [chargeLeds, setChargeLedsState] = useState(true);

  const refresh = useCallback(async () => {
    setDevices(await listDevices());
    setLeft(await pairingLeft());
  }, []);

  useEffect(() => {
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

  const onPersist = async (v: boolean) => {
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

  return (
    <>
      <PanelSection title={t.secPairing}>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={onPair}>
            {left > 0 ? t.waiting(left) : t.pairButton}
          </ButtonItem>
        </PanelSectionRow>
        {left > 0 && (
          <PanelSectionRow>
            <Field
              label={t.plugNow}
              description={t.plugNowDesc}
              bottomSeparator="none"
            />
          </PanelSectionRow>
        )}
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => showModal(<GuideModal />)}>
            {t.guide}
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={t.secUpdates}>
        <PanelSectionRow>
          <ToggleField
            label={t.persist}
            description={t.persistDesc}
            checked={persist}
            disabled={busy}
            onChange={onPersist}
          />
        </PanelSectionRow>
        {persist && (
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={busy} onClick={onRestore}>
              {t.restoreNow}
            </ButtonItem>
          </PanelSectionRow>
        )}
      </PanelSection>

      <PanelSection title={t.secOptions}>
        <PanelSectionRow>
          <ToggleField
            label={t.combo}
            description={t.comboDesc}
            checked={combo}
            onChange={async (v: boolean) => setComboState(await setCombo(v))}
          />
        </PanelSectionRow>
        <PanelSectionRow>
          <ToggleField
            label={t.chargeLeds}
            description={t.chargeLedsDesc}
            checked={chargeLeds}
            onChange={async (v: boolean) => setChargeLedsState(await setChargeLeds(v))}
          />
        </PanelSectionRow>
      </PanelSection>

      <PanelSection title={t.secControllers}>
        {devices.length === 0 && (
          <PanelSectionRow>
            <Field label={t.noControllers} bottomSeparator="none" />
          </PanelSectionRow>
        )}
        {devices.some((d) => d.connected) && (
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              onClick={async () => {
                const n = await powerOffAll();
                toaster.toast({ title: "PS3 Pair", body: t.poweredOff(n) });
                refresh();
              }}
            >
              {t.powerOffAll}
            </ButtonItem>
          </PanelSectionRow>
        )}
        {devices.map((d) => (
          <PanelSectionRow key={d.adapter + d.address}>
            <ButtonItem
              layout="below"
              label={title(d)}
              description={status(d)}
              onClick={(e: MouseEvent) =>
                showContextMenu(
                  <Menu label={title(d)}>
                    {d.connected && (
                      <MenuItem
                        onSelected={async () => {
                          if (!(await identify(d.address)))
                            toaster.toast({ title: "PS3 Pair", body: t.ledUnreachable });
                        }}
                      >
                        {t.identify}
                      </MenuItem>
                    )}
                    {d.connected && <MenuItem onSelected={() => rumble(d.address)}>{t.rumble}</MenuItem>}
                    {d.connected && (
                      <MenuItem
                        onSelected={async () => {
                          await powerOff(d.address);
                          refresh();
                        }}
                      >
                        {t.powerOff}
                      </MenuItem>
                    )}
                    {d.connected && d.battery && (
                      <MenuItem onSelected={() => showBattery(d.address)}>{t.showBattery}</MenuItem>
                    )}
                    <MenuItem onSelected={() => showModal(<BatteryInfoModal d={d} />)}>{t.batteryInfo}</MenuItem>
                    <MenuItem onSelected={() => showModal(<RenameModal d={d} onDone={refresh} />)}>
                      {t.rename}
                    </MenuItem>
                    <MenuItem
                      tone="destructive"
                      onSelected={() =>
                        showModal(
                          <ConfirmModal
                            strTitle={t.removeTitle}
                            strDescription={t.removeDesc(d.address)}
                            strOKButtonText={t.remove}
                            onOK={async () => {
                              await removeDevice(d.adapter, d.address);
                              toaster.toast({ title: "PS3 Pair", body: t.removed(d.address) });
                              refresh();
                            }}
                          />,
                        )
                      }
                    >
                      {t.remove}
                    </MenuItem>
                  </Menu>,
                  e.currentTarget ?? window,
                )
              }
            >
              {t.options}
            </ButtonItem>
          </PanelSectionRow>
        ))}
      </PanelSection>
    </>
  );
}

export default definePlugin(() => {
  initLanguage();
  const onPaired = (addr: string) =>
    toaster.toast({ title: "PS3 Pair", body: t.paired(addr) });
  addEventListener<[string]>("ps3_paired", onPaired);

  return {
    name: "PS3 Pair",
    titleView: <div className={staticClasses.Title}>PS3 Pair</div>,
    content: <Content />,
    icon: <FaPlaystation />,
    onDismount() {
      removeEventListener("ps3_paired", onPaired);
    },
  };
});
