import {
  ButtonItem,
  ConfirmModal,
  Field,
  PanelSection,
  PanelSectionRow,
  ToggleField,
  showModal,
  staticClasses,
} from "@decky/ui";
import { addEventListener, callable, definePlugin, removeEventListener, toaster } from "@decky/api";
import { useCallback, useEffect, useState } from "react";
import { FaPlaystation } from "react-icons/fa";

type Device = {
  adapter: string;
  address: string;
  name: string;
  registered: boolean;
  saved: boolean;
  connected: boolean;
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

function status(d: Device): string {
  if (d.connected) return "Connesso";
  if (!d.registered && d.saved) return "Solo nel backup — usa «Ripristina ora»";
  return d.saved ? "Registrato · salvato" : "Registrato · non salvato";
}

function Content() {
  const [left, setLeft] = useState(0);
  const [devices, setDevices] = useState<Device[]>([]);
  const [persist, setPersistState] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setDevices(await listDevices());
    setLeft(await pairingLeft());
  }, []);

  useEffect(() => {
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
      body: r.length ? `Ripristinati ${r.length} controller, Bluetooth riavviato` : "Niente da ripristinare",
    });
    refresh();
  };

  return (
    <>
      <PanelSection title="Accoppiamento">
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={onPair}>
            {left > 0 ? `In attesa del cavo… ${left}s (annulla)` : "Accoppia PS3"}
          </ButtonItem>
        </PanelSectionRow>
        {left > 0 && (
          <PanelSectionRow>
            <Field
              label="Collega ora il DS3 con il cavo USB"
              description="Quando la luce lampeggia staccalo e premi il tasto PS."
              bottomSeparator="none"
            />
          </PanelSectionRow>
        )}
      </PanelSection>

      <PanelSection title="Aggiornamenti SteamOS">
        <PanelSectionRow>
          <ToggleField
            label="Ricorda i PS3 tra gli aggiornamenti"
            description="Salva i pairing in /home e li ripristina all'avvio."
            checked={persist}
            disabled={busy}
            onChange={onPersist}
          />
        </PanelSectionRow>
        {persist && (
          <PanelSectionRow>
            <ButtonItem layout="below" disabled={busy} onClick={onRestore}>
              Ripristina ora
            </ButtonItem>
          </PanelSectionRow>
        )}
      </PanelSection>

      <PanelSection title="Controller PS3">
        {devices.length === 0 && (
          <PanelSectionRow>
            <Field label="Nessun controller registrato" bottomSeparator="none" />
          </PanelSectionRow>
        )}
        {devices.map((d) => (
          <PanelSectionRow key={d.adapter + d.address}>
            <ButtonItem
              layout="below"
              label={d.address}
              description={status(d)}
              onClick={() =>
                showModal(
                  <ConfirmModal
                    strTitle="Rimuovere il controller?"
                    strDescription={`${d.address} andrà riaccoppiato con il cavo.`}
                    strOKButtonText="Rimuovi"
                    onOK={async () => {
                      await removeDevice(d.adapter, d.address);
                      toaster.toast({ title: "PS3 Pair", body: `${d.address} rimosso` });
                      refresh();
                    }}
                  />,
                )
              }
            >
              Rimuovi
            </ButtonItem>
          </PanelSectionRow>
        ))}
      </PanelSection>
    </>
  );
}

export default definePlugin(() => {
  const onPaired = (addr: string) =>
    toaster.toast({ title: "PS3 Pair", body: `Controller ${addr} accoppiato: staccalo e premi PS` });
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
