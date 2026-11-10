// UI strings: Italian when Steam is in Italian, English otherwise.

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
  guide: "Guida: prima connessione e LED",
  guideFirstTitle: "Prima connessione di un nuovo PS3",
  guideFirstSteps: [
    "Accendi il Bluetooth del Deck.",
    "Collega il PS3 al Deck con un cavo USB. In Modalità Gioco di solito Steam lo autorizza da solo; se il pad non si collega, premi «Accoppia PS3» e ricollegalo entro 60 secondi.",
    "Aspetta qualche secondo, stacca il cavo e premi il tasto PS: il pad si collega via Bluetooth.",
    "Da qui in poi basta premere PS, anche dopo gli aggiornamenti di SteamOS (con «Ricorda i PS3» attivo).",
  ],
  guideFirstNote: "Il cavo serve una sola volta. Un DS3 ricorda un solo dispositivo: se lo colleghi via cavo a una PS3 o a un altro PC, sul Deck andrà ricollegato col cavo.",
  guideLedsTitle: "Cosa indicano i LED",
  guideLeds: [
    ["▮▯▯▯ fisso", "numero del giocatore (1–4)"],
    ["spenti → barra che sale → 2 lampeggi → fissa", "batteria dopo SELECT + START: 1 LED fino al 25%, 2 fino al 50%, 3 fino al 75%, 4 fino al 100%"],
    ["LED 1 lampeggia", "batteria sotto il 25%"],
    ["barra che si riempie in loop (col cavo)", "in carica: il primo giro va da 0 a 4, poi riparte dall'ultimo livello noto"],
    ["▮▮▮▮ fissi (col cavo)", "carica completa"],
    ["lampeggio alternato veloce + vibrazione", "«Identifica» dal plugin"],
    ["4 LED che lampeggiano insieme, pad non collegato", "il pad cerca il Deck: premi di nuovo PS o ricollegalo col cavo"],
  ] as [string, string][],
  guideLedsNote: "In carica il DS3 non comunica il livello: la barra vuol dire solo «sta caricando». Il livello va a scatti di 25% e per un minuto dopo aver staccato il cavo può oscillare.",
  batteryInfo: "Info batteria",
  close: "Chiudi",
  hm: (h: number, m: number) => (h ? `${h} h ${m} min` : `${m} min`),
  cycleNow: (d: string, u: string) => `Dall'ultima carica completa (${d}): ${u} di utilizzo`,
  cycleNone: "Nessuna carica completa registrata: lascia il pad col cavo finché arriva al 100%.",
  cycleLast: (u: string, pct: string) => `Ciclo precedente: ${u} di utilizzo, da 100% a ${pct}`,
  cycleNote: "Conta solo il tempo in cui il pad è acceso. Confronta i cicli nel tempo: se la durata cala molto, la batteria si sta consumando.",
  powerOff: "Spegni",
  powerOffAll: "Spegni tutti i PS3",
  poweredOff: (n: number) => (n === 1 ? "1 controller spento" : `${n} controller spenti`),
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
  guide: "Guide: first connection and LEDs",
  guideFirstTitle: "First connection of a new PS3",
  guideFirstSteps: [
    "Turn the Deck's Bluetooth on.",
    "Plug the PS3 into the Deck with a USB cable. In Game Mode Steam usually authorizes it on its own; if the pad does not connect, press “Pair PS3” and plug it in again within 60 seconds.",
    "Wait a few seconds, unplug the cable and press the PS button: the pad connects over Bluetooth.",
    "From now on just press PS, even after SteamOS updates (with “Remember PS3 controllers” on).",
  ],
  guideFirstNote: "The cable is needed only once. A DS3 remembers a single host: if you plug it into a PS3 or another PC, it will need the cable on the Deck again.",
  guideLedsTitle: "What the LEDs mean",
  guideLeds: [
    ["▮▯▯▯ steady", "player number (1–4)"],
    ["off → bar fills → 2 blinks → steady", "battery after SELECT + START: 1 LED up to 25%, 2 up to 50%, 3 up to 75%, 4 up to 100%"],
    ["LED 1 blinking", "battery below 25%"],
    ["bar filling in a loop (cable in)", "charging: the first round goes 0 to 4, then it starts from the last known level"],
    ["▮▮▮▮ steady (cable in)", "fully charged"],
    ["fast alternating blink + rumble", "“Identify” from the plugin"],
    ["all 4 blinking together, pad not connected", "the pad is looking for the Deck: press PS again or plug the cable in"],
  ] as [string, string][],
  guideLedsNote: "While charging the DS3 does not report its level: the bar only means “charging”. The level has 25% steps and may bounce for a minute after unplugging.",
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

function steamLanguage(): string {
  const w = window as any;
  try {
    const loc = w.LocalizationManager?.m_rgLocalesToUse?.[0];
    if (typeof loc === "string" && loc) return loc.toLowerCase();
  } catch {
    /* ignore */
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
    /* ignore */
  }
  t = lang.startsWith("it") ? it : en; // "italian" (Steam) or "it-IT" (browser)
}

initLanguage();
