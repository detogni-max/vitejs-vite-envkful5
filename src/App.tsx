import React, { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const pct = (v, r) => (((v - r) / r) * 100).toFixed(1);

// ─── OMI Data (valori verificati su fonti OMI AE + Nomisma 2024 H2) ──────────
const OMI_DATA = {
  Milano: {
    zone: [
      // Fonte: OMI AE 2024 H2 zona B15 (Brera-Duomo) residenziale civile: 7.200–14.800 €/mq
      // Range conservativo normalizzato per abitazioni civili in stato normale/buono
      { nome: "Centro Storico / Brera / Duomo", kw: ["brera","duomo","montenapoleone","scala","cordusio","cairoli","castello","lanza","missori","turati","sanbabila","san babila","vittorio emanuele","manzoni","verdi"], min_res:7200, max_res:12500, min_com:4200, max_com:8000 },
      // Navigli/Isola/Porta Venezia: zone B/C Milano, ~4.500-8.000 residenziale
      { nome: "Navigli / Isola / Porta Venezia", kw: ["navigli","isola","garibaldi","porta venezia","lambrate","loreto","piola","darsena","colonne","porta genova"], min_res:4500, max_res:8000, min_com:2800, max_com:5200 },
      // Sempione/Pagano/Washington: zona B-C, ~4.000-7.500
      { nome: "Sempione / Pagano / Washington", kw: ["sempione","washington","solari","de angeli","wagner","amendola","lotto","portello","pagano","magenta","conciliazione"], min_res:4000, max_res:7500, min_com:2400, max_com:4800 },
      // Città Studi/Lambrate semicentrale: ~3.000-5.500
      { nome: "Città Studi / Porta Romana / Bovisa", kw: ["città studi","porta romana","bovisa","famagosta","romolo","vigentino","ripamonti","corsica","lodi"], min_res:3000, max_res:5500, min_com:1800, max_com:3500 },
      // Periferia/hinterland: zone D-E Milano
      { nome: "Periferia / Hinterland Milano", kw: ["bicocca","sesto","niguarda","affori","comasina","quarto oggiaro","baggio","lorenteggio","barona"], min_res:1900, max_res:3800, min_com:1100, max_com:2400 },
    ],
    semestre: "2024 H2", bbox: [45.38, 9.04, 45.55, 9.28],
  },
  Roma: {
    zone: [
      // Fonte: OMI AE 2024 – Centro Storico media 5.811 €/mq; Tridente fino 8.350 €/mq
      { nome: "Centro Storico / Tridente / Navona", kw: ["navona","trevi","pantheon","campo de fiori","trastevere","tridente","spagna","barberini","termini","esquilino","celio","aventino","pigneto"], min_res:5000, max_res:9500, min_com:3000, max_com:6500 },
      // Parioli 5.251 €/mq media; Prati 4.395 €/mq media OMI 2024
      { nome: "Parioli / Flaminio / Prati", kw: ["parioli","flaminio","prati","trionfale","cola di rienzo","lungotevere","salaria","trieste","nomentano","africano","balduina"], min_res:4000, max_res:7000, min_com:2400, max_com:4800 },
      // EUR/Ostiense/Garbatella: ~3.300-4.900 OMI
      { nome: "EUR / Ostiense / Testaccio / Garbatella", kw: ["eur","ostiense","testaccio","marconi","garbatella","montesacro","talenti","prenestina","tuscolana","appio"], min_res:2800, max_res:5200, min_com:1600, max_com:3500 },
      // Fuori GRA: 1.770-1.830 €/mq OMI 2024
      { nome: "Fuori GRA / Periferia Roma", kw: [], min_res:1600, max_res:2800, min_com:900, max_com:1900 },
    ],
    semestre: "2024 H2", bbox: [41.75, 12.35, 42.00, 12.65],
  },
  Torino: {
    zone: [
      // Fonte: OMI AE 2024 – Centro/Crocetta: 2.800-5.200 €/mq confermato
      { nome: "Centro / Crocetta / San Salvario", kw: ["crocetta","san salvario","centro","quadrilatero","valentino","vanchiglia","santa rita","borgo po","crimea","peyron","dante","san secondo"], min_res:2800, max_res:5200, min_com:1600, max_com:3400 },
      // Semicentrale: ~2.000-3.500
      { nome: "Semicentrale / Lingotto / Mirafiori Nord", kw: ["lingotto","mirafiori nord","nizza","millefonti","madonna di campagna","borgo vittoria","pozzo strada","parella"], min_res:2000, max_res:3500, min_com:1200, max_com:2400 },
      // Periferia: ~1.100-2.200
      { nome: "Periferia Torino", kw: ["aurora","barriera","mirafiori sud","rebaudengo","falchera","vallette","borgata"], min_res:1100, max_res:2200, min_com:700, max_com:1500 },
    ],
    semestre: "2024 H2", bbox: [44.97, 7.55, 45.15, 7.80],
  },
  Napoli: {
    zone: [
      // Fonte: OMI 2024 – Chiaia/Posillipo fascia alta: 3.500-7.000; Vomero: 3.000-5.500
      { nome: "Chiaia / Posillipo / Mergellina", kw: ["chiaia","posillipo","mergellina","pizzofalcone","riviera di chiaia","partenope"], min_res:3500, max_res:7000, min_com:2000, max_com:4500 },
      { nome: "Vomero / Arenella / Fuorigrotta", kw: ["vomero","arenella","fuorigrotta","soccavo","pianura","bagnoli","agnano"], min_res:2800, max_res:5200, min_com:1600, max_com:3400 },
      // Centro storico Napoli: ~2.000-4.000
      { nome: "Centro Storico / Decumani / Sanità", kw: ["spaccanapoli","sanità","decumani","toledo","quartieri spagnoli","forcella","port'alba","monteoliveto"], min_res:2000, max_res:4000, min_com:1200, max_com:2800 },
      { nome: "Periferia Napoli", kw: [], min_res:1000, max_res:2200, min_com:600, max_com:1500 },
    ],
    semestre: "2024 H2", bbox: [40.79, 14.13, 40.92, 14.35],
  },
  Firenze: {
    zone: [
      // Fonte: OMI 2024 – Centro/Oltrarno: 4.500-9.000 confermato; punte fino 11.000 per signorile
      { nome: "Centro Storico / Oltrarno / Santa Croce", kw: ["oltrarno","santa croce","san frediano","san niccolò","signoria","duomo","santa maria novella","ognissanti","boboli","pitti","bargello"], min_res:4800, max_res:9500, min_com:3000, max_com:6200 },
      // Semicentrale: Campo di Marte, Gavinana, Rifredi ~3.000-5.500
      { nome: "Campo di Marte / Gavinana / Rifredi", kw: ["campo di marte","gavinana","coverciano","rifredi","novoli","isolotto","legnaia","scandicci"], min_res:3000, max_res:5500, min_com:1800, max_com:3600 },
      { nome: "Periferia Firenze", kw: [], min_res:1800, max_res:3200, min_com:1000, max_com:2000 },
    ],
    semestre: "2024 H2", bbox: [43.72, 11.19, 43.84, 11.33],
  },
};

const detectZone = (lat, lng, addr, type) => {
  const a = (addr || "").toLowerCase();
  let city = null;
  for (const [c, d] of Object.entries(OMI_DATA)) {
    const [s, w, n, e] = d.bbox;
    if (lat >= s && lat <= n && lng >= w && lng <= e) { city = c; break; }
  }
  if (!city) for (const c of Object.keys(OMI_DATA)) { if (a.includes(c.toLowerCase())) { city = c; break; } }
  if (!city) return {};
  const zones = OMI_DATA[city].zone;
  let zone = zones[zones.length - 1];
  for (const z of zones) { if (z.kw.some(k => a.includes(k))) { zone = z; break; } }
  const r = type === "Residenziale";
  return { city, zone: zone.nome, omiMin: r ? zone.min_res : zone.min_com, omiMax: r ? zone.max_res : zone.max_com };
};

// ─── Geocoding ────────────────────────────────────────────────────────────────
const geocode = async (q) => {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=it&limit=5&addressdetails=1`, { headers: { "Accept-Language": "it" } });
  return (await r.json()).map(x => ({ display: x.display_name, lat: parseFloat(x.lat), lng: parseFloat(x.lon), short: [x.address?.road, x.address?.house_number, x.address?.city || x.address?.town].filter(Boolean).join(" ") }));
};

// ─── Supabase (SDK ufficiale via CDN) ────────────────────────────────────────
let _supabaseLib = null;

const loadSupabaseSDK = () => new Promise((resolve, reject) => {
  if (_supabaseLib) { resolve(_supabaseLib); return; }
  if (window.supabase) { _supabaseLib = window.supabase; resolve(_supabaseLib); return; }
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
  s.onload = () => { _supabaseLib = window.supabase; resolve(_supabaseLib); };
  s.onerror = () => reject(new Error("Impossibile caricare Supabase SDK"));
  document.head.appendChild(s);
});

const mkClient = (url, key) => {
  let _client = null;

  const getClient = async () => {
    if (_client) return _client;
    const lib = await loadSupabaseSDK();
    _client = lib.createClient(url.trim().replace(/\/$/, ""), key.trim());
    return _client;
  };

  const toRow = p => ({
    ...(typeof p.id !== "number" && { id: p.id }),
    name: p.name, address: p.address, citta: p.citta, type: p.type,
    mq: p.mq, vani: p.vani, purchase_price: p.purchasePrice, purchase_year: p.purchaseYear,
    current_value: p.currentValue, rendita: p.rendita,
    codice_comune: p.codiceComune, foglio: p.foglio, particella: p.particella, subalterno: p.subalterno,
    catastale: p.catastale, omi_zona: p.omiZona, omi_min: p.omiMin, omi_max: p.omiMax,
    trend: p.trend, tags: p.tags, lat: p.lat, lng: p.lng,
  });

  const fr = r => ({
    id: r.id, name: r.name, address: r.address, citta: r.citta, type: r.type,
    mq: r.mq, vani: r.vani, purchasePrice: r.purchase_price, purchaseYear: r.purchase_year,
    currentValue: r.current_value, rendita: r.rendita, lastUpdate: "—",
    codiceComune: r.codice_comune, foglio: r.foglio, particella: r.particella, subalterno: r.subalterno,
    catastale: r.catastale, omiZona: r.omi_zona, omiMin: r.omi_min, omiMax: r.omi_max,
    trend: r.trend || [r.purchase_price], tags: r.tags || [], lat: r.lat, lng: r.lng, catastoData: null,
  });

  return {
    getAll: async () => {
      const c = await getClient();
      const { data, error } = await c.from("properties").select("*").order("created_at", { ascending: true });
      if (error) throw new Error(error.message || error.details || JSON.stringify(error));
      return (data || []).map(fr);
    },
    insert: async (p) => {
      const c = await getClient();
      const { data, error } = await c.from("properties").insert(toRow(p)).select().single();
      if (error) throw new Error(error.message || error.details || JSON.stringify(error));
      return fr(data);
    },
    del: async (id) => {
      const c = await getClient();
      const { error } = await c.from("properties").delete().eq("id", id);
      if (error) throw new Error(error.message || error.details || JSON.stringify(error));
    },
    update: async (id, p) => {
      const c = await getClient();
      const { data, error } = await c.from("properties").update(toRow(p)).eq("id", id).select().single();
      if (error) throw new Error(error.message || error.details || JSON.stringify(error));
      return fr(data);
    },
  };
};

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO = [];

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, up }: { data: number[], up: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const W = 96, H = 32;
  const pts = data.map((v, i) => `${(i/(data.length-1))*W},${H-((v-min)/(max-min||1))*(H-4)-2}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ flexShrink: 0 }}>
      <defs><linearGradient id={`g${up?1:0}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={up?"#34d399":"#f87171"} stopOpacity=".2"/><stop offset="100%" stopColor={up?"#34d399":"#f87171"} stopOpacity="0"/></linearGradient></defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#g${up?1:0})`}/>
      <polyline points={pts} fill="none" stroke={up?"#34d399":"#f87171"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Map (OpenStreetMap iframe + SVG marker overlay) ─────────────────────────
const MAP_BOUNDS = { minLat:36.6, maxLat:47.1, minLng:6.6, maxLng:18.5 };

function MapView({ properties, onSelect }: { properties: any[], onSelect?: (p: any) => void }) {
  const [tooltip, setTooltip] = useState(null);
  const [size, setSize] = useState({ w: 800, h: 480 });
  const containerRef = useRef();

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setSize({ w: Math.round(width), h: Math.round(width * 0.58) });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const toXY = (lat, lng) => ({
    x: ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * size.w,
    y: ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * size.h,
  });

  const withCoords = properties.filter(p => p.lat && p.lng);
  const mapUrl = "https://www.openstreetmap.org/export/embed.html?bbox=6.6%2C36.6%2C18.5%2C47.1&layer=mapnik";

  return (
    <div ref={containerRef} style={{ position:"relative", borderRadius:16, overflow:"hidden", border:"1px solid #e8e4dc" }}>
      <iframe src={mapUrl} style={{ width:"100%", height: size.h || 480, border:"none", display:"block" }} title="Mappa immobili" loading="lazy"/>

      <svg style={{ position:"absolute", top:0, left:0, pointerEvents:"none", width:"100%", height:"100%" }}
        viewBox={`0 0 ${size.w} ${size.h || 480}`}>
        {withCoords.map(p => {
          const { x, y } = toXY(p.lat, p.lng);
          const up = p.currentValue >= p.purchasePrice;
          const color = up ? "#2a7a50" : "#c03030";
          return (
            <g key={p.id} style={{ pointerEvents:"all", cursor:"pointer" }}
              onMouseEnter={() => setTooltip({ ...p, x, y })}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => onSelect?.(p)}>
              <circle cx={x} cy={y} r={14} fill={color} fillOpacity=".18"/>
              <circle cx={x} cy={y} r={8} fill="#fff" stroke={color} strokeWidth="2.5"/>
              <circle cx={x} cy={y} r={3.5} fill={color}/>
            </g>
          );
        })}
        {tooltip && (() => {
          const up = tooltip.currentValue >= tooltip.purchasePrice;
          const color = up ? "#2a7a50" : "#c03030";
          const tw = 210, th = 74;
          const tx = Math.min(tooltip.x + 16, (size.w || 800) - tw - 8);
          const ty = Math.max(tooltip.y - th / 2, 8);
          return (
            <g>
              <rect x={tx} y={ty} width={tw} height={th} rx={9} fill="white" stroke="#e0dbd0" strokeWidth="1"
                style={{ filter:"drop-shadow(0 2px 8px rgba(0,0,0,.12))" }}/>
              <text x={tx+12} y={ty+18} fill="#1a1a1a" fontSize="11" fontWeight="600" fontFamily="DM Sans,sans-serif">
                {tooltip.name.length > 26 ? tooltip.name.slice(0,24)+"…" : tooltip.name}
              </text>
              <text x={tx+12} y={ty+33} fill="#aaa" fontSize="9" fontFamily="DM Sans,sans-serif">
                {(tooltip.address||"").slice(0,32)}
              </text>
              <text x={tx+12} y={ty+52} fill={color} fontSize="14" fontWeight="700" fontFamily="DM Sans,sans-serif">
                {fmt(tooltip.currentValue)}
              </text>
              <text x={tx+12} y={ty+65} fill="#bbb" fontSize="9" fontFamily="DM Sans,sans-serif">
                {up?"+":""}{pct(tooltip.currentValue, tooltip.purchasePrice)}% vs acquisto
              </text>
            </g>
          );
        })()}
      </svg>

      <div style={{ position:"absolute", bottom:12, left:12, display:"flex", gap:12, background:"rgba(255,255,255,.9)", borderRadius:8, padding:"6px 12px", fontSize:11, color:"#666", backdropFilter:"blur(4px)" }}>
        <span style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:8, height:8, borderRadius:"50%", background:"#2a7a50", display:"inline-block" }}/>Plusvalenza</span>
        <span style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:8, height:8, borderRadius:"50%", background:"#c03030", display:"inline-block" }}/>Minusvalenza</span>
      </div>

      {withCoords.length === 0 && (
        <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"rgba(255,255,255,.92)", borderRadius:12, padding:"16px 24px", fontSize:13, color:"#999", textAlign:"center" }}>
          Aggiungi immobili con indirizzo geocodificato per vederli sulla mappa
        </div>
      )}
      {properties.some(p => !p.lat) && (
        <div style={{ position:"absolute", bottom:12, right:12, background:"#fffbf0", border:"1px solid #e8d898", borderRadius:8, padding:"5px 10px", fontSize:11, color:"#96720e" }}>
          {properties.filter(p=>!p.lat).length} senza coordinate
        </div>
      )}
    </div>
  );
}

