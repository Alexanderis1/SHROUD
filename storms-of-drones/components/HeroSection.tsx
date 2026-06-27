"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  MapPin,
  Radio,
  Shield,
  Wifi,
  Zap,
} from "lucide-react";

const Globe = dynamic(() => import("./Globe"), { ssr: false });

const DRONE_COUNT = 247;
const MISSION_ZONES = ["Lazio", "Lombardia", "Sicilia", "Campania", "Veneto", "Toscana", "Piemonte"];

function LiveCounter({ target, label, suffix = "" }: { target: number; label: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const step = target / 60;
    const timer = setInterval(() => {
      setCount((c) => {
        if (c >= target) { clearInterval(timer); return target; }
        return Math.min(c + step, target);
      });
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-blue-400 font-mono tracking-tight">
        {Math.floor(count).toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-slate-400 mt-1 uppercase tracking-widest">{label}</div>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
      active
        ? "border-green-500/40 bg-green-500/10 text-green-400"
        : "border-slate-500/40 bg-slate-500/10 text-slate-400"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-400 animate-pulse" : "bg-slate-500"}`} />
      {active ? "ONLINE" : "STANDBY"}
    </span>
  );
}

function DataStreamLine({ delay }: { delay: number }) {
  const chars = "01ABCDEF0123456789FEFEFEFF0011AA";
  const randomChars = Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join(" ");
  return (
    <div
      className="absolute left-0 text-blue-500/20 text-xs font-mono whitespace-nowrap animate-data-stream pointer-events-none select-none"
      style={{ animationDelay: `${delay}s`, top: 0, animationDuration: `${6 + delay}s` }}
    >
      {randomChars}
    </div>
  );
}

export default function HeroSection({ onDeploy }: { onDeploy: () => void }) {
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchStep, setLaunchStep] = useState(0);
  const [systemOnline] = useState(true);

  const launchSteps = [
    "Initializing swarm protocol...",
    "Authenticating drone fleet...",
    "Calculating flight corridors...",
    "Loading infrastructure database...",
    "Deploying 247 drones...",
    "Mission active.",
  ];

  function handleLaunch() {
    setIsLaunching(true);
    setLaunchStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setLaunchStep(step);
      if (step >= launchSteps.length - 1) {
        clearInterval(interval);
        setTimeout(() => {
          onDeploy();
        }, 800);
      }
    }, 600);
  }

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden" id="hero">
      {/* Background data streams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[1.2, 2.8, 0.5, 3.9, 1.7, 4.5, 0.2].map((d, i) => (
          <div key={i} className="absolute" style={{ left: `${8 + i * 13}%` }}>
            <DataStreamLine delay={d} />
          </div>
        ))}
      </div>

      {/* Grid background */}
      <div className="absolute inset-0 grid-bg opacity-60 z-0" />

      {/* Top nav */}
      <nav className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
            <Radio className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-bold text-white tracking-wider text-sm uppercase">
            Storms<span className="text-blue-400">.</span>io
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <a href="#dashboard" className="hover:text-white transition-colors">Dashboard</a>
          <a href="#analytics" className="hover:text-white transition-colors">Analytics</a>
          <a href="#reports" className="hover:text-white transition-colors">Reports</a>
          <a href="#fleet" className="hover:text-white transition-colors">Fleet</a>
        </div>

        <div className="flex items-center gap-3">
          <StatusPill active={systemOnline} />
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
            <Wifi className="w-3 h-3 text-blue-400" />
            <span>247 active</span>
          </div>
        </div>
      </nav>

      {/* Hero content */}
      <div className="relative z-10 flex flex-col lg:flex-row items-center flex-1 px-8 py-8 gap-8 max-w-[1400px] mx-auto w-full">
        {/* Left side — text */}
        <div className="flex-1 flex flex-col items-start justify-center lg:pr-8 pt-4 lg:pt-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2 mb-6"
          >
            <span className="text-xs font-mono text-blue-400 border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 rounded-full uppercase tracking-widest">
              ⚡ Sistema Attivo — Italia
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl lg:text-7xl font-black text-white leading-[0.95] tracking-tight mb-6"
          >
            STORMS
            <br />
            <span className="text-shimmer">OF DRONES</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-slate-300 text-lg leading-relaxed max-w-xl mb-8"
          >
            Autonomous swarm intelligence for real-time monitoring of public infrastructure.
            Bridges, tunnels, railways and roads — scanned, analyzed, reported.
            <span className="text-blue-400 font-medium"> Italy first.</span>
          </motion.p>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex gap-8 mb-10 border-t border-white/5 pt-6 w-full"
          >
            <LiveCounter target={247} label="Drones Active" />
            <LiveCounter target={1384} label="km² Scanned" />
            <LiveCounter target={23} label="Anomalies Found" />
            <LiveCounter target={98} label="Uptime %" suffix="%" />
          </motion.div>

          {/* Launch button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <button
              onClick={handleLaunch}
              disabled={isLaunching}
              className="relative group px-8 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-all duration-300 glow-blue hover:glow-blue overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                {isLaunching ? launchSteps[launchStep] : "Deploy Swarm"}
              </span>
              {/* Shimmer on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>

            <button
              onClick={() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-4 glass border-glow text-white font-medium text-sm uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all duration-300"
            >
              View Reports
            </button>
          </motion.div>

          {/* Launch progress */}
          <AnimatePresence>
            {isLaunching && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 w-full"
              >
                <div className="glass border-glow rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">Launch Sequence</span>
                  </div>
                  {launchSteps.slice(0, launchStep + 1).map((step, i) => (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <span className="text-green-400 text-xs font-mono">✓</span>
                      <span className="text-xs font-mono text-slate-300">{step}</span>
                    </div>
                  ))}
                  <div className="mt-3 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full"
                      animate={{ width: `${((launchStep + 1) / launchSteps.length) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right side — Globe */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="flex-1 relative h-[500px] lg:h-[680px] w-full max-w-[700px]"
        >
          <Globe />

          {/* Floating telemetry cards */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-12 right-4 glass border-glow rounded-xl p-3 min-w-[140px]"
          >
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Active Zone</div>
            <div className="text-sm font-bold text-white flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-400" /> Roma, Lazio
            </div>
            <div className="text-xs text-green-400 mt-1 font-mono">3 drones scanning</div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-24 left-4 glass border-glow rounded-xl p-3 min-w-[150px]"
          >
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Latest Alert</div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">Bridge crack — A1</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">14:23 UTC · HIGH</div>
          </motion.div>

          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute top-32 left-2 glass border-glow rounded-xl p-3"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span className="text-xs text-slate-300 font-mono">Signal: 98.4%</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Shield className="w-3 h-3 text-green-400" />
              <span className="text-xs text-slate-300 font-mono">Encrypted</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Mission zones ticker */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="relative z-10 border-t border-white/5 bg-black/20 px-8 py-3 overflow-hidden"
      >
        <div className="flex items-center gap-8 overflow-hidden">
          <span className="text-xs font-mono text-blue-400 uppercase tracking-widest shrink-0">
            ACTIVE ZONES
          </span>
          <div className="flex gap-6 flex-wrap">
            {MISSION_ZONES.map((zone, i) => (
              <span key={zone} className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                <span className={`w-1.5 h-1.5 rounded-full ${i < 3 ? "bg-green-400 animate-pulse" : "bg-blue-400"}`} />
                {zone}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="relative z-10 flex justify-center pb-6 pt-2"
      >
        <ChevronDown className="w-5 h-5 text-slate-600" />
      </motion.div>
    </section>
  );
}
