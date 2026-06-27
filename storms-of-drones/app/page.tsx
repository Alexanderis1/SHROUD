"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import AnalyticsSection from "@/components/AnalyticsSection";
import ItalyMapSection from "@/components/ItalyMapSection";
import FleetSection from "@/components/FleetSection";
import { CheckCircle, Shield, Globe2 } from "lucide-react";

function DeploySuccess() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="glass-strong rounded-3xl p-12 border border-blue-500/30 text-center max-w-md mx-4"
      >
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border border-green-400/30 animate-pulse-ring"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Mission Active</h2>
        <p className="text-slate-300 text-sm mb-2">247 drones deployed across Italy</p>
        <p className="text-slate-500 text-xs mb-8 font-mono">MISSION ID: IT-2024-0892 · 14:23 UTC</p>
        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
          {[
            { value: "247", label: "Drones" },
            { value: "7", label: "Regions" },
            { value: "~2h", label: "ETA" },
          ].map(({ value, label }) => (
            <div key={label} className="glass rounded-xl p-3 border border-white/5">
              <div className="text-xl font-bold text-blue-400 font-mono">{value}</div>
              <div className="text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mb-6">Scroll down to monitor mission progress in real-time</p>
        <button
          onClick={() => {
            document.querySelector<HTMLDivElement>("[data-dismiss-deploy]")?.click();
            document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-colors"
          data-dismiss-deploy
        >
          Monitor Mission
        </button>
      </motion.div>
    </motion.div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe2 className="w-5 h-5 text-blue-400" />
              <span className="font-black text-white tracking-wider">STORMS OF DRONES</span>
            </div>
            <p className="text-sm text-slate-500 max-w-xs">
              Autonomous swarm intelligence for Italian public infrastructure monitoring.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {[
              { icon: Shield, label: "SOC2 Compliant" },
              { icon: Shield, label: "GDPR Ready" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-slate-500 glass px-3 py-2 rounded-lg border border-white/5">
                <Icon className="w-3.5 h-3.5 text-green-400" />
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-white/5 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600 font-mono">© 2024 Storms of Drones · Infrastructure Intelligence</p>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-slate-300 cursor-pointer transition-colors">API Docs</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  const [deployed, setDeployed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  function handleDeploy() {
    setDeployed(true);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
  }

  return (
    <main className="min-h-screen bg-[#020408] relative overflow-x-hidden">
      {/* Background radial gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-blue-900/10 blur-[120px]" />
        <div className="absolute bottom-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-900/8 blur-[100px]" />
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] rounded-full bg-cyan-900/8 blur-[80px]" />
      </div>

      <div className="relative z-10">
        <HeroSection onDeploy={handleDeploy} />
        <AnalyticsSection />
        <ItalyMapSection />
        <FleetSection />
        <Footer />
      </div>

      <AnimatePresence>
        {showSuccess && (
          <div onClick={() => setShowSuccess(false)}>
            <DeploySuccess />
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
