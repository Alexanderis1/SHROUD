"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  Battery,
  CheckCircle,
  ChevronRight,
  MapPin,
  Signal,
  Thermometer,
  Wind,
  Zap,
} from "lucide-react";

const DRONE_FLEET = [
  { id: "SOD-001", name: "Eagle-Alpha", status: "active", battery: 87, signal: 98, location: "Roma, Lazio", mission: "Bridge Scan", altitude: 120 },
  { id: "SOD-002", name: "Hawk-Beta", status: "active", battery: 64, signal: 95, location: "Milano, Lombardia", mission: "Road Survey", altitude: 85 },
  { id: "SOD-003", name: "Falcon-Gamma", status: "active", battery: 92, signal: 99, location: "Firenze, Toscana", mission: "Tunnel Inspect", altitude: 40 },
  { id: "SOD-004", name: "Osprey-Delta", status: "warning", battery: 23, signal: 78, location: "Napoli, Campania", mission: "Railway Check", altitude: 60 },
  { id: "SOD-005", name: "Kite-Epsilon", status: "active", battery: 71, signal: 97, location: "Venezia, Veneto", mission: "Coastal Bridge", altitude: 110 },
  { id: "SOD-006", name: "Condor-Zeta", status: "returning", battery: 18, signal: 92, location: "Palermo, Sicilia", mission: "→ RTB", altitude: 200 },
  { id: "SOD-007", name: "Raven-Eta", status: "active", battery: 79, signal: 96, location: "Torino, Piemonte", mission: "Motorway A4", altitude: 95 },
  { id: "SOD-008", name: "Swift-Theta", status: "active", battery: 55, signal: 94, location: "Bari, Puglia", mission: "Port Bridge", altitude: 75 },
];

const STATUS_CONFIG = {
  active: { label: "ACTIVE", color: "text-green-400", bg: "bg-green-400", border: "border-green-500/30" },
  warning: { label: "WARNING", color: "text-amber-400", bg: "bg-amber-400", border: "border-amber-500/40" },
  returning: { label: "RETURNING", color: "text-blue-400", bg: "bg-blue-400", border: "border-blue-500/30" },
  offline: { label: "OFFLINE", color: "text-slate-500", bg: "bg-slate-500", border: "border-slate-600/30" },
};

function BatteryBar({ level }: { level: number }) {
  const color = level > 50 ? "#22c55e" : level > 25 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <Battery className="w-3.5 h-3.5" style={{ color }} />
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden w-16">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${level}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{level}%</span>
    </div>
  );
}

function LiveTelemetry() {
  const [values, setValues] = useState({ temp: 42, wind: 18, pressure: 1013 });
  useEffect(() => {
    const interval = setInterval(() => {
      setValues({
        temp: 38 + Math.floor(Math.random() * 10),
        wind: 14 + Math.floor(Math.random() * 12),
        pressure: 1010 + Math.floor(Math.random() * 6),
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass rounded-2xl p-5 border border-white/5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <h4 className="font-bold text-white text-sm">Live Telemetry</h4>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Thermometer className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs text-slate-400">Avg Motor Temp</span>
          </div>
          <span className="text-sm font-mono text-white">{values.temp}°C</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-400">Wind Speed</span>
          </div>
          <span className="text-sm font-mono text-white">{values.wind} km/h</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-slate-400">Pressure</span>
          </div>
          <span className="text-sm font-mono text-white">{values.pressure} hPa</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Signal className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-slate-400">Avg Signal</span>
          </div>
          <span className="text-sm font-mono text-green-400">96.2%</span>
        </div>
      </div>
    </div>
  );
}

export default function FleetSection() {
  const [expandedDrone, setExpandedDrone] = useState<string | null>(null);

  const activeCount = DRONE_FLEET.filter((d) => d.status === "active").length;
  const warningCount = DRONE_FLEET.filter((d) => d.status === "warning").length;

  return (
    <section id="fleet" className="py-24 px-8 relative">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="relative z-10 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-5 bg-cyan-500 rounded-full" />
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Fleet Management</span>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">Active Drone Fleet</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass px-4 py-2 rounded-xl border border-green-500/20">
              <span className="text-xs text-slate-400">Active: </span>
              <span className="text-sm font-mono text-green-400 font-bold">{activeCount}</span>
            </div>
            <div className="glass px-4 py-2 rounded-xl border border-amber-500/20">
              <span className="text-xs text-slate-400">Warning: </span>
              <span className="text-sm font-mono text-amber-400 font-bold">{warningCount}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Drone list */}
          <div className="lg:col-span-3 space-y-2">
            {DRONE_FLEET.map((drone, i) => {
              const statusCfg = STATUS_CONFIG[drone.status as keyof typeof STATUS_CONFIG];
              const expanded = expandedDrone === drone.id;
              return (
                <motion.div
                  key={drone.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`glass rounded-xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                    expanded ? "border-blue-500/30" : "border-white/5 hover:border-white/10"
                  }`}
                  onClick={() => setExpandedDrone(expanded ? null : drone.id)}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Status indicator */}
                      <div className={`w-2 h-2 rounded-full ${statusCfg.bg} ${drone.status === "active" ? "animate-pulse" : ""} shrink-0`} />

                      {/* ID */}
                      <span className="text-xs font-mono text-slate-500 w-20 shrink-0">{drone.id}</span>

                      {/* Name */}
                      <span className="font-semibold text-white text-sm w-32 shrink-0">{drone.name}</span>

                      {/* Status badge */}
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${statusCfg.color} ${statusCfg.border} hidden sm:block`}>
                        {statusCfg.label}
                      </span>

                      {/* Location */}
                      <div className="flex items-center gap-1 flex-1 min-w-0 hidden md:flex">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="text-xs text-slate-400 truncate">{drone.location}</span>
                      </div>

                      {/* Mission */}
                      <span className="text-xs text-blue-400 font-medium w-28 text-right shrink-0 hidden lg:block">{drone.mission}</span>

                      {/* Battery */}
                      <div className="shrink-0 hidden sm:block">
                        <BatteryBar level={drone.battery} />
                      </div>

                      <ChevronRight className={`w-4 h-4 text-slate-600 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
                    </div>

                    {/* Expanded detail */}
                    {expanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4"
                      >
                        <div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Altitude</div>
                          <div className="text-sm font-mono text-white">{drone.altitude}m AGL</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Signal</div>
                          <div className="text-sm font-mono text-green-400">{drone.signal}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Mission</div>
                          <div className="text-sm font-mono text-blue-400">{drone.mission}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Battery</div>
                          <div className="text-sm font-mono" style={{ color: drone.battery > 50 ? "#22c55e" : drone.battery > 25 ? "#f59e0b" : "#ef4444" }}>
                            {drone.battery}% remaining
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            <LiveTelemetry />

            <div className="glass rounded-2xl p-5 border border-white/5">
              <h4 className="font-bold text-white text-sm mb-4">Mission Status</h4>
              <div className="space-y-3">
                {[
                  { label: "Sectors Covered", value: "68/72", icon: CheckCircle, color: "text-green-400" },
                  { label: "Anomalies Found", value: "23", icon: AlertTriangle, color: "text-red-400" },
                  { label: "Photos Captured", value: "14,832", icon: Activity, color: "text-blue-400" },
                  { label: "Est. Completion", value: "18:40 UTC", icon: Zap, color: "text-cyan-400" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                      <span className="text-xs text-slate-400">{label}</span>
                    </div>
                    <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full py-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-sm font-bold text-blue-400 hover:bg-blue-600/30 transition-colors uppercase tracking-wider">
              Recall All Drones
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
