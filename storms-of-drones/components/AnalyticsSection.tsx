"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Filter,
  MapPin,
  TrendingUp,
  Zap,
} from "lucide-react";

const anomalyTimeData = [
  { time: "00:00", critical: 2, warning: 5, info: 12 },
  { time: "02:00", critical: 1, warning: 3, info: 8 },
  { time: "04:00", critical: 0, warning: 2, info: 6 },
  { time: "06:00", critical: 3, warning: 7, info: 15 },
  { time: "08:00", critical: 5, warning: 12, info: 22 },
  { time: "10:00", critical: 4, warning: 9, info: 19 },
  { time: "12:00", critical: 6, warning: 14, info: 28 },
  { time: "14:00", critical: 8, warning: 11, info: 24 },
  { time: "16:00", critical: 5, warning: 8, info: 18 },
  { time: "18:00", critical: 3, warning: 6, info: 14 },
  { time: "20:00", critical: 2, warning: 4, info: 10 },
  { time: "22:00", critical: 1, warning: 3, info: 8 },
];

const regionData = [
  { region: "Lazio", anomalies: 23, scanned: 342, coverage: 89 },
  { region: "Lombardia", anomalies: 18, scanned: 420, coverage: 94 },
  { region: "Sicilia", anomalies: 31, scanned: 285, coverage: 72 },
  { region: "Campania", anomalies: 27, scanned: 310, coverage: 78 },
  { region: "Veneto", anomalies: 12, scanned: 390, coverage: 91 },
  { region: "Toscana", anomalies: 15, scanned: 365, coverage: 87 },
];

const infrastructureTypes = [
  { name: "Bridges", value: 34, color: "#3b82f6" },
  { name: "Tunnels", value: 22, color: "#8b5cf6" },
  { name: "Railways", value: 18, color: "#06b6d4" },
  { name: "Roads", value: 26, color: "#10b981" },
];

const radarData = [
  { subject: "Bridges", A: 82 },
  { subject: "Tunnels", A: 65 },
  { subject: "Railways", A: 90 },
  { subject: "Roads", A: 78 },
  { subject: "Ports", A: 55 },
  { subject: "Airports", A: 71 },
];

const ANOMALIES = [
  { id: "IT-2024-0891", type: "CRITICAL", category: "Bridge", location: "Autostrada A1 — Firenze Nord", description: "Structural crack detected on load-bearing pillar P7. Width: 3.2mm. Growth rate: 0.1mm/day.", time: "14:23 UTC", status: "Pending Review" },
  { id: "IT-2024-0887", type: "HIGH", category: "Tunnel", location: "Galleria del Frejus — Entry Portal", description: "Water infiltration detected. Estimated flow rate: 0.8 L/min. Risk of concrete erosion.", time: "13:51 UTC", status: "Investigation" },
  { id: "IT-2024-0883", type: "HIGH", category: "Railway", location: "Linea AV Roma-Napoli km 142", description: "Rail deformation detected. Max displacement: 4.7mm. Speed restriction recommended.", time: "12:40 UTC", status: "Mitigated" },
  { id: "IT-2024-0878", type: "MEDIUM", category: "Road", location: "SS7 — Matera Province", description: "Pavement subsidence. Area: 12m². Depression depth: 8cm. Risk of sinkholes.", time: "11:15 UTC", status: "Scheduled" },
  { id: "IT-2024-0872", type: "MEDIUM", category: "Bridge", location: "Viadotto Polcevera — Genova", description: "Corrosion indicators on tension cables. Estimated remaining tensile strength: 71%.", time: "09:30 UTC", status: "Under Review" },
  { id: "IT-2024-0868", type: "LOW", category: "Road", location: "A4 — Trieste junction", description: "Pavement cracking pattern. Moderate severity. Regular maintenance cycle recommended.", time: "07:45 UTC", status: "Logged" },
];

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-400 border-red-500/40 bg-red-500/10",
  HIGH: "text-orange-400 border-orange-500/40 bg-orange-500/10",
  MEDIUM: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  LOW: "text-blue-400 border-blue-500/40 bg-blue-500/10",
};

const STATUS_COLORS: Record<string, string> = {
  "Pending Review": "text-red-300",
  "Investigation": "text-orange-300",
  "Mitigated": "text-green-300",
  "Scheduled": "text-amber-300",
  "Under Review": "text-purple-300",
  "Logged": "text-slate-400",
};

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-5 bg-blue-500 rounded-full" />
        <span className="text-xs font-mono text-blue-400 uppercase tracking-widest">{subtitle}</span>
      </div>
      <h2 className="text-3xl font-black text-white tracking-tight">{title}</h2>
    </div>
  );
}

