// Testi dell'interfaccia: italiano se Steam è in italiano, altrimenti inglese.

const it = {
  player: (n: number) => `PS3 · giocatore ${n}`,
  connected: (a: string) => `Connesso · ${a}`,
  onlyBackup: "Solo nel backup — usa «Ripristina ora»",
  offSaved: "Spento · salvato",
  offNotSaved: "Spento · non salvato",
  pairFailed: "Impossibile attivare l'accoppiamento",
  restored: (n: number) => `Ripristinati ${n} controller, Bluetooth riavviato`,
  nothingToRestore: "Niente da ripristinare",
  secPairing: "Accoppiamento",
  waiting: (s: number) => `In attesa del cavo… ${s}s (annulla)`,
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
  removeDesc: (a: string) => `${a} andrà riaccoppiato con il cavo.`,
  remove: "Rimuovi",
  removed: (a: string) => `${a} rimosso`,
  options: "Opzioni",
  paired: (a: string) => `Controller ${a} accoppiato: staccalo e premi PS`,
  battery: (n: number) => `batteria ${n}%`,
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
  chargeLeds: "Mostra la ricarica sui LED",
  chargeLedsDesc: "Col cavo collegato: barra che si riempie in carica, 4 LED fissi quando è carico.",
};

const en: typeof it = {
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
  chargeLeds: "Show charging on LEDs",
  chargeLedsDesc: "With the cable plugged in: a filling bar while charging, 4 steady LEDs when full.",
};

function steamLanguage(): string {
  const w = window as any;
  try {
    const loc = w.LocalizationManager?.m_rgLocalesToUse?.[0];
    if (typeof loc === "string" && loc) return loc.toLowerCase();
  } catch {
    /* ignora */
  }
  return (navigator.language || "en").toLowerCase();
}

export let t = en;

export async function initLanguage() {
  let lang = steamLanguage();
  try {
    const s = await (window as any).SteamClient?.Settings?.GetCurrentLanguage?.();
    if (typeof s === "string" && s) lang = s.toLowerCase();
  } catch {
    /* ignora */
  }
  t = lang.startsWith("it") ? it : en; // "italian" (Steam) o "it-IT" (browser)
}

initLanguage();
