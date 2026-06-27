"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { AlertTriangle, MapPin, Zap } from "lucide-react";

// Infrastructure anomaly pins on a stylized Italy map
// Coordinates are normalized [0-100] for the bounding box of Italy
const ANOMALY_PINS = [
  { id: 1, x: 48, y: 28, label: "Ponte della Libertà", city: "Venezia", severity: "MEDIUM", type: "Bridge", desc: "Surface cracking, requires resurfacing" },
  { id: 2, x: 38, y: 32, label: "A4 Junction", city: "Milano", severity: "LOW", type: "Road", desc: "Minor potholing, routine maintenance" },
  { id: 3, x: 44, y: 42, label: "Apennine Tunnel T12", city: "Bologna", severity: "HIGH", type: "Tunnel", desc: "Water seepage detected at vault" },
  { id: 4, x: 42, y: 52, label: "Viaduct SP3", city: "Firenze", severity: "CRITICAL", type: "Bridge", desc: "Pillar crack 3.2mm — urgent inspection" },
  { id: 5, x: 50, y: 60, label: "Linea AV km 142", city: "Roma", severity: "HIGH", type: "Railway", desc: "Rail deformation 4.7mm displacement" },
  { id: 6, x: 55, y: 65, label: "A24 Motorway", city: "L'Aquila", severity: "MEDIUM", type: "Road", desc: "Subsidence zone, monitoring active" },
  { id: 7, x: 35, y: 72, label: "Puglia Coastal Road", city: "Bari", severity: "LOW", type: "Road", desc: "Erosion monitoring, stable" },
  { id: 8, x: 44, y: 82, label: "Ponte Morandi", city: "Cosenza", severity: "CRITICAL", type: "Bridge", desc: "Urgent structural review required" },
  { id: 9, x: 48, y: 88, label: "Messina Strait Cable", city: "Reggio", severity: "HIGH", type: "Bridge", desc: "Corrosion on main cable 71% strength" },
  { id: 10, x: 32, y: 90, label: "SS115 Western Sicily", city: "Palermo", severity: "MEDIUM", type: "Road", desc: "Multiple sinkhole risk zones" },
  { id: 11, x: 62, y: 72, label: "Taranto Port Bridge", city: "Taranto", severity: "HIGH", type: "Bridge", desc: "Seismic activity response check" },
  { id: 12, x: 28, y: 35, label: "A10 Ligure", city: "Genova", severity: "MEDIUM", type: "Road", desc: "Landslide risk monitoring" },
];

const SEVERITY_CONFIG = {
  CRITICAL: { color: "#ef4444", bg: "bg-red-500", border: "border-red-500/60", text: "text-red-400", glow: "rgba(239,68,68,0.6)" },
  HIGH: { color: "#f97316", bg: "bg-orange-500", border: "border-orange-500/60", text: "text-orange-400", glow: "rgba(249,115,22,0.5)" },
  MEDIUM: { color: "#eab308", bg: "bg-yellow-500", border: "border-yellow-500/60", text: "text-yellow-400", glow: "rgba(234,179,8,0.4)" },
  LOW: { color: "#3b82f6", bg: "bg-blue-500", border: "border-blue-500/60", text: "text-blue-400", glow: "rgba(59,130,246,0.4)" },
};

// Simplified Italy SVG path
const ITALY_PATH = `
  M 180 30 C 185 28 195 25 200 22 C 208 18 215 20 220 24 
  C 225 28 228 35 232 40 C 236 45 240 48 238 55 
  C 236 60 230 62 226 68 C 222 74 220 80 218 86
  C 215 93 210 98 206 105 C 202 112 198 118 195 124
  C 193 130 192 136 190 142 C 188 148 185 153 182 158
  C 178 164 174 168 170 173 C 166 178 162 182 158 187
  C 155 191 152 195 149 200 C 145 207 141 213 138 220
  C 134 228 130 235 127 243 C 124 250 122 258 120 265
  C 118 272 116 279 115 286 C 114 292 114 298 114 304
  C 114 310 115 315 117 320 C 119 325 122 328 125 332
  C 128 336 132 338 136 341 C 140 344 144 346 148 348
  C 152 350 156 352 160 352 C 164 352 168 351 172 349
  C 176 347 180 343 183 339 C 186 334 188 328 189 322
  C 190 316 190 310 188 305 C 186 300 183 296 180 292
  C 177 288 173 285 170 281 C 167 277 165 272 164 267
  C 163 262 164 256 166 251 C 168 246 172 242 176 238
  C 180 233 185 229 190 225 C 195 221 200 217 205 213
  C 210 209 215 205 218 200 C 221 194 221 187 220 181
  C 219 175 216 170 213 165 C 210 160 206 156 204 151
  C 202 146 202 140 204 135 C 206 130 210 126 214 122
  C 218 117 222 113 226 108 C 230 103 233 98 236 93
  C 240 87 244 82 248 76 C 252 70 256 64 258 58
  C 260 52 260 45 258 39 C 256 33 252 28 248 23
  C 244 18 239 14 234 11 C 229 8 223 6 217 5
  C 211 4 205 4 199 6 C 193 8 187 12 183 17
  C 179 22 177 28 178 33 Z
`;