function MetricCard({ value, label, change, icon: Icon, color = "blue" }: {
  value: string;
  label: string;
  change?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    green: "text-green-400 bg-green-500/10 border-green-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    cyan: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  };
  return (
    <div className="glass rounded-2xl p-5 border border-white/5 hover:border-blue-500/20 transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg border ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        {change && (
          <span className="text-xs font-mono text-green-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-black text-white font-mono tracking-tight">{value}</div>
      <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default function AnalyticsSection() {
  const [activeTab, setActiveTab] = useState<"overview" | "anomalies" | "reports">("overview");
  const [selectedAnomaly, setSelectedAnomaly] = useState<typeof ANOMALIES[0] | null>(null);

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: TrendingUp },
    { id: "anomalies" as const, label: "Anomalies", icon: AlertTriangle },
    { id: "reports" as const, label: "Reports", icon: FileText },
  ];

  return (
    <section id="dashboard" className="py-24 px-8 relative">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="relative z-10 max-w-[1400px] mx-auto">
        <SectionHeader title="Mission Dashboard" subtitle="Real-time Intelligence" />

        {/* Key metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          <MetricCard value="247" label="Drones Active" icon={Zap} color="blue" change="+12" />
          <MetricCard value="1,384" label="km² Scanned" icon={MapPin} color="cyan" change="+84" />
          <MetricCard value="23" label="Critical Anomalies" icon={AlertTriangle} color="red" />
          <MetricCard value="98.4%" label="Fleet Uptime" icon={CheckCircle} color="green" />
          <MetricCard value="6h 42m" label="Mission Time" icon={Clock} color="amber" />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 bg-white/3 p-1 rounded-xl border border-white/5 w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === id
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Anomaly timeline */}
            <div className="lg:col-span-2 glass rounded-2xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white">Anomaly Detection Timeline</h3>
                <span className="text-xs font-mono text-slate-400">Last 24 hours</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={anomalyTimeData}>
                  <defs>
                    <linearGradient id="critical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="warning" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="info" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "#0d1424", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Area type="monotone" dataKey="info" stroke="#3b82f6" fill="url(#info)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="warning" stroke="#f59e0b" fill="url(#warning)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="critical" stroke="#ef4444" fill="url(#critical)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Infrastructure types pie */}
            <div className="glass rounded-2xl p-6 border border-white/5">
              <h3 className="font-bold text-white mb-5">By Infrastructure Type</h3>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={infrastructureTypes} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {infrastructureTypes.map((entry, index) => (
                      <Cell key={index} fill={entry.color} opacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0d1424", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {infrastructureTypes.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                    <span className="text-xs text-slate-400">{item.name}</span>
                    <span className="text-xs font-mono text-white ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Regional coverage bar chart */}
            <div className="lg:col-span-2 glass rounded-2xl p-6 border border-white/5">
              <h3 className="font-bold text-white mb-5">Regional Coverage & Anomalies</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={regionData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="region" tick={{ fill: "#64748b", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: "#0d1424", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Bar dataKey="scanned" fill="#1e3a5f" radius={[3, 3, 0, 0]} name="km² Scanned" />
                  <Bar dataKey="anomalies" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Anomalies" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Radar */}
            <div className="glass rounded-2xl p-6 border border-white/5">
              <h3 className="font-bold text-white mb-5">Coverage Quality</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Radar name="Quality" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={1.5} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {activeTab === "anomalies" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          >
            {/* Anomaly table */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-400 font-mono">{ANOMALIES.length} anomalies detected today</span>
                <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 glass rounded-lg border border-white/5">
                  <Filter className="w-3 h-3" /> Filter
                </button>
              </div>
              <div className="space-y-2">
                {ANOMALIES.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    onClick={() => setSelectedAnomaly(selectedAnomaly?.id === anomaly.id ? null : anomaly)}
                    className={`glass rounded-xl p-4 border cursor-pointer transition-all duration-200 ${
                      selectedAnomaly?.id === anomaly.id
                        ? "border-blue-500/40 bg-blue-500/5"
                        : "border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md border mt-0.5 ${SEVERITY_COLORS[anomaly.type]}`}>
                        {anomaly.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{anomaly.category}</span>
                          <span className="text-xs font-mono text-slate-500">{anomaly.time}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="text-xs text-slate-400 truncate">{anomaly.location}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-xs text-slate-500 font-mono">{anomaly.id}</span>
                          <span className={`text-xs font-medium ${STATUS_COLORS[anomaly.status]}`}>{anomaly.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Anomaly detail panel */}
            <div className="lg:col-span-2">
              {selectedAnomaly ? (
                <motion.div
                  key={selectedAnomaly.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass rounded-2xl p-6 border border-blue-500/20 sticky top-8"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md border ${SEVERITY_COLORS[selectedAnomaly.type]}`}>
                      {selectedAnomaly.type}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{selectedAnomaly.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{selectedAnomaly.category} Anomaly</h3>
                  <div className="flex items-center gap-1.5 mb-4">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-sm text-slate-300">{selectedAnomaly.location}</span>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 mb-4 border border-white/5">
                    <p className="text-sm text-slate-300 leading-relaxed">{selectedAnomaly.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Detected At</div>
                      <div className="text-sm font-mono text-white">{selectedAnomaly.time}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</div>
                      <div className={`text-sm font-medium ${STATUS_COLORS[selectedAnomaly.status]}`}>{selectedAnomaly.status}</div>
                    </div>
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600/20 border border-blue-500/30 rounded-xl text-sm text-blue-400 hover:bg-blue-600/30 transition-colors">
                    <Download className="w-4 h-4" /> Download Report
                  </button>
                </motion.div>
              ) : (
                <div className="glass rounded-2xl p-8 border border-white/5 text-center">
                  <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Select an anomaly to view details and download the full report</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "reports" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ReportsTab />
          </motion.div>
        )}
      </div>
    </section>
  );
}

const REPORTS = [
  { id: "RPT-2024-158", title: "Lombardia Infrastructure Scan — Full Report", date: "27 Jun 2024", size: "4.2 MB", pages: 48, status: "Final", anomalies: 18 },
  { id: "RPT-2024-157", title: "A1 Autostrada Critical Bridges — Emergency Assessment", date: "26 Jun 2024", size: "2.1 MB", pages: 22, status: "Urgent", anomalies: 7 },
  { id: "RPT-2024-156", title: "Sicilia Coastal Roads — Monthly Inspection", date: "25 Jun 2024", size: "6.8 MB", pages: 71, status: "Final", anomalies: 31 },
  { id: "RPT-2024-155", title: "Alta Velocità Railway Network — Weekly Report", date: "24 Jun 2024", size: "3.4 MB", pages: 35, status: "Draft", anomalies: 5 },
  { id: "RPT-2024-154", title: "Campania Road Network — Comprehensive Analysis", date: "23 Jun 2024", size: "5.1 MB", pages: 58, status: "Final", anomalies: 27 },
];

function ReportsTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-3">
        {REPORTS.map((report, i) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-5 border border-white/5 hover:border-blue-500/20 transition-all duration-200 group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-white text-sm leading-tight mb-1">{report.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>{report.id}</span>
                    <span>·</span>
                    <span>{report.date}</span>
                    <span>·</span>
                    <span>{report.pages} pages</span>
                    <span>·</span>
                    <span>{report.size}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${
                      report.status === "Urgent"
                        ? "text-red-400 border-red-500/30 bg-red-500/10"
                        : report.status === "Draft"
                        ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                        : "text-green-400 border-green-500/30 bg-green-500/10"
                    }`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {report.anomalies} anomalies documented
                    </span>
                  </div>
                </div>
              </div>
              <button className="shrink-0 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors px-3 py-2 glass rounded-lg border border-blue-500/20 hover:border-blue-400/40">
                <Download className="w-3.5 h-3.5" />
                PDF
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Report summary sidebar */}
      <div className="space-y-4">
        <div className="glass rounded-2xl p-5 border border-white/5">
          <h4 className="font-bold text-white mb-4 text-sm">Report Summary</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Total Reports</span>
              <span className="text-sm font-mono text-white font-bold">158</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">This Month</span>
              <span className="text-sm font-mono text-white font-bold">23</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Critical Issues</span>
              <span className="text-sm font-mono text-red-400 font-bold">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Resolved</span>
              <span className="text-sm font-mono text-green-400 font-bold">89</span>
            </div>
          </div>
        </div>
        <div className="glass rounded-2xl p-5 border border-white/5">
          <h4 className="font-bold text-white mb-3 text-sm">Auto-Export</h4>
          <p className="text-xs text-slate-400 mb-3">Schedule automatic report delivery to your team.</p>
          <button className="w-full py-2 text-xs font-medium text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-colors">
            Configure Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