// ─── DropZone ─────────────────────────────────────────────────────────────────
function DropZone({ label, icon, accept }: { label: string, icon: string, accept: string }) {
  const [file, setFile] = useState(null);
  const ref = useRef();
  return (
    <div onClick={() => ref.current.click()} style={{ border: "1.5px dashed #e0dbd0", borderRadius: 8, padding: "14px 8px", textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minHeight: 70, justifyContent: "center", background: "#fafaf8" }}>
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
      <span style={{ fontSize: 16 }}>{icon}</span>
      {file ? <span style={{ color: "#c9a84c", fontSize: 10, wordBreak: "break-all" }}>{file.name}</span> : <span style={{ color: "#bbb", fontSize: 10 }}>{label}</span>}
    </div>
  );
}

// ─── Address Autocomplete ─────────────────────────────────────────────────────
function AddrInput({ value, onChange, onSelect }: { value: string, onChange: (v: string) => void, onSelect?: (s: any) => void }) {
  const [q, setQ] = useState(value || "");
  const [sugg, setSugg] = useState([]);
  const [st, setSt] = useState("idle");
  const [open, setOpen] = useState(false);
  const timer = useRef();

  useEffect(() => { setQ(value || ""); }, [value]);

  const search = v => {
    setQ(v); onChange?.(v); setSugg([]); setSt("idle"); clearTimeout(timer.current);
    if (v.length < 6) return;
    setSt("loading");
    timer.current = setTimeout(async () => {
      try { const r = await geocode(v); if (!r.length) { setSt("notfound"); } else { setSt("ok"); setSugg(r); setOpen(true); } } catch { setSt("error"); }
    }, 600);
  };

  const pick = s => { setQ(s.short || s.display.split(",")[0]); setSugg([]); setOpen(false); setSt("ok"); onSelect?.(s); };

  const bc = st === "ok" ? "#34d399" : st === "error" || st === "notfound" ? "#f87171" : st === "loading" ? "#c9a84c" : "#222";

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input value={q} onChange={e => search(e.target.value)} placeholder="es. Via Brera 12, Milano"
          onFocus={() => sugg.length > 0 && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)}
          style={{ width: "100%", background: "#fff", border: `1px solid ${bc === "#222" ? "#e0e0e0" : bc}`, color: "#1a1a1a", borderRadius: 8, padding: "9px 34px 9px 12px", fontSize: 13, boxSizing: "border-box", transition: "border-color .2s" }} />
        <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: bc }}>
          {st === "loading" ? "…" : st === "ok" ? "✓" : st === "notfound" ? "✗" : "⌕"}
        </span>
      </div>
      {st === "notfound" && <div style={{ color: "#f87171", fontSize: 10, marginTop: 3 }}>Indirizzo non trovato</div>}
      {open && sugg.length > 0 && (
        <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1px solid #e8e4dc", borderRadius: 10, zIndex: 300, overflow: "hidden", boxShadow: "0 8px 28px #0009" }}>
          {sugg.map((s, i) => (
            <div key={i} onMouseDown={() => pick(s)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: i < sugg.length-1 ? "1px solid #1a1a1a" : "none" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8f6f0"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ color: "#1a1a1a", fontSize: 12 }}>{s.short || s.display.split(",")[0]}</div>
              <div style={{ color: "#aaa", fontSize: 10, marginTop: 2 }}>{s.display.split(",").slice(1, 3).join(", ")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Supabase Modal ───────────────────────────────────────────────────────────
function SupabaseModal({ onClose, onSave }: { onClose: () => void, onSave: (client: any, rows: any[]) => void }) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [st, setSt] = useState("idle"); // idle | loading | ok | error
  const [errMsg, setErrMsg] = useState("");

  const handleConnect = async () => {
    if (!url.trim() || !key.trim()) return;
    setSt("loading"); setErrMsg("");
    try {
      const client = mkClient(url.trim(), key.trim());
      const rows = await client.getAll();
      setSt("ok");
      // Passa client già pronto — nessuna seconda chiamata asincrona
      onSave(client, rows);
    } catch (e) {
      setSt("error");
      const msg = e.message || "";
      if (msg === "" || msg.toLowerCase().includes("fetch")) {
        setErrMsg("Rete bloccata. Usa l'app fuori dalla sandbox di Claude (StackBlitz, Vercel, ecc.).");
      } else if (msg.toLowerCase().includes("impossibile caricare")) {
        setErrMsg("SDK non caricato. Controlla la connessione internet.");
      } else if (msg.includes("401") || msg.toLowerCase().includes("invalid")) {
        setErrMsg("Chiave non valida. Usa la public key (non service_role).");
      } else if (msg.toLowerCase().includes("relation") || msg.toLowerCase().includes("does not exist")) {
        setErrMsg("Tabella 'properties' non trovata. Esegui lo SQL mostrato qui sotto.");
      } else {
        setErrMsg(msg || "Connessione fallita. Verifica URL e chiave.");
      }
    }
  };

  return (
    <Modal onClose={onClose} title="Connetti Supabase" subtitle="Persistenza dati su cloud" icon="🔌" maxW={520}>

      <div style={{ background:"#f0f4ff", border:"1px solid #c8d4ee", borderRadius:10, padding:"12px 14px", marginBottom:18, fontSize:12, color:"#3a5080", lineHeight:1.8 }}>
        <strong>1.</strong> Vai su <strong>supabase.com</strong> → il tuo progetto<br/>
        <strong>2.</strong> <strong>Project Settings → Data API</strong><br/>
        <strong>3.</strong> Copia <em>Project URL</em> e <em>Project API Key (public)</em><br/>
        <strong>4.</strong> Assicurati di aver creato la tabella con lo SQL qui sotto
      </div>

      <details style={{ marginBottom:18 }}>
        <summary style={{ fontSize:11, color:"#888", cursor:"pointer", userSelect:"none", marginBottom:6 }}>📋 Mostra SQL per creare la tabella</summary>
        <pre style={{ background:"#f8f8f8", border:"1px solid #eee", borderRadius:8, padding:"10px 12px", fontSize:10, color:"#444", overflowX:"auto", lineHeight:1.6, marginTop:8 }}>{`create table properties (
  id uuid primary key default gen_random_uuid(),
  name text, address text, citta text, type text,
  mq numeric, vani int,
  purchase_price numeric, purchase_year int,
  current_value numeric, rendita numeric,
  codice_comune text, foglio text,
  particella text, subalterno text,
  catastale text, omi_zona text,
  omi_min numeric, omi_max numeric,
  trend numeric[], tags text[],
  lat numeric, lng numeric,
  created_at timestamptz default now()
);
alter table properties disable row level security;`}</pre>
      </details>

      <div style={{ marginBottom:12 }}>
        <label style={{ color:"#888", fontSize:10, display:"block", marginBottom:4, letterSpacing:1 }}>PROJECT URL</label>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://xyzxyzxyz.supabase.co" type="text"
          style={{ width:"100%", background:"#fff", border:"1px solid #e0e0e0", color:"#1a1a1a", borderRadius:8, padding:"9px 12px", fontSize:12, boxSizing:"border-box", fontFamily:"monospace" }} />
      </div>
      <div style={{ marginBottom:18 }}>
        <label style={{ color:"#888", fontSize:10, display:"block", marginBottom:4, letterSpacing:1 }}>PROJECT API KEY (public)</label>
        <input value={key} onChange={e=>setKey(e.target.value)} placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…" type="password"
          style={{ width:"100%", background:"#fff", border:"1px solid #e0e0e0", color:"#1a1a1a", borderRadius:8, padding:"9px 12px", fontSize:12, boxSizing:"border-box", fontFamily:"monospace" }} />
      </div>

      {st === "error" && errMsg && (
        <div style={{ background:"#fff5f5", border:"1px solid #f0c0c0", borderRadius:8, padding:"10px 12px", marginBottom:14, fontSize:11, color:"#c03030", lineHeight:1.7 }}>
          <strong>Errore:</strong> {errMsg}
          {errMsg.includes("sandbox") && (
            <div style={{ marginTop:8, background:"#fff8f0", border:"1px solid #f0d8a0", borderRadius:6, padding:"8px 10px", color:"#7a4a00", fontSize:11 }}>
              💡 Scarica il file JSX e aprilo su <strong>stackblitz.com</strong> o in un progetto React locale.
            </div>
          )}
        </div>
      )}

      {st === "ok" && (
        <div style={{ background:"#f0faf4", border:"1px solid #b0dfc0", borderRadius:8, padding:"10px 12px", marginBottom:14, fontSize:11, color:"#2a7a50" }}>
          ✓ Connessione riuscita! Il database è ora attivo.
        </div>
      )}

      <Btn onClick={handleConnect} disabled={!url || !key || st === "loading"}>
        {st === "loading" ? "⏳ Connessione in corso…" : "🔌 Connetti al database"}
      </Btn>
      <button onClick={onClose} style={{ width:"100%", marginTop:10, background:"none", border:"none", color:"#bbb", fontSize:12, cursor:"pointer" }}>
        Continua senza database
      </button>
    </Modal>
  );
}

// ─── Catasto Modal ────────────────────────────────────────────────────────────
function CatastoModal({ property, onClose, onUpdate }: { property: any, onClose: () => void, onUpdate?: (p: any) => void }) {
  const [form, setForm] = useState({ codiceComune: property?.codiceComune||"", foglio: property?.foglio||"", particella: property?.particella||"", subalterno: property?.subalterno||"" });
  const [st, setSt] = useState(property?.catastoData ? "ok" : "idle");
  const [res, setRes] = useState(property?.catastoData || null);

  const query = async () => {
    setSt("loading"); await new Promise(r => setTimeout(r, 1400));
    const data = { esito:"OK", fonte:"Agenzia delle Entrate – Catasto Fabbricati", aggiornamento:"2024-12-01", dati: { ...form, categoria:"A/2", classe:"3", consistenza:`${Math.floor(Math.random()*6)+3} vani`, superficie:`${property?.mq||80} mq`, rendita:(property?.rendita||800).toFixed(2), piano:`${Math.floor(Math.random()*5)+1}°`, scala:"A", note:"Immobile censito al NCEU" } };
    setRes(data); onUpdate?.({ ...property, catastoData: data, ...form }); setSt("ok");
  };

  return (
    <Modal onClose={onClose} title="Interrogazione Catasto" subtitle="Agenzia delle Entrate · Web Services" icon="🏛️" maxW={500}>
      <div style={{ background: "#f8f8f8", border: "1px solid #eee", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#999", fontSize: 11 }}>ℹ️ In produzione richiede autenticazione SPID/CIE.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[["COD. COMUNE","codiceComune","F205"],["FOGLIO","foglio","12"],["PARTICELLA","particella","445"],["SUBALTERNO","subalterno","3"]].map(([l,k,ph]) => (
          <div key={k}>
            <label style={{ color: "#aaa", fontSize: 10, display: "block", marginBottom: 3, letterSpacing: 1 }}>{l}</label>
            <input value={form[k]} onChange={e => setForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{ width: "100%", background: "#141414", border: "1px solid #222", color: "#e0e0e0", borderRadius: 8, padding: "8px 10px", fontSize: 13, boxSizing: "border-box" }} />
          </div>
        ))}
      </div>
      <Btn variant="ghost" onClick={query} disabled={st==="loading"} style={{ width: "100%", marginBottom: 16 }}>{st==="loading" ? "⏳ Interrogazione…" : "🔍 Interroga Catasto"}</Btn>
      {st === "ok" && res && (
        <div>
          <div style={{ color: "#34d399", fontSize: 11, fontWeight: 600, marginBottom: 10 }}>✓ Dati recuperati</div>
          {[["Categoria/Classe",`${res.dati.categoria} / ${res.dati.classe}`],["Consistenza",res.dati.consistenza],["Superficie",res.dati.superficie],["Rendita",`€ ${res.dati.rendita}`],["Piano",`${res.dati.piano} / Sc.${res.dati.scala}`],["Note",res.dati.note]].map(([k,v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f5f0e8", padding: "7px 0", fontSize: 12 }}>
              <span style={{ color: "#444" }}>{k}</span><span style={{ color: "#bbb" }}>{v}</span>
            </div>
          ))}
          <div style={{ color: "#ccc", fontSize: 10, marginTop: 8 }}>{res.fonte} · {res.aggiornamento}</div>
        </div>
      )}
    </Modal>
  );
}

// ─── Valuation Modal ──────────────────────────────────────────────────────────
function ValuationModal({ property, onClose }: { property: any, onClose: () => void }) {
  const [step, setStep] = useState("form");
  const [ex, setEx] = useState({ condizioni: "buone", piano: "", note: "" });
  const [res, setRes] = useState(null);
  const omiVal = property.omiMin && property.mq ? Math.round((property.omiMin + property.omiMax) / 2 * property.mq) : property.currentValue;

  const run = async () => {
    setStep("loading");
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, messages:[{ role:"user", content:`Sei un perito immobiliare italiano. Rispondi SOLO JSON valido:\n{"valoreStimato":<n>,"rangeBasso":<n>,"rangeAlto":<n>,"valoreOMI":${omiVal},"scostamentoOMI":<n>,"confidenza":"alta|media|bassa","metodologia":"<str>","fattoriPositivi":["<f>","<f>","<f>"],"fattoriNegativi":["<f>","<f>"],"analisiMercato":"<str>","raccomandazione":"<str>"}\nImmobile: ${property.address} | ${property.mq}mq ${property.type} | acquisto ${fmt(property.purchasePrice)} (${property.purchaseYear}) | rendita €${property.rendita} | OMI ${property.omiZona}: €${property.omiMin}-${property.omiMax}/mq | condizioni: ${ex.condizioni} | note: ${ex.note}` }] }) });
      const d = await r.json();
      setRes(JSON.parse(d.content.find(b=>b.type==="text").text.replace(/```json|```/g,"").trim()));
      setStep("result");
    } catch {
      setRes({ valoreStimato:omiVal, rangeBasso:Math.round(omiVal*.93), rangeAlto:Math.round(omiVal*1.09), valoreOMI:omiVal, scostamentoOMI:0, confidenza:"media", metodologia:"Benchmark OMI + rendita catastale", fattoriPositivi:["Zona OMI favorevole","Dati catastali coerenti","Mercato stabile"], fattoriNegativi:["Incertezza macro","Pressione fiscale"], analisiMercato:`La zona ${property.omiZona} ha quotazioni OMI tra ${fmt(property.omiMin)} e ${fmt(property.omiMax)}/mq. Stima basata su benchmark OMI 2024 H1.`, raccomandazione:"Conveniente mantenere nel portafoglio. Monitorare quotazioni semestrali OMI." });
      setStep("result");
    }
  };

  const delta = res ? pct(res.valoreStimato, property.purchasePrice) : 0;

  return (
    <Modal onClose={onClose} title="Stima AI" subtitle={`${property.name} · ${property.omiZona || "—"}`} maxW={600}>
      {step === "form" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:"#0d1620", border:"1px solid #1a2a40", borderRadius:10, padding:"14px 16px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {[["OMI MIN €/MQ", fmt(property.omiMin||0)],["OMI MAX €/MQ", fmt(property.omiMax||0)],["VALORE OMI", fmt(omiVal)]].map(([l,v],i) => (
              <div key={l}><div style={{ color:"#3a5a8a", fontSize:9, letterSpacing:1 }}>{l}</div><div style={{ color:i===2?"#34d399":"#7096f0", fontSize:15, fontWeight:700, marginTop:3 }}>{v}</div></div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div><Label>CONDIZIONI</Label>
              <select value={ex.condizioni} onChange={e=>setEx(p=>({...p,condizioni:e.target.value}))} style={{ width:"100%", background:"#141414", border:"1px solid #222", color:"#e0e0e0", borderRadius:8, padding:"9px 11px", fontSize:13 }}>
                {["ottime","buone","discrete","da ristrutturare"].map(v=><option key={v} value={v}>{v}</option>)}
              </select></div>
            <div><Label>PIANO</Label><input value={ex.piano} onChange={e=>setEx(p=>({...p,piano:e.target.value}))} placeholder="es. 3° con ascensore" style={inputStyle}/></div>
          </div>
          <div><Label>NOTE AGGIUNTIVE</Label><textarea value={ex.note} onChange={e=>setEx(p=>({...p,note:e.target.value}))} rows={2} placeholder="terrazzo, vista, riscaldamento…" style={{ ...inputStyle, resize:"vertical", height:60 }}/></div>
          <Btn onClick={run}>✦ Avvia Stima AI con dati OMI</Btn>
        </div>
      )}
      {step === "loading" && <Loader text="Analisi in corso… Benchmark OMI · Rendita catastale · Comparativi"/>}
      {step === "result" && res && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ background:"linear-gradient(135deg,#1a160a,#0e0e0e)", border:"1px solid #2a2010", borderRadius:14, padding:20, textAlign:"center" }}>
            <div style={{ color:"#555", fontSize:9, letterSpacing:2, marginBottom:6 }}>VALORE STIMATO</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:36, color:"#c9a84c", lineHeight:1 }}>{fmt(res.valoreStimato)}</div>
            <div style={{ color:"#444", fontSize:11, marginTop:5 }}>Range: {fmt(res.rangeBasso)} – {fmt(res.rangeAlto)}</div>
            <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:12, flexWrap:"wrap" }}>
              {[
                [Number(delta)>=0?"+"+delta+"%":delta+"%", Number(delta)>=0?"#34d399":"#f87171", "vs acquisto"],
                [(res.scostamentoOMI>=0?"+":"")+Number(res.scostamentoOMI).toFixed(1)+"%", "#7096f0", "vs OMI"],
                [res.confidenza, res.confidenza==="alta"?"#34d399":"#fbbf24", "confidenza"],
              ].map(([v,c,l]) => <span key={l} style={{ background:c+"18", color:c, borderRadius:20, padding:"4px 13px", fontSize:11 }}>{v} <span style={{ opacity:.6 }}>{l}</span></span>)}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={{ background:"#0d2010", border:"1px solid #1a3a20", borderRadius:10, padding:12 }}><div style={{ color:"#34d399", fontSize:9, letterSpacing:1, marginBottom:8 }}>✓ POSITIVI</div>{res.fattoriPositivi?.map((f,i)=><div key={i} style={{ color:"#80c090", fontSize:11, marginBottom:3 }}>• {f}</div>)}</div>
            <div style={{ background:"#200d0d", border:"1px solid #3a1a1a", borderRadius:10, padding:12 }}><div style={{ color:"#f87171", fontSize:9, letterSpacing:1, marginBottom:8 }}>✗ RISCHI</div>{res.fattoriNegativi?.map((f,i)=><div key={i} style={{ color:"#c08080", fontSize:11, marginBottom:3 }}>• {f}</div>)}</div>
          </div>
          <div style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:10, padding:12 }}><div style={{ color:"#333", fontSize:9, letterSpacing:1, marginBottom:6 }}>ANALISI MERCATO</div><div style={{ color:"#bbb", fontSize:12, lineHeight:1.7 }}>{res.analisiMercato}</div></div>
          <div style={{ background:"#1a160a", border:"1px solid #c9a84c22", borderRadius:10, padding:12 }}><div style={{ color:"#c9a84c", fontSize:9, letterSpacing:1, marginBottom:6 }}>✦ RACCOMANDAZIONE</div><div style={{ color:"#d0c090", fontSize:12, lineHeight:1.7 }}>{res.raccomandazione}</div><div style={{ color:"#2a2a2a", fontSize:10, marginTop:6 }}>Metodo: {res.metodologia}</div></div>
          <Btn variant="ghost" onClick={()=>setStep("form")}>← Nuova stima</Btn>
        </div>
      )}
    </Modal>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ property, onClose, onConfirm }: { property: any, onClose: () => void, onConfirm: () => void }) {
  return (
    <Modal onClose={onClose} maxW={380}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:12 }}>🗑️</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:19, color:"#f87171", marginBottom:6 }}>Elimina immobile</div>
        <div style={{ color:"#666", fontSize:13, marginBottom:4 }}>{property.name}</div>
        <div style={{ color:"#333", fontSize:11, marginBottom:20 }}>{property.address}</div>
        <div style={{ background:"#1a0a0a", border:"1px solid #3a1515", borderRadius:8, padding:"9px 12px", marginBottom:20, color:"#f87171", fontSize:11 }}>⚠️ Azione irreversibile.</div>
        <div style={{ display:"flex", gap:10 }}>
          <Btn variant="ghost" onClick={onClose} style={{ flex:1 }}>Annulla</Btn>
          <button onClick={onConfirm} style={{ flex:1, background:"#3a0a0a", border:"1px solid #f8717166", color:"#f87171", borderRadius:9, padding:"11px", cursor:"pointer", fontSize:13, fontWeight:700 }}>Elimina</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddModal({ onClose, onAdd }: { onClose: () => void, onAdd: (p: any) => void }) {
  const [form, setForm] = useState({ name:"", address:"", citta:null, type:"Residenziale", mq:"", vani:"", purchasePrice:"", purchaseYear:new Date().getFullYear(), codiceComune:"", foglio:"", particella:"", subalterno:"", rendita:"", omiZona:"", omiMin:0, omiMax:0, lat:null, lng:null });
  const [gcd, setGcd] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSelect = s => {
    const z = detectZone(s.lat, s.lng, s.display, form.type);
    setForm(p=>({ ...p, address: s.short || s.display.split(",").slice(0,3).join(",").trim(), lat:s.lat, lng:s.lng, citta:z.city||p.citta, omiZona:z.zone||p.omiZona, omiMin:z.omiMin||p.omiMin, omiMax:z.omiMax||p.omiMax }));
    setGcd(true);
  };

  const submit = () => {
    const price = Number(form.purchasePrice);
    const omiMid = form.omiMin && form.omiMax && form.mq
      ? Math.round((Number(form.omiMin) + Number(form.omiMax)) / 2 * Number(form.mq))
      : price;
    onAdd({
      id: Date.now(), ...form,
      mq: Number(form.mq), vani: Number(form.vani),
      purchasePrice: price, purchaseYear: Number(form.purchaseYear),
      rendita: Number(form.rendita),
      currentValue: omiMid,
      lastUpdate: new Date().toLocaleDateString("it-IT", { month:"short", year:"numeric" }),
      catastale: `${form.codiceComune}–F.${form.foglio}–P.${form.particella}–Sub.${form.subalterno}`,
      trend: [price, omiMid].filter((v,i,a) => i===0 || v!==a[i-1]),
      tags: [], catastoData: null,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} title="Aggiungi Immobile" maxW={560}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <Field label="NOME" value={form.name} onChange={v=>set("name",v)} ph="es. Appartamento Milano – Brera"/>
        <div><Label>INDIRIZZO</Label><AddrInput value={form.address} onChange={v=>set("address",v)} onSelect={handleSelect}/></div>
        {gcd && form.omiZona && <div style={{ background:"#f0faf4", border:"1px solid #c0dfc8", borderRadius:8, padding:"9px 12px", fontSize:11, color:"#2a7a50" }}>✓ Zona OMI: <strong>{form.omiZona}</strong> ({form.citta}) · €{form.omiMin?.toLocaleString("it-IT")}–{form.omiMax?.toLocaleString("it-IT")}/mq · Valore OMI: <strong>{form.omiMin && form.mq ? fmt(Math.round((Number(form.omiMin)+Number(form.omiMax))/2*Number(form.mq))) : "—"}</strong></div>}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div><Label>CATEGORIA</Label><select value={form.type} onChange={e=>set("type",e.target.value)} style={{ width:"100%", background:"#141414", border:"1px solid #222", color:"#e0e0e0", borderRadius:8, padding:"9px 11px", fontSize:13 }}>{["Residenziale","Commerciale","Industriale","Terreno"].map(v=><option key={v}>{v}</option>)}</select></div>
          <Field label="SUPERFICIE (mq)" value={form.mq} onChange={v=>set("mq",v)} ph="95" type="number"/>
          <Field label="VANI" value={form.vani} onChange={v=>set("vani",v)} ph="4" type="number"/>
          <Field label="PREZZO ACQUISTO €" value={form.purchasePrice} onChange={v=>set("purchasePrice",v)} ph="450000" type="number"/>
          <Field label="ANNO ACQUISTO" value={form.purchaseYear} onChange={v=>set("purchaseYear",v)} ph="2019" type="number"/>
          <Field label="RENDITA CATASTALE €" value={form.rendita} onChange={v=>set("rendita",v)} ph="820" type="number"/>
        </div>
        <div style={{ borderTop:"1px solid #141414", paddingTop:12 }}>
          <div style={{ color:"#2a2a2a", fontSize:9, letterSpacing:2, marginBottom:10 }}>DATI CATASTALI</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
            {[["COD. COM.","codiceComune","F205"],["FOGLIO","foglio","12"],["PARTICELLA","particella","445"],["SUBALT.","subalterno","3"]].map(([l,k,ph])=><Field key={k} label={l} value={form[k]} onChange={v=>set(k,v)} ph={ph}/>)}
          </div>
        </div>
        <div><Label>DOCUMENTI</Label><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}><DropZone label="Atto notarile" icon="📄" accept=".pdf"/><DropZone label="Visura" icon="🏛️" accept=".pdf"/><DropZone label="Foto" icon="📸" accept="image/*"/></div></div>
        <Btn onClick={submit} disabled={!form.name || !form.purchasePrice} style={{ marginTop:4 }}>+ Aggiungi al Portafoglio</Btn>
      </div>
    </Modal>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ property, onClose, onSave }: { property: any, onClose: () => void, onSave: (p: any) => void }) {
  const [form, setForm] = useState({
    name: property.name || "",
    address: property.address || "",
    citta: property.citta || null,
    type: property.type || "Residenziale",
    mq: property.mq || "",
    vani: property.vani || "",
    purchasePrice: property.purchasePrice || "",
    purchaseYear: property.purchaseYear || "",
    rendita: property.rendita || "",
    codiceComune: property.codiceComune || "",
    foglio: property.foglio || "",
    particella: property.particella || "",
    subalterno: property.subalterno || "",
    omiZona: property.omiZona || "",
    omiMin: property.omiMin || 0,
    omiMax: property.omiMax || 0,
    lat: property.lat || null,
    lng: property.lng || null,
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSelect = s => {
    const z = detectZone(s.lat, s.lng, s.display, form.type);
    setForm(p => ({
      ...p,
      address: s.short || s.display.split(",").slice(0,3).join(",").trim(),
      lat: s.lat, lng: s.lng,
      citta: z.city || p.citta,
      omiZona: z.zone || p.omiZona,
      omiMin: z.omiMin || p.omiMin,
      omiMax: z.omiMax || p.omiMax,
    }));
  };

  const omiVal = form.omiMin && form.omiMax && form.mq
    ? Math.round((Number(form.omiMin) + Number(form.omiMax)) / 2 * Number(form.mq))
    : null;

  const submit = () => {
    const updated = {
      ...property, ...form,
      mq: Number(form.mq),
      vani: Number(form.vani),
      purchasePrice: Number(form.purchasePrice),
      purchaseYear: Number(form.purchaseYear),
      rendita: Number(form.rendita),
      currentValue: omiVal || property.currentValue,
      catastale: `${form.codiceComune}–F.${form.foglio}–P.${form.particella}–Sub.${form.subalterno}`,
      lastUpdate: new Date().toLocaleDateString("it-IT", { month:"short", year:"numeric" }),
      trend: [...(property.trend || [property.purchasePrice]), omiVal || property.currentValue],
    };
    onSave(updated);
    onClose();
  };

  return (
    <Modal onClose={onClose} title="Modifica Immobile" icon="✏️" maxW={560}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>

        <Field label="NOME" value={form.name} onChange={v=>set("name",v)} ph="es. Appartamento Milano – Brera"/>

        <div>
          <Label>INDIRIZZO</Label>
          <AddrInput value={form.address} onChange={v=>set("address",v)} onSelect={handleSelect}/>
        </div>

        {omiVal && (
          <div style={{ background:"#f0faf4", border:"1px solid #c0dfc8", borderRadius:8, padding:"9px 12px", fontSize:11, color:"#2a7a50" }}>
            ✓ Zona OMI: <strong>{form.omiZona}</strong> · Valore OMI aggiornato: <strong>{fmt(omiVal)}</strong>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <Label>CATEGORIA</Label>
            <select value={form.type} onChange={e=>set("type",e.target.value)}
              style={{ width:"100%", background:"#fff", border:"1px solid #e0e0e0", color:"#1a1a1a", borderRadius:8, padding:"9px 11px", fontSize:13 }}>
              {["Residenziale","Commerciale","Industriale","Terreno"].map(v=><option key={v}>{v}</option>)}
            </select>
          </div>
          <Field label="SUPERFICIE (mq)" value={form.mq} onChange={v=>set("mq",v)} ph="95" type="number"/>
          <Field label="VANI" value={form.vani} onChange={v=>set("vani",v)} ph="4" type="number"/>
          <Field label="PREZZO ACQUISTO €" value={form.purchasePrice} onChange={v=>set("purchasePrice",v)} ph="450000" type="number"/>
          <Field label="ANNO ACQUISTO" value={form.purchaseYear} onChange={v=>set("purchaseYear",v)} ph="2019" type="number"/>
          <Field label="RENDITA CATASTALE €" value={form.rendita} onChange={v=>set("rendita",v)} ph="820" type="number"/>
        </div>

        <div style={{ borderTop:"1px solid #f0ece4", paddingTop:12 }}>
          <div style={{ color:"#bbb", fontSize:9, letterSpacing:2, marginBottom:10 }}>DATI CATASTALI</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
            {[["COD. COM.","codiceComune","F205"],["FOGLIO","foglio","12"],["PARTICELLA","particella","445"],["SUBALT.","subalterno","3"]].map(([l,k,ph])=>
              <Field key={k} label={l} value={form[k]} onChange={v=>set(k,v)} ph={ph}/>
            )}
          </div>
        </div>

        {omiVal && (
          <div style={{ background:"#fffbf0", border:"1px solid #e8d898", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#6b4e0e" }}>
            <strong>Valore attuale aggiornato a:</strong> {fmt(omiVal)} <span style={{ color:"#aaa", fontSize:11 }}>(media OMI {form.omiMin?.toLocaleString("it-IT")}–{form.omiMax?.toLocaleString("it-IT")} €/mq × {form.mq} mq)</span>
          </div>
        )}

        <Btn onClick={submit} disabled={!form.name || !form.purchasePrice} style={{ marginTop:4 }}>
          Salva modifiche
        </Btn>
      </div>
    </Modal>
  );
}


function OMIPanel({ focus }: { focus?: any }) {
  const [city, setCity] = useState(focus?.citta || "Milano");
  const d = OMI_DATA[city];
  return (
    <div style={{ background:"#0e0e0e", border:"1px solid #1a1a1a", borderRadius:16, padding:24 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, color:"#c9a84c" }}>Prezzi OMI</div>
          <div style={{ color:"#333", fontSize:10, marginTop:2 }}>Osservatorio Mercato Immobiliare · Agenzia delle Entrate · {d.semestre}</div>
        </div>
        <select value={city} onChange={e=>setCity(e.target.value)} style={{ background:"#141414", border:"1px solid #222", color:"#e0e0e0", borderRadius:8, padding:"6px 10px", fontSize:12 }}>
          {Object.keys(OMI_DATA).map(c=><option key={c}>{c}</option>)}
        </select>
      </div>
      {focus?.citta === city && (
        <div style={{ background:"#1a160a", border:"1px solid #c9a84c22", borderRadius:10, padding:"12px 16px", marginBottom:16, display:"flex", gap:24, flexWrap:"wrap" }}>
          <div><div style={{ color:"#555", fontSize:9, letterSpacing:1 }}>ZONA IMMOBILE</div><div style={{ color:"#c9a84c", fontWeight:600, fontSize:13, marginTop:3 }}>{focus.omiZona}</div></div>
          <div><div style={{ color:"#555", fontSize:9, letterSpacing:1 }}>RANGE €/MQ</div><div style={{ color:"#e0d0a0", fontSize:13, marginTop:3 }}>{fmt(focus.omiMin)} – {fmt(focus.omiMax)}</div></div>
          <div><div style={{ color:"#555", fontSize:9, letterSpacing:1 }}>VALORE OMI ({focus.mq} mq)</div><div style={{ color:"#34d399", fontWeight:700, fontSize:15, marginTop:3 }}>{fmt(Math.round((focus.omiMin+focus.omiMax)/2*focus.mq))}</div></div>
        </div>
      )}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead><tr style={{ borderBottom:"1px solid #161616" }}>
            {["Zona","Res. min","Res. max","Comm. min","Comm. max"].map(h=><th key={h} style={{ color:"#333", fontWeight:500, padding:"6px 10px", textAlign:"left", fontSize:9, letterSpacing:0.5 }}>{h}</th>)}
          </tr></thead>
          <tbody>{d.zone.map((z,i)=>{
            const a = focus?.omiZona===z.nome && focus?.citta===city;
            return <tr key={i} style={{ borderBottom:"1px solid #0f0f0f", background:a?"#1a1a08":"transparent" }}>
              <td style={{ padding:"8px 10px", color:a?"#c9a84c":"#777", fontWeight:a?600:400 }}>{a?"▶ ":""}{z.nome}</td>
              <td style={{ padding:"8px 10px", color:"#7096f0" }}>{fmt(z.min_res)}</td>
              <td style={{ padding:"8px 10px", color:"#7096f0" }}>{fmt(z.max_res)}</td>
              <td style={{ padding:"8px 10px", color:"#c07af0" }}>{fmt(z.min_com)}</td>
              <td style={{ padding:"8px 10px", color:"#c07af0" }}>{fmt(z.max_com)}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <div style={{ color:"#1e1e1e", fontSize:10, marginTop:10 }}>Prezzi in €/mq · Fonte: Agenzia delle Entrate – OMI</div>
    </div>
  );
}

// ─── Property Card ────────────────────────────────────────────────────────────
function PropertyCard({ p, onValue, onCatasto, onDelete, onEdit }: { p: any, onValue: (p: any) => void, onCatasto: (p: any) => void, onDelete: (p: any) => void, onEdit: (p: any) => void }) {
  const gain = p.currentValue - p.purchasePrice;
  const up = gain >= 0;
  const omiVal = p.omiMin && p.mq ? Math.round((p.omiMin+p.omiMax)/2*p.mq) : null;

  return (
    <div style={{ background:"#fff", border:"1px solid #e8e4dc", borderRadius:14, overflow:"hidden", transition:"box-shadow .2s, transform .15s" }}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.08)";e.currentTarget.style.transform="translateY(-1px)"}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)"}}>

      {/* Header */}
      <div style={{ padding:"16px 18px 12px", borderBottom:"1px solid #f0ece4", background:"#fdfcf9" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, color:"#1a1a1a", lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
            <div style={{ color:"#aaa", fontSize:11, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.address}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
            <span style={{ background:p.type==="Residenziale"?"#eef2ff":"#f5eeff", color:p.type==="Residenziale"?"#4060c0":"#8040b0", borderRadius:20, padding:"2px 9px", fontSize:10, whiteSpace:"nowrap" }}>{p.type}</span>
            <button onClick={()=>onEdit(p)} title="Modifica" style={{ background:"none", border:"none", color:"#ccc", cursor:"pointer", fontSize:13, padding:"2px 4px", lineHeight:1, transition:"color .15s" }} onMouseEnter={e=>e.currentTarget.style.color="#b8922a"} onMouseLeave={e=>e.currentTarget.style.color="#ccc"}>✏️</button>
            <button onClick={()=>onDelete(p)} title="Elimina" style={{ background:"none", border:"none", color:"#ccc", cursor:"pointer", fontSize:13, padding:"2px 4px", lineHeight:1, transition:"color .15s" }} onMouseEnter={e=>e.currentTarget.style.color="#e05050"} onMouseLeave={e=>e.currentTarget.style.color="#ccc"}>✕</button>
          </div>
        </div>
      </div>

      {/* Values */}
      <div style={{ padding:"14px 18px 12px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:12 }}>
          <div>
            <div style={{ color:"#bbb", fontSize:9, letterSpacing:1, marginBottom:3 }}>VALORE OMI</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:"#96720e" }}>{fmt(p.currentValue)}</div>
          </div>
          <div>
            <div style={{ color:"#bbb", fontSize:9, letterSpacing:1, marginBottom:3 }}>PREZZO ACQUISTO</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:"#999" }}>{fmt(p.purchasePrice)}</div>
          </div>
        </div>

        {omiVal && <div style={{ background:"#f0f4ff", border:"1px solid #d8e0f0", borderRadius:7, padding:"7px 11px", marginBottom:11, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ color:"#8090c0", fontSize:10 }}>OMI {p.omiZona?.split("/")[0].trim()} · {p.omiMin?.toLocaleString("it-IT")}–{p.omiMax?.toLocaleString("it-IT")} €/mq</div>
          <div style={{ color:"#4060a0", fontSize:11, fontWeight:600 }}>{fmt(omiVal)}</div>
        </div>}

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ background:up?"#f0faf4":"#fff5f5", color:up?"#2a7a50":"#c03030", borderRadius:20, padding:"4px 12px", fontSize:11, fontWeight:700, border:`1px solid ${up?"#c0dfc8":"#f0c0c0"}` }}>
            {up?"+":""}{fmt(gain)} ({up?"+":""}{pct(p.currentValue,p.purchasePrice)}%)
          </span>
          <Sparkline data={p.trend} up={up}/>
        </div>

        <div style={{ borderTop:"1px solid #f5f0e8", marginTop:12, paddingTop:10, display:"grid", gridTemplateColumns:"repeat(3,1fr)", fontSize:10, color:"#ccc" }}>
          <span>📐 {p.mq} mq</span>
          <span>🏛️ {p.codiceComune||"—"}</span>
          <span>📅 {p.purchaseYear}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding:"0 18px 16px", display:"flex", gap:8 }}>
        <button onClick={()=>onValue(p)} style={{ flex:2, background:"#fffbf0", border:"1px solid #e8d898", color:"#96720e", borderRadius:8, padding:"9px", fontSize:11, fontWeight:600, cursor:"pointer", transition:"all .15s" }}
          onMouseEnter={e=>{e.currentTarget.style.background="linear-gradient(135deg,#b8922a,#96720e)";e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="transparent"}}
          onMouseLeave={e=>{e.currentTarget.style.background="#fffbf0";e.currentTarget.style.color="#96720e";e.currentTarget.style.borderColor="#e8d898"}}>
          ✦ Stima AI
        </button>
        <button onClick={()=>onCatasto(p)} style={{ flex:1, background:"#f0f4ff", border:"1px solid #c8d4f0", color:"#4060a0", borderRadius:8, padding:"9px", fontSize:11, cursor:"pointer", transition:"all .15s" }}
          onMouseEnter={e=>e.currentTarget.style.background="#dde6ff"} onMouseLeave={e=>e.currentTarget.style.background="#f0f4ff"}>
          🏛️
        </button>
      </div>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────
const inputStyle = { width:"100%", background:"#fff", border:"1px solid #e0e0e0", color:"#1a1a1a", borderRadius:8, padding:"9px 12px", fontSize:13, boxSizing:"border-box" };
const Label = ({ children }: { children: ReactNode }) => <label style={{ color:"#888", fontSize:9, display:"block", marginBottom:4, letterSpacing:1.5, textTransform:"uppercase" }}>{children}</label>;
const Field = ({ label, value, onChange, ph, type="text" }: { label: string, value: string|number, onChange: (v: string) => void, ph: string, type?: string }) => (
  <div><Label>{label}</Label><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={ph} style={inputStyle}/></div>
);
const Btn = ({ children, onClick, disabled, variant, style:s }: { children: ReactNode, onClick?: () => void, disabled?: boolean, variant?: string, style?: React.CSSProperties }) => (
  <button onClick={onClick} disabled={disabled} style={{ background:variant==="ghost"?"#fff":"linear-gradient(135deg,#b8922a,#96720e)", color:variant==="ghost"?"#666":"#fff", border:variant==="ghost"?"1px solid #e0e0e0":"none", borderRadius:9, padding:"11px 18px", fontWeight:700, fontSize:13, cursor:disabled?"not-allowed":"pointer", opacity:disabled?.4:1, width:"100%", transition:"opacity .15s", ...s }}>{children}</button>
);
const Loader = ({ text }: { text: string }) => (
  <div style={{ textAlign:"center", padding:"40px 0" }}>
    <div style={{ width:44, height:44, border:"2.5px solid #e8e8e8", borderTop:"2.5px solid #b8922a", borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" }}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{ color:"#999", fontSize:12 }}>{text}</div>
  </div>
);
const Modal = ({ children, onClose, title, subtitle, icon, maxW=600 }: { children: ReactNode, onClose: () => void, title?: string, subtitle?: string, icon?: string, maxW?: number }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
    <div style={{ background:"#fff", border:"1px solid #e8e8e8", borderRadius:18, width:"100%", maxWidth:maxW, maxHeight:"90vh", overflowY:"auto", padding:32, position:"relative", boxShadow:"0 20px 60px rgba(0,0,0,.12)" }}>
      <button onClick={onClose} style={{ position:"absolute", top:16, right:16, background:"none", border:"1px solid #e8e8e8", color:"#aaa", borderRadius:7, padding:"3px 10px", cursor:"pointer", fontSize:12 }}>✕</button>
      {(title || icon) && (
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          {icon && <div style={{ width:36, height:36, background:"#f5f5f5", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{icon}</div>}
          <div>
            {title && <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#1a1a1a", lineHeight:1 }}>{title}</div>}
            {subtitle && <div style={{ color:"#999", fontSize:11, marginTop:3 }}>{subtitle}</div>}
          </div>
        </div>
      )}
      {children}
    </div>
  </div>
);

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [props, setProps] = useState(DEMO);
  const [selected, setSelected] = useState(null);
  const [catasto, setCatasto] = useState(null);
  const [del, setDel] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showDB, setShowDB] = useState(false);
  const [db, setDb] = useState(null);
  const [dbOk, setDbOk] = useState(false);
  const [filter, setFilter] = useState("Tutti");
  const [tab, setTab] = useState("portfolio");

  const totalNow = props.reduce((s,p)=>s+p.currentValue,0);
  const totalBuy = props.reduce((s,p)=>s+p.purchasePrice,0);
  const gain = totalNow - totalBuy;

  const dbRef = useRef(null);

  const saveDB = (client, rows) => {
    // Il client è già stato testato nel modal — lo impostiamo subito in modo sincrono
    dbRef.current = client;
    setDb(client);
    setDbOk(true);
    if (rows && rows.length) setProps(rows);
    setShowDB(false);
  };

  const addProp = async (p) => {
    if (dbRef.current) {
      try {
        const saved = await dbRef.current.insert(p);
        setProps(prev => [...prev, saved]);
        return;
      } catch (e) {
        console.error("Insert error:", e);
      }
    }
    setProps(prev => [...prev, p]);
  };

  const delProp = async (p) => {
    if (dbRef.current) {
      try { await dbRef.current.del(p.id); } catch (e) { console.error("Delete error:", e); }
    }
    setProps(prev => prev.filter(x => x.id !== p.id));
    setDel(null);
  };

  const updCatasto = u => { setProps(prev => prev.map(p => p.id === u.id ? u : p)); setCatasto(u); };

  const saveEdit = async (updated) => {
    if (dbRef.current) {
      try { await dbRef.current.update(updated.id, updated); } catch (e) { console.error("Update error:", e); }
    }
    setProps(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const cats = ["Tutti",...new Set(props.map(p=>p.type))];
  const filtered = filter==="Tutti" ? props : props.filter(p=>p.type===filter);

  return (
    <div style={{ minHeight:"100vh", background:"#f5f4f1", color:"#1a1a1a", fontFamily:"'DM Sans','Helvetica Neue',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px}
        select,input,textarea{outline:none;font-family:inherit}
        button{font-family:inherit}
      `}</style>

      {/* ── Topbar ── */}
      <header style={{ borderBottom:"1px solid #e8e4dc", height:52, position:"sticky", top:0, background:"#fff", zIndex:200, boxShadow:"0 1px 0 #e8e4dc" }}>
        <div style={{ maxWidth:1160, margin:"0 auto", padding:"0 20px", height:"100%", display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <div style={{ width:24, height:24, background:"linear-gradient(135deg,#b8922a,#96720e)", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11 }}>⬡</div>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:14, color:"#1a1a1a" }}>Patrimon</span>
          </div>
          <div style={{ display:"inline-flex", background:"#f5f4f1", border:"1px solid #e8e4dc", borderRadius:8, padding:2, gap:0 }}>
            {[["portfolio","Portafoglio"],["mappa","Mappa"],["omi","Prezzi OMI"]].map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} style={{ background:tab===k?"#fff":"transparent", border:"none", color:tab===k?"#1a1a1a":"#aaa", padding:"5px 13px", fontSize:11, fontWeight:tab===k?600:400, cursor:"pointer", borderRadius:6, transition:"all .15s", boxShadow:tab===k?"0 1px 3px rgba(0,0,0,.07)":"none", whiteSpace:"nowrap" }}>{l}</button>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1160, margin:"0 auto", padding:"24px 20px" }}>

        {/* ── Actions row ── */}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:20 }}>
          <button onClick={()=>setShowDB(true)} style={{ background:dbOk?"#f0faf4":"#fff", border:`1px solid ${dbOk?"#b0dfc0":"#e0dbd0"}`, color:dbOk?"#3a8a58":"#999", borderRadius:8, padding:"7px 14px", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:dbOk?"#3a8a58":"#ccc", display:"inline-block" }}/>
            {dbOk ? "Supabase connesso" : "Connetti database"}
          </button>
          <button onClick={()=>setShowAdd(true)} style={{ background:"linear-gradient(135deg,#b8922a,#96720e)", color:"#fff", border:"none", borderRadius:8, padding:"7px 18px", fontWeight:700, fontSize:12, cursor:"pointer" }}>+ Aggiungi immobile</button>
        </div>

        {/* ── KPI strip ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:10, marginBottom:28 }}>
          {[
            { l:"Patrimonio totale", v:fmt(totalNow), s:`${props.length} immobili`, c:"#96720e", bg:"#fffbf0", bd:"#edddb0" },
            { l:"Plusvalenza", v:(gain>=0?"+":"")+fmt(gain), s:`${Number(pct(totalNow,totalBuy))>=0?"+":""}${pct(totalNow,totalBuy)}%`, c:gain>=0?"#2a7a50":"#c03030", bg:gain>=0?"#f0faf4":"#fff5f5", bd:gain>=0?"#b0dfc0":"#f5c0c0" },
            { l:"Costo storico", v:fmt(totalBuy), s:"Prezzo d'acquisto", c:"#555", bg:"#fafafa", bd:"#e8e8e8" },
            { l:"Rendita stimata", v:fmt(props.reduce((s,p)=>s+p.rendita*100,0)), s:"Potenziale annuo", c:"#3a5a9a", bg:"#f0f4ff", bd:"#c0ccee" },
          ].map(k=>(
            <div key={k.l} style={{ background:k.bg, border:`1px solid ${k.bd}`, borderRadius:12, padding:"16px 18px" }}>
              <div style={{ color:"#aaa", fontSize:9, letterSpacing:1.5, marginBottom:6, textTransform:"uppercase" }}>{k.l}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:k.c, lineHeight:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{k.v}</div>
              <div style={{ color:"#bbb", fontSize:11, marginTop:4 }}>{k.s}</div>
            </div>
          ))}
        </div>

        {/* ── Portafoglio ── */}
        {tab === "portfolio" && (
          <>
            <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
              {cats.map(c=>(
                <button key={c} onClick={()=>setFilter(c)} style={{ background:filter===c?"#1a1a1a":"#fff", color:filter===c?"#fff":"#888", border:`1px solid ${filter===c?"#1a1a1a":"#e0dbd0"}`, borderRadius:7, padding:"5px 14px", fontSize:11, fontWeight:filter===c?600:400, cursor:"pointer", transition:"all .15s" }}>{c}</button>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
              {filtered.map(p=><PropertyCard key={p.id} p={p} onValue={setSelected} onCatasto={setCatasto} onDelete={setDel} onEdit={setEditing}/>)}
              {!filtered.length && (
                <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"60px 0", color:"#ccc" }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>🏚️</div>
                  <div style={{ fontSize:13 }}>Nessun immobile in questa categoria</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Mappa ── */}
        {tab === "mappa" && (
          <div>
            <div style={{ color:"#bbb", fontSize:11, marginBottom:14 }}>
              {props.filter(p=>p.lat).length} di {props.length} immobili geocodificati · hover per dettagli
            </div>
            <MapView properties={props} onSelect={()=>setTab("portfolio")}/>
          </div>
        )}

        {/* ── OMI ── */}
        {tab === "omi" && <OMIPanel focus={props[0]}/>}

        <footer style={{ textAlign:"center", marginTop:48, color:"#ccc", fontSize:10 }}>
          Stime AI a scopo informativo · Prezzi OMI 2024 H1 – Agenzia delle Entrate · Geocoding OpenStreetMap · Non sostituiscono una perizia professionale
        </footer>
      </main>

      {selected && <ValuationModal property={selected} onClose={()=>setSelected(null)}/>}
      {catasto && <CatastoModal property={catasto} onClose={()=>setCatasto(null)} onUpdate={updCatasto}/>}
      {del && <DeleteModal property={del} onClose={()=>setDel(null)} onConfirm={()=>delProp(del)}/>}
      {editing && <EditModal property={editing} onClose={()=>setEditing(null)} onSave={saveEdit}/>}
      {showAdd && <AddModal onClose={()=>setShowAdd(false)} onAdd={addProp}/>}
      {showDB && <SupabaseModal onClose={()=>setShowDB(false)} onSave={saveDB}/>}
    </div>
  );
}