export default function ItalyMapSection() {
  const [hoveredPin, setHoveredPin] = useState<number | null>(null);
  const [selectedPin, setSelectedPin] = useState<number | null>(null);

  const selectedAnomaly = ANOMALY_PINS.find((p) => p.id === selectedPin);
  const hoveredAnomaly = ANOMALY_PINS.find((p) => p.id === hoveredPin);

  const counts = {
    CRITICAL: ANOMALY_PINS.filter((p) => p.severity === "CRITICAL").length,
    HIGH: ANOMALY_PINS.filter((p) => p.severity === "HIGH").length,
    MEDIUM: ANOMALY_PINS.filter((p) => p.severity === "MEDIUM").length,
    LOW: ANOMALY_PINS.filter((p) => p.severity === "LOW").length,
  };

  return (
    <section id="analytics" className="py-24 px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent" />
      <div className="relative z-10 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-5 bg-red-500 rounded-full" />
            <span className="text-xs font-mono text-red-400 uppercase tracking-widest">Live Intelligence</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-2">Italy Infrastructure Map</h2>
          <p className="text-slate-400 text-sm max-w-lg">
            Real-time anomaly overlay across Italian public infrastructure — bridges, tunnels, roads and railways.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map */}
          <div className="lg:col-span-2">
            {/* Severity legend */}
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => (
                <div key={sev} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${SEVERITY_CONFIG[sev].bg}`} />
                  <span className="text-xs text-slate-400">{sev}</span>
                  <span className="text-xs font-mono text-white font-bold">{counts[sev]}</span>
                </div>
              ))}
            </div>

            {/* Map container */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden relative" style={{ height: 520 }}>
              {/* Background grid */}
              <div className="absolute inset-0 grid-bg opacity-40" />
              
              {/* SVG Map */}
              <svg
                viewBox="0 0 380 380"
                className="absolute inset-0 w-full h-full"
                style={{ padding: "20px" }}
              >
                {/* Italy shape */}
                <path
                  d={ITALY_PATH}
                  fill="rgba(20, 40, 80, 0.5)"
                  stroke="rgba(59, 130, 246, 0.25)"
                  strokeWidth="1"
                />
                
                {/* Sardinia */}
                <ellipse cx="100" cy="220" rx="18" ry="25" fill="rgba(20,40,80,0.5)" stroke="rgba(59,130,246,0.2)" strokeWidth="1" />
                
                {/* Sicily */}
                <ellipse cx="110" cy="340" rx="30" ry="16" fill="rgba(20,40,80,0.5)" stroke="rgba(59,130,246,0.2)" strokeWidth="1" />

                {/* Scan sweep lines */}
                {[60, 120, 180, 240, 300].map((y) => (
                  <line key={y} x1="50" y1={y} x2="300" y2={y}
                    stroke="rgba(59,130,246,0.04)" strokeWidth="0.5" strokeDasharray="4 8" />
                ))}

                {/* Anomaly pins */}
                {ANOMALY_PINS.map((pin) => {
                  const cx = 50 + (pin.x / 100) * 250;
                  const cy = 20 + (pin.y / 100) * 340;
                  const config = SEVERITY_CONFIG[pin.severity as keyof typeof SEVERITY_CONFIG];
                  const isHovered = hoveredPin === pin.id;
                  const isSelected = selectedPin === pin.id;

                  return (
                    <g key={pin.id}>
                      {/* Pulse ring */}
                      {(pin.severity === "CRITICAL" || pin.severity === "HIGH") && (
                        <circle cx={cx} cy={cy} r={isHovered ? 16 : 12} fill="none"
                          stroke={config.color} strokeWidth="0.8" opacity="0.3">
                          <animate attributeName="r" values={`${isHovered ? 8 : 6};${isHovered ? 20 : 16};${isHovered ? 8 : 6}`} dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                        </circle>
                      )}
                      {/* Pin dot */}
                      <circle
                        cx={cx} cy={cy}
                        r={isHovered || isSelected ? 7 : 5}
                        fill={config.color}
                        opacity={0.9}
                        style={{ cursor: "pointer", filter: `drop-shadow(0 0 6px ${config.glow})`, transition: "r 0.2s" }}
                        onMouseEnter={() => setHoveredPin(pin.id)}
                        onMouseLeave={() => setHoveredPin(null)}
                        onClick={() => setSelectedPin(selectedPin === pin.id ? null : pin.id)}
                      />
                      {/* City label on hover */}
                      {(isHovered || isSelected) && (
                        <text cx={cx + 10} cy={cy - 8} fontSize="8" fill="white" fontFamily="monospace">
                          {pin.city}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Italy label */}
                <text x="185" y="130" fontSize="9" fill="rgba(100,116,139,0.8)" fontFamily="monospace" textAnchor="middle" letterSpacing="3">
                  ITALIA
                </text>
              </svg>

              {/* Hover tooltip */}
              {hoveredAnomaly && selectedPin !== hoveredAnomaly.id && (
                <div className="absolute top-4 left-4 glass rounded-xl p-3 border border-white/10 pointer-events-none max-w-[200px]">
                  <div className={`text-xs font-bold mb-1 ${SEVERITY_CONFIG[hoveredAnomaly.severity as keyof typeof SEVERITY_CONFIG].text}`}>
                    {hoveredAnomaly.severity}
                  </div>
                  <div className="text-xs text-white font-medium">{hoveredAnomaly.label}</div>
                  <div className="text-xs text-slate-400">{hoveredAnomaly.city}</div>
                </div>
              )}

              {/* Active scan indicator */}
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-mono text-slate-400">Live Scanning</span>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Selected anomaly */}
            {selectedAnomaly ? (
              <motion.div
                key={selectedAnomaly.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass rounded-2xl p-5 border ${SEVERITY_CONFIG[selectedAnomaly.severity as keyof typeof SEVERITY_CONFIG].border}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${SEVERITY_CONFIG[selectedAnomaly.severity as keyof typeof SEVERITY_CONFIG].text} ${SEVERITY_CONFIG[selectedAnomaly.severity as keyof typeof SEVERITY_CONFIG].border}`}>
                    {selectedAnomaly.severity}
                  </span>
                  <button onClick={() => setSelectedPin(null)} className="text-slate-500 hover:text-white transition-colors text-xs">✕</button>
                </div>
                <h4 className="font-bold text-white mb-1 text-sm">{selectedAnomaly.label}</h4>
                <div className="flex items-center gap-1 mb-3">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span className="text-xs text-slate-400">{selectedAnomaly.city}</span>
                  <span className="text-xs text-slate-600 ml-1">· {selectedAnomaly.type}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed bg-black/20 rounded-lg p-3 border border-white/5">
                  {selectedAnomaly.desc}
                </p>
                <button className="w-full mt-3 py-2 text-xs font-medium text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors">
                  View Full Report
                </button>
              </motion.div>
            ) : (
              <div className="glass rounded-2xl p-5 border border-white/5 text-center">
                <MapPin className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Click a pin on the map to inspect an anomaly</p>
              </div>
            )}

            {/* Severity breakdown */}
            <div className="glass rounded-2xl p-5 border border-white/5">
              <h4 className="font-bold text-white text-sm mb-4">Anomaly Breakdown</h4>
              {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => (
                <div key={sev} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={SEVERITY_CONFIG[sev].text}>{sev}</span>
                    <span className="text-slate-400 font-mono">{counts[sev]} issues</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(counts[sev] / ANOMALY_PINS.length) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className={`h-full rounded-full ${SEVERITY_CONFIG[sev].bg}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Active drone count */}
            <div className="glass rounded-2xl p-5 border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-blue-400" />
                <h4 className="font-bold text-white text-sm">Drone Activity</h4>
              </div>
              <div className="space-y-2">
                {[
                  { region: "Nord Italia", count: 82, active: true },
                  { region: "Centro Italia", count: 94, active: true },
                  { region: "Sud Italia", count: 71, active: true },
                ].map((zone) => (
                  <div key={zone.region} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${zone.active ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
                      <span className="text-xs text-slate-300">{zone.region}</span>
                    </div>
                    <span className="text-xs font-mono text-white">{zone.count} drones</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
