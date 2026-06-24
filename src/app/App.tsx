import { useState, useRef, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  Play,
  Square,
  Layers,
  Settings,
  Terminal,
  Map,
  Download,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  RotateCcw,
  Info,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Radio,
  Wind,
  Grid3X3,
  FileCode2,
  BarChart3,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkflowTab = "sources" | "propagation" | "receivers" | "run";

type SourceType = "point" | "line" | "area";

interface NoiseSource {
  id: string;
  name: string;
  type: SourceType;
  Lw: number;
  active: boolean;
}

interface LogEntry {
  level: "info" | "warn" | "error" | "success";
  time: string;
  message: string;
}

interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  color: string;
}

// ─── Small shared primitives ──────────────────────────────────────────────────

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-xs font-medium text-muted-foreground uppercase tracking-widest ${className}`}>
      {children}
    </span>
  );
}

function Field({
  label,
  unit,
  children,
}: {
  label: string;
  unit?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        {unit && <span className="text-xs text-muted-foreground font-mono">{unit}</span>}
      </div>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-input-background border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring/30 transition-colors"
    />
  );
}

function RangeInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative flex items-center gap-2">
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--primary) ${pct}%, var(--input-background) ${pct}%)`,
        }}
        className="flex-1 h-1 rounded appearance-none cursor-pointer accent-primary"
      />
      <span className="text-xs font-mono text-foreground w-8 text-right">{value}</span>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-input-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative flex items-center gap-2 text-xs cursor-pointer select-none transition-colors ${
        checked ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      <span
        className={`inline-flex w-7 h-4 rounded-full transition-colors items-center px-0.5 ${
          checked ? "bg-primary" : "bg-switch-background"
        }`}
      >
        <span
          className={`w-3 h-3 rounded-full bg-white transition-transform ${
            checked ? "translate-x-3" : "translate-x-0"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

// ─── Accordion section ────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 transition-colors text-left"
      >
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <Label className="flex-1">{title}</Label>
        {open ? (
          <ChevronDown size={12} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={12} className="text-muted-foreground" />
        )}
      </button>
      {open && <div className="px-3 pb-3 flex flex-col gap-3">{children}</div>}
    </div>
  );
}

// ─── Fake SVG map ─────────────────────────────────────────────────────────────

function FakeMap({
  showNoise,
  noiseOpacity,
  colormap,
}: {
  showNoise: boolean;
  noiseOpacity: number;
  colormap: string;
}) {
  const colormaps: Record<string, string[]> = {
    viridis: ["#440154", "#31688e", "#35b779", "#fde725"],
    turbo: ["#30123b", "#1ac7c2", "#eed534", "#f00505"],
    rdylgn: ["#a50026", "#f46d43", "#fee08b", "#1a9850"],
    plasma: ["#0d0887", "#7e03a8", "#f89540", "#f0f921"],
  };
  const stops = colormaps[colormap] ?? colormaps.viridis;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#1a2035]">
      {/* Basemap tiles (visual mockup) */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        {/* Water bodies */}
        <rect width="800" height="600" fill="#1e2d45" />
        {/* Road grid */}
        {[100, 200, 300, 400, 500, 600, 700].map((x) => (
          <line key={`vr${x}`} x1={x} y1={0} x2={x} y2={600} stroke="#2a3a50" strokeWidth="1" />
        ))}
        {[80, 160, 240, 320, 400, 480, 560].map((y) => (
          <line key={`hr${y}`} x1={0} y1={y} x2={800} y2={y} stroke="#2a3a50" strokeWidth="1" />
        ))}
        {/* Main roads */}
        <line x1={0} y1={300} x2={800} y2={295} stroke="#2e3f55" strokeWidth="5" />
        <line x1={400} y1={0} x2={405} y2={600} stroke="#2e3f55" strokeWidth="4" />
        <line x1={0} y1={140} x2={800} y2={145} stroke="#283548" strokeWidth="3" />
        <line x1={0} y1={460} x2={800} y2={455} stroke="#283548" strokeWidth="3" />
        {/* City blocks */}
        {[
          [120, 80, 80, 60], [220, 80, 70, 60], [320, 80, 90, 60],
          [120, 200, 80, 80], [220, 200, 70, 80], [320, 200, 90, 80],
          [430, 80, 80, 60], [530, 80, 70, 60], [630, 80, 90, 60],
          [430, 200, 80, 80], [530, 200, 70, 80], [630, 200, 90, 80],
          [120, 340, 80, 80], [220, 340, 70, 80], [320, 340, 90, 80],
          [430, 340, 80, 80], [530, 340, 70, 80], [630, 340, 90, 80],
          [120, 480, 80, 60], [220, 480, 70, 60], [320, 480, 90, 60],
          [430, 480, 80, 60], [530, 480, 70, 60], [630, 480, 90, 60],
        ].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} fill="#243040" rx="1" />
        ))}
        {/* Park area */}
        <ellipse cx={680} cy={460} rx={60} ry={45} fill="#1e3a2a" opacity={0.6} />

        {/* Noise model overlay */}
        {showNoise && (
          <g style={{ opacity: noiseOpacity / 100 }}>
            <defs>
              <radialGradient id="ng1" cx="50%" cy="50%">
                <stop offset="0%" stopColor={stops[3]} stopOpacity="0.9" />
                <stop offset="30%" stopColor={stops[2]} stopOpacity="0.75" />
                <stop offset="65%" stopColor={stops[1]} stopOpacity="0.55" />
                <stop offset="100%" stopColor={stops[0]} stopOpacity="0" />
              </radialGradient>
              <radialGradient id="ng2" cx="50%" cy="50%">
                <stop offset="0%" stopColor={stops[3]} stopOpacity="0.85" />
                <stop offset="40%" stopColor={stops[2]} stopOpacity="0.6" />
                <stop offset="75%" stopColor={stops[1]} stopOpacity="0.35" />
                <stop offset="100%" stopColor={stops[0]} stopOpacity="0" />
              </radialGradient>
              <radialGradient id="ng3" cx="50%" cy="50%">
                <stop offset="0%" stopColor={stops[2]} stopOpacity="0.7" />
                <stop offset="50%" stopColor={stops[1]} stopOpacity="0.4" />
                <stop offset="100%" stopColor={stops[0]} stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Primary road noise along horizontal road */}
            <ellipse cx={400} cy={298} rx={380} ry={60} fill="url(#ng1)" />
            {/* Secondary source at intersection */}
            <ellipse cx={405} cy={298} rx={90} ry={85} fill="url(#ng2)" />
            {/* Industrial point source */}
            <ellipse cx={160} cy={420} rx={70} ry={55} fill="url(#ng3)" />
            {/* Contour lines */}
            <ellipse cx={400} cy={298} rx={120} ry={30} fill="none" stroke={stops[3]} strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
            <ellipse cx={400} cy={298} rx={200} ry={48} fill="none" stroke={stops[2]} strokeWidth="0.8" strokeDasharray="4 4" opacity="0.5" />
            <ellipse cx={400} cy={298} rx={290} ry={56} fill="none" stroke={stops[1]} strokeWidth="0.6" strokeDasharray="3 5" opacity="0.4" />
          </g>
        )}
      </svg>

      {/* Map controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        {["＋", "−"].map((c, i) => (
          <button key={i} className="w-7 h-7 bg-card border border-border text-foreground text-sm flex items-center justify-center hover:bg-muted transition-colors rounded-sm font-mono">
            {c}
          </button>
        ))}
      </div>

      {/* Scale bar */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1">
        <div className="flex items-end gap-1">
          <div className="w-16 h-1.5 bg-foreground/70" />
          <span className="text-xs text-foreground/70 font-mono leading-none">500 m</span>
        </div>
      </div>

      {/* Coordinates */}
      <div className="absolute top-2 right-2 bg-card/80 backdrop-blur-sm border border-border rounded px-2 py-1">
        <span className="text-xs font-mono text-muted-foreground">48.8566°N  2.3522°E</span>
      </div>
    </div>
  );
}

// ─── Noise legend ─────────────────────────────────────────────────────────────

function NoiseLegend({ colormap }: { colormap: string }) {
  const colormaps: Record<string, string[]> = {
    viridis: ["#440154", "#31688e", "#35b779", "#fde725"],
    turbo: ["#30123b", "#1ac7c2", "#eed534", "#f00505"],
    rdylgn: ["#a50026", "#f46d43", "#fee08b", "#1a9850"],
    plasma: ["#0d0887", "#7e03a8", "#f89540", "#f0f921"],
  };
  const stops = (colormaps[colormap] ?? colormaps.viridis).join(", ");
  const levels = [35, 45, 55, 65, 75];

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-3 rounded-sm w-full"
        style={{ background: `linear-gradient(to right, ${stops})` }}
      />
      <div className="flex justify-between">
        {levels.map((l) => (
          <span key={l} className="text-xs font-mono text-muted-foreground">{l}</span>
        ))}
      </div>
      <div className="flex justify-between">
        <span className="text-xs text-muted-foreground">Quiet</span>
        <span className="text-xs font-mono text-muted-foreground">dB(A)</span>
        <span className="text-xs text-muted-foreground">Loud</span>
      </div>
    </div>
  );
}

// ─── Log entry ────────────────────────────────────────────────────────────────

function LogLine({ entry }: { entry: LogEntry }) {
  const colors: Record<string, string> = {
    info: "text-muted-foreground",
    warn: "text-yellow-400",
    error: "text-red-400",
    success: "text-green-400",
  };
  const icons: Record<string, React.ReactNode> = {
    info: <Info size={10} />,
    warn: <AlertTriangle size={10} />,
    error: <X size={10} />,
    success: <CheckCircle2 size={10} />,
  };
  return (
    <div className={`flex items-start gap-2 font-mono text-xs ${colors[entry.level]}`}>
      <span className="text-muted-foreground shrink-0 pt-px">{entry.time}</span>
      <span className="shrink-0 pt-px">{icons[entry.level]}</span>
      <span className="break-all">{entry.message}</span>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

const INIT_SOURCES: NoiseSource[] = [
  { id: "s1", name: "Road — Rue de Rivoli", type: "line", Lw: 72, active: true },
  { id: "s2", name: "Industrial plant A", type: "point", Lw: 85, active: true },
  { id: "s3", name: "Construction zone", type: "area", Lw: 78, active: false },
];

const INIT_LOGS: LogEntry[] = [
  { level: "info", time: "09:41:02", message: "NoiseModel v2.4.1 initialized" },
  { level: "info", time: "09:41:02", message: "Loaded propagation standard: CNOSSOS-EU 2022" },
  { level: "info", time: "09:41:03", message: "Receiver grid: 5m × 5m, z=1.5m, 160×120 points" },
];

const INIT_LAYERS: MapLayer[] = [
  { id: "l1", name: "OSM Base", visible: true, opacity: 100, color: "#58a6ff" },
  { id: "l2", name: "Noise contours (Lden)", visible: true, opacity: 70, color: "#fde725" },
  { id: "l3", name: "Receiver grid", visible: false, opacity: 80, color: "#3fb950" },
  { id: "l4", name: "Building footprints", visible: true, opacity: 90, color: "#8b949e" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkflowTab>("sources");
  const [sources, setSources] = useState<NoiseSource[]>(INIT_SOURCES);
  const [layers, setLayers] = useState<MapLayer[]>(INIT_LAYERS);
  const [logs, setLogs] = useState<LogEntry[]>(INIT_LOGS);
  const [running, setRunning] = useState(false);
  const [showNoise, setShowNoise] = useState(false);
  const [runProgress, setRunProgress] = useState(0);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Propagation params
  const [standard, setStandard] = useState("cnossos");
  const [groundType, setGroundType] = useState("0.5");
  const [temperature, setTemperature] = useState(15);
  const [humidity, setHumidity] = useState(70);
  const [windSpeed, setWindSpeed] = useState(3);
  const [windDir, setWindDir] = useState(225);
  const [favourable, setFavourable] = useState(true);

  // Receiver params
  const [gridRes, setGridRes] = useState(5);
  const [receiverHeight, setReceiverHeight] = useState(1.5);
  const [maxDist, setMaxDist] = useState(800);

  // Visualization
  const [colormap, setColormap] = useState("viridis");
  const [noiseOpacity, setNoiseOpacity] = useState(70);
  const [showContours, setShowContours] = useState(true);

  const logRef = useRef<HTMLDivElement>(null);

  const pushLog = (level: LogEntry["level"], message: string) => {
    const now = new Date();
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((n) => String(n).padStart(2, "0"))
      .join(":");
    setLogs((prev) => [...prev, { level, time, message }]);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const handleRun = () => {
    if (running) {
      setRunning(false);
      setRunProgress(0);
      pushLog("warn", "Run aborted by user.");
      return;
    }
    setRunning(true);
    setRunProgress(0);
    pushLog("info", `Starting run — standard: ${standard.toUpperCase()}, grid: ${gridRes}m`);
    pushLog("info", `Active sources: ${sources.filter((s) => s.active).length}`);

    const steps = [
      [300, "info", "Building terrain model from DEM..."],
      [600, "info", "Computing source contributions..."],
      [900, "success", "Source A: done (72 dB, 3 octave bands)"],
      [1200, "info", "Applying ground attenuation (G=" + groundType + ")..."],
      [1600, "info", "Meteorological correction applied (favourable: " + favourable + ")"],
      [2000, "success", "Receiver grid computed: 19,200 points"],
      [2400, "info", "Generating contour polygons..."],
      [2700, "success", "Run complete. Lden range: 38–74 dB(A)"],
    ] as [number, LogEntry["level"], string][];

    steps.forEach(([delay, level, msg]) => {
      setTimeout(() => pushLog(level, msg), delay);
    });

    const interval = setInterval(() => {
      setRunProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setRunning(false);
          setShowNoise(true);
          return 100;
        }
        return p + 3.5;
      });
    }, 100);
  };

  const toggleSource = (id: string) =>
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );

  const toggleLayer = (id: string) =>
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );

  const updateLayerOpacity = (id: string, opacity: number) =>
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    );

  const tabs: { id: WorkflowTab; label: string; icon: React.ReactNode }[] = [
    { id: "sources", label: "Sources", icon: <Radio size={12} /> },
    { id: "propagation", label: "Propagation", icon: <Wind size={12} /> },
    { id: "receivers", label: "Receivers", icon: <Grid3X3 size={12} /> },
    { id: "run", label: "Run", icon: <Play size={12} /> },
  ];

  return (
    <div
      className="flex flex-col w-full h-screen overflow-hidden bg-background text-foreground"
      style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}
    >
      {/* ── Top bar ── */}
      <header className="flex items-center gap-0 px-3 h-10 border-b border-border bg-card shrink-0 z-20">
        <div className="flex items-center gap-2 mr-6">
          <div className="w-5 h-5 rounded-sm bg-primary flex items-center justify-center">
            <Map size={11} className="text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">NoiseMap</span>
          <span className="text-xs text-muted-foreground font-mono">v2.4</span>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mr-auto">
          <FileCode2 size={12} />
          <span className="font-mono">Paris_Rivoli_Lden_2024.nmp</span>
        </div>

        {/* Run progress indicator */}
        {running && (
          <div className="flex items-center gap-2 mr-4">
            <div className="w-40 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-100 rounded-full"
                style={{ width: `${runProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-primary">{Math.round(runProgress)}%</span>
          </div>
        )}

        {showNoise && !running && (
          <div className="flex items-center gap-1.5 mr-4 text-green-400 text-xs font-mono">
            <CheckCircle2 size={12} />
            Lden 38–74 dB(A)
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
              rightPanelOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers size={12} />
            Layers
          </button>
          <button
            onClick={() => setConsoleOpen(!consoleOpen)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
              consoleOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal size={12} />
            Console
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Download size={12} />
            Export
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Settings size={12} />
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left panel ── */}
        <aside className="w-72 shrink-0 border-r border-border bg-card flex flex-col overflow-hidden z-10">
          {/* Workflow tabs */}
          <div className="flex border-b border-border shrink-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors border-b-2 ${
                  activeTab === t.id
                    ? "border-primary text-primary bg-accent/20"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                {t.icon}
                <span className="text-[10px] tracking-wide">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ── SOURCES tab ── */}
            {activeTab === "sources" && (
              <div>
                <Section title="Noise Sources" icon={<Radio size={12} />}>
                  <div className="flex flex-col gap-1">
                    {sources.map((src) => (
                      <div
                        key={src.id}
                        className={`flex items-center gap-2 px-2 py-2 rounded border transition-colors ${
                          src.active
                            ? "border-border bg-input-background"
                            : "border-border/30 bg-transparent opacity-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={src.active}
                          onChange={() => toggleSource(src.id)}
                          className="accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{src.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground uppercase">{src.type}</span>
                            <span className="text-[10px] font-mono text-primary">{src.Lw} dB</span>
                          </div>
                        </div>
                        <button className="text-muted-foreground hover:text-red-400 transition-colors">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-border rounded text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                    <Plus size={12} />
                    Add source
                  </button>
                </Section>

                <Section title="Source Parameters" icon={<Sliders size={12} />} defaultOpen={false}>
                  <Field label="Emission standard" >
                    <Select
                      value="cnossos"
                      onChange={() => {}}
                      options={[
                        { value: "cnossos", label: "CNOSSOS-EU 2022" },
                        { value: "iso9613", label: "ISO 9613-2:2023" },
                        { value: "harmonoise", label: "Harmonoise 2.0" },
                        { value: "custom", label: "Custom script…" },
                      ]}
                    />
                  </Field>
                  <Field label="Traffic flow" unit="veh/h">
                    <NumberInput value={2400} onChange={() => {}} min={0} max={10000} />
                  </Field>
                  <Field label="Heavy vehicle %" unit="%">
                    <RangeInput value={12} onChange={() => {}} min={0} max={100} />
                  </Field>
                  <Field label="Speed limit" unit="km/h">
                    <NumberInput value={50} onChange={() => {}} min={0} max={130} step={10} />
                  </Field>
                  <Field label="Road surface">
                    <Select
                      value="dac"
                      onChange={() => {}}
                      options={[
                        { value: "dac", label: "Dense asphalt concrete" },
                        { value: "sma", label: "Stone mastic asphalt" },
                        { value: "pa", label: "Porous asphalt" },
                        { value: "concrete", label: "Concrete" },
                      ]}
                    />
                  </Field>
                </Section>

                <Section title="Time Periods" defaultOpen={false}>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    {[
                      { label: "Day", time: "07–19h", active: true },
                      { label: "Evening", time: "19–23h", active: true },
                      { label: "Night", time: "23–07h", active: true },
                    ].map((p) => (
                      <div
                        key={p.label}
                        className={`flex flex-col gap-0.5 py-2 px-1 rounded border cursor-pointer transition-colors ${
                          p.active ? "border-primary bg-accent/20 text-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        <span className="text-xs font-medium">{p.label}</span>
                        <span className="text-[10px] font-mono">{p.time}</span>
                      </div>
                    ))}
                  </div>
                  <Field label="Indicator">
                    <Select
                      value="lden"
                      onChange={() => {}}
                      options={[
                        { value: "lden", label: "Lden (day-evening-night)" },
                        { value: "lday", label: "Lday only" },
                        { value: "lnight", label: "Lnight only" },
                        { value: "leq24", label: "Leq 24h" },
                      ]}
                    />
                  </Field>
                </Section>
              </div>
            )}

            {/* ── PROPAGATION tab ── */}
            {activeTab === "propagation" && (
              <div>
                <Section title="Standard & Method" icon={<FileCode2 size={12} />}>
                  <Field label="Propagation standard">
                    <Select
                      value={standard}
                      onChange={setStandard}
                      options={[
                        { value: "cnossos", label: "CNOSSOS-EU 2022" },
                        { value: "iso9613", label: "ISO 9613-2:2023" },
                        { value: "nord2000", label: "Nord2000" },
                        { value: "custom", label: "Custom script…" },
                      ]}
                    />
                  </Field>
                  <Field label="Frequency bands">
                    <Select
                      value="octave"
                      onChange={() => {}}
                      options={[
                        { value: "octave", label: "Octave (63–8000 Hz)" },
                        { value: "third", label: "1/3-octave (50–10000 Hz)" },
                        { value: "broadband", label: "Broadband A-weighted" },
                      ]}
                    />
                  </Field>
                  <Toggle checked={favourable} onChange={setFavourable} label="Favourable conditions" />
                  <Toggle checked={true} onChange={() => {}} label="Include reflections" />
                  <Toggle checked={false} onChange={() => {}} label="Diffraction over buildings" />
                </Section>

                <Section title="Ground & Geometry" icon={<Sliders size={12} />}>
                  <Field label="Mean ground factor G" unit="0–1">
                    <Select
                      value={groundType}
                      onChange={setGroundType}
                      options={[
                        { value: "0", label: "0 — Hard (asphalt, water)" },
                        { value: "0.5", label: "0.5 — Mixed" },
                        { value: "1", label: "1 — Soft (grass, soil)" },
                        { value: "custom", label: "Custom per zone…" },
                      ]}
                    />
                  </Field>
                  <Field label="Max propagation distance" unit="m">
                    <RangeInput value={maxDist} onChange={setMaxDist} min={100} max={2000} step={50} />
                  </Field>
                  <Field label="Reflection order">
                    <Select
                      value="1"
                      onChange={() => {}}
                      options={[
                        { value: "0", label: "0 — No reflections" },
                        { value: "1", label: "1 — Single" },
                        { value: "2", label: "2 — Double" },
                      ]}
                    />
                  </Field>
                </Section>

                <Section title="Meteorology" icon={<Wind size={12} />} defaultOpen={false}>
                  <Field label="Temperature" unit="°C">
                    <RangeInput value={temperature} onChange={setTemperature} min={-20} max={50} />
                  </Field>
                  <Field label="Relative humidity" unit="%">
                    <RangeInput value={humidity} onChange={setHumidity} min={0} max={100} />
                  </Field>
                  <Field label="Wind speed" unit="m/s">
                    <RangeInput value={windSpeed} onChange={setWindSpeed} min={0} max={15} step={0.5} />
                  </Field>
                  <Field label="Wind direction" unit="°">
                    <RangeInput value={windDir} onChange={setWindDir} min={0} max={360} step={5} />
                  </Field>
                  <Field label="Atmospheric profile">
                    <Select
                      value="neutral"
                      onChange={() => {}}
                      options={[
                        { value: "neutral", label: "Neutral (Pasquill C)" },
                        { value: "stable", label: "Stable (Pasquill E-F)" },
                        { value: "unstable", label: "Unstable (Pasquill A-B)" },
                      ]}
                    />
                  </Field>
                </Section>
              </div>
            )}

            {/* ── RECEIVERS tab ── */}
            {activeTab === "receivers" && (
              <div>
                <Section title="Receiver Grid" icon={<Grid3X3 size={12} />}>
                  <Field label="Grid resolution" unit="m">
                    <RangeInput value={gridRes} onChange={setGridRes} min={1} max={50} />
                  </Field>
                  <Field label="Receiver height" unit="m">
                    <NumberInput value={receiverHeight} onChange={setReceiverHeight} min={0} max={10} step={0.5} />
                  </Field>
                  <Field label="Grid extent">
                    <Select
                      value="bbox"
                      onChange={() => {}}
                      options={[
                        { value: "bbox", label: "Map view bounding box" },
                        { value: "polygon", label: "Custom polygon (draw)" },
                        { value: "csv", label: "Import from CSV…" },
                      ]}
                    />
                  </Field>
                  <Toggle checked={true} onChange={() => {}} label="Snap to building facades" />
                  <div className="bg-muted rounded p-2 flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Points</span>
                      <span className="font-mono text-foreground">19,200</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Coverage</span>
                      <span className="font-mono text-foreground">480,000 m²</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Est. runtime</span>
                      <span className="font-mono text-primary">~28 s</span>
                    </div>
                  </div>
                </Section>

                <Section title="Sensitive Receptors" defaultOpen={false}>
                  <div className="flex flex-col gap-1">
                    {[
                      { name: "School — École Montaigne", type: "Educational", dB: "—" },
                      { name: "Hospital — Hôtel-Dieu", type: "Healthcare", dB: "—" },
                      { name: "Residential — Rue St-Antoine", type: "Residential", dB: "—" },
                    ].map((r) => (
                      <div key={r.name} className="flex items-start gap-2 px-2 py-1.5 bg-input-background rounded border border-border">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{r.name}</div>
                          <div className="text-[10px] text-muted-foreground">{r.type}</div>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{r.dB}</span>
                      </div>
                    ))}
                  </div>
                  <button className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-border rounded text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                    <Plus size={12} />
                    Add receptor
                  </button>
                </Section>

                <Section title="Visualization" defaultOpen={false}>
                  <Field label="Colormap">
                    <Select
                      value={colormap}
                      onChange={setColormap}
                      options={[
                        { value: "viridis", label: "Viridis" },
                        { value: "turbo", label: "Turbo" },
                        { value: "rdylgn", label: "Red-Yellow-Green" },
                        { value: "plasma", label: "Plasma" },
                      ]}
                    />
                  </Field>
                  <Field label="Layer opacity" unit="%">
                    <RangeInput value={noiseOpacity} onChange={setNoiseOpacity} min={10} max={100} step={5} />
                  </Field>
                  <Toggle checked={showContours} onChange={setShowContours} label="Show contour lines" />
                  <Toggle checked={showNoise} onChange={setShowNoise} label="Show noise overlay" />
                  {showNoise && <NoiseLegend colormap={colormap} />}
                </Section>
              </div>
            )}

            {/* ── RUN tab ── */}
            {activeTab === "run" && (
              <div>
                <Section title="Script" icon={<FileCode2 size={12} />}>
                  <Field label="Model script">
                    <Select
                      value="cnossos_road"
                      onChange={() => {}}
                      options={[
                        { value: "cnossos_road", label: "cnossos_road_2022.py" },
                        { value: "iso9613", label: "iso9613_industrial.py" },
                        { value: "aircraft", label: "ecac_doc29_aircraft.py" },
                        { value: "combined", label: "combined_sources.py" },
                        { value: "custom", label: "Browse…" },
                      ]}
                    />
                  </Field>
                  <Field label="Compute engine">
                    <Select
                      value="local"
                      onChange={() => {}}
                      options={[
                        { value: "local", label: "Local (8 threads)" },
                        { value: "hpc", label: "HPC cluster (SLURM)" },
                        { value: "cloud", label: "Cloud (AWS Batch)" },
                      ]}
                    />
                  </Field>
                  <Field label="Threads / cores">
                    <RangeInput value={8} onChange={() => {}} min={1} max={32} />
                  </Field>
                </Section>

                <Section title="Validation" icon={<CheckCircle2 size={12} />}>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { label: "Active sources", ok: sources.filter((s) => s.active).length > 0, val: `${sources.filter((s) => s.active).length} source(s)` },
                      { label: "Propagation standard", ok: true, val: standard.toUpperCase() },
                      { label: "Receiver grid", ok: gridRes > 0, val: `${gridRes}m × ${gridRes}m` },
                      { label: "Max distance", ok: maxDist >= 100, val: `${maxDist} m` },
                    ].map((v) => (
                      <div key={v.label} className="flex items-center gap-2">
                        {v.ok ? (
                          <CheckCircle2 size={11} className="text-green-400 shrink-0" />
                        ) : (
                          <AlertTriangle size={11} className="text-yellow-400 shrink-0" />
                        )}
                        <span className="text-xs text-muted-foreground flex-1">{v.label}</span>
                        <span className="text-xs font-mono text-foreground">{v.val}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                <div className="p-3 flex flex-col gap-2">
                  <button
                    onClick={handleRun}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded text-sm font-semibold transition-all ${
                      running
                        ? "bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30"
                        : "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.99]"
                    }`}
                  >
                    {running ? (
                      <>
                        <Square size={14} />
                        Stop Run
                      </>
                    ) : (
                      <>
                        <Play size={14} />
                        Run Model
                      </>
                    )}
                  </button>

                  {running && (
                    <div className="flex flex-col gap-1">
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-100"
                          style={{ width: `${runProgress}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground text-center">
                        {Math.round(runProgress)}% — computing propagation…
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowNoise(false);
                      setRunProgress(0);
                      pushLog("info", "Results cleared.");
                    }}
                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded text-xs text-muted-foreground hover:text-foreground border border-border hover:border-border/60 transition-colors"
                  >
                    <RotateCcw size={12} />
                    Clear results
                  </button>
                </div>

                {showNoise && (
                  <Section title="Results Summary" icon={<BarChart3 size={12} />}>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { label: "Lden min", val: "38.2 dB(A)" },
                        { label: "Lden max", val: "74.1 dB(A)" },
                        { label: "Lden avg (area-weighted)", val: "53.8 dB(A)" },
                        { label: "Area > 55 dB(A)", val: "14,820 m²" },
                        { label: "Area > 65 dB(A)", val: "3,240 m²" },
                        { label: "Population exposed >55", val: "~1,840" },
                        { label: "Run time", val: "27.4 s" },
                      ].map((r) => (
                        <div key={r.label} className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">{r.label}</span>
                          <span className="text-xs font-mono text-foreground">{r.val}</span>
                        </div>
                      ))}
                    </div>
                    <button className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-border rounded text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <Download size={12} />
                      Export CSV / GeoTIFF
                    </button>
                  </Section>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ── Map + console ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Map */}
          <div className="flex-1 relative min-h-0">
            <FakeMap showNoise={showNoise} noiseOpacity={noiseOpacity} colormap={colormap} />

            {/* Floating toolbar */}
            <div className="absolute top-3 left-3 flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-border rounded px-2 py-1">
              {["Select", "Point", "Line", "Polygon", "Measure"].map((t, i) => (
                <button
                  key={t}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    i === 0
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {t}
                </button>
              ))}
              <div className="w-px h-4 bg-border mx-1" />
              <button className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                OSM
              </button>
              <button className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                Satellite
              </button>
            </div>

            {showNoise && (
              <div className="absolute top-3 right-14 bg-card/90 backdrop-blur-sm border border-border rounded p-2 w-40">
                <Label className="block mb-1.5">Noise level</Label>
                <NoiseLegend colormap={colormap} />
              </div>
            )}
          </div>

          {/* Console */}
          {consoleOpen && (
            <div className="h-36 border-t border-border bg-card flex flex-col shrink-0">
              <div className="flex items-center justify-between px-3 py-1 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal size={11} className="text-muted-foreground" />
                  <Label>Script output</Label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLogs([])}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setConsoleOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              <div
                ref={logRef}
                className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-0.5 scrollbar-thin"
              >
                {logs.map((entry, i) => (
                  <LogLine key={i} entry={entry} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel: Layers ── */}
        {rightPanelOpen && (
          <aside className="w-52 shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
              <div className="flex items-center gap-1.5">
                <Layers size={12} className="text-muted-foreground" />
                <Label>Map Layers</Label>
              </div>
              <button
                onClick={() => setRightPanelOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={12} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {layers.map((layer) => (
                <div key={layer.id} className="flex flex-col gap-1.5 pb-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: layer.color }}
                    />
                    <span className="text-xs flex-1 truncate">{layer.name}</span>
                    <button
                      onClick={() => toggleLayer(layer.id)}
                      className={`transition-colors ${
                        layer.visible ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                  </div>
                  {layer.visible && (
                    <RangeInput
                      value={layer.opacity}
                      onChange={(v) => updateLayerOpacity(layer.id, v)}
                      min={0}
                      max={100}
                      step={5}
                    />
                  )}
                </div>
              ))}
              <button className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-border rounded text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                <Plus size={12} />
                Add layer
              </button>
            </div>

            {/* Quick stats panel */}
            <div className="border-t border-border p-3 flex flex-col gap-2 shrink-0">
              <Label>Quick Stats</Label>
              <div className="flex flex-col gap-1">
                {[
                  { label: "Lden", val: showNoise ? "53.8" : "—", unit: "dB(A)" },
                  { label: "Lnight", val: showNoise ? "46.2" : "—", unit: "dB(A)" },
                  { label: "Points", val: "19,200", unit: "" },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <span className="text-xs font-mono text-foreground">
                      {s.val} {s.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
