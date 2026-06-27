import { Link } from 'react-router-dom';
import { Compass, Sparkles, Map, Users, Globe, ChevronRight, Star, Trophy, ArrowRight } from 'lucide-react';
import { historicalSites } from '../data/historicalSites';
import { communityEvents } from '../data/communityEvents';
import SiteCard from '../components/SiteCard';
import EventCard from '../components/EventCard';

const stats = [
  { value: '2,400+', label: 'Historical Sites', icon: Globe },
  { value: '180+', label: 'Countries Covered', icon: Map },
  { value: '94K+', label: 'Community Members', icon: Users },
  { value: '340+', label: 'Events This Year', icon: Trophy },
];

const features = [
  {
    icon: Globe,
    title: 'AR Historical Discovery',
    description:
      'Point your phone at any landmark and instantly surface historical overlays, archival photographs, and expert commentary layered directly onto the real world.',
    gradient: 'from-violet-900/50 to-purple-900/30',
    border: 'border-violet-700/30',
  },
  {
    icon: Map,
    title: 'Geofenced Time Layers',
    description:
      'Walk through a city and experience it across multiple eras simultaneously. Toggle between the Roman era, medieval period, and the present with a single swipe.',
    gradient: 'from-sky-900/50 to-blue-900/30',
    border: 'border-sky-700/30',
  },
  {
    icon: Users,
    title: 'Community & Hackathons',
    description:
      'Join hackathons, workshops, and meetups that bring together historians, developers, and designers to build the next wave of heritage technology.',
    gradient: 'from-teal-900/50 to-emerald-900/30',
    border: 'border-teal-700/30',
  },
  {
    icon: Sparkles,
    title: 'AI Narrative Engine',
    description:
      'Our AI narrates the history of any location in real time — adapting tone, depth, and language to your preferences, from academic to storytelling mode.',
    gradient: 'from-amber-900/50 to-orange-900/30',
    border: 'border-amber-700/30',
  },
];

export default function Home() {
  const featuredSites = historicalSites.slice(0, 3);
  const featuredEvents = communityEvents.filter(e => e.featured).slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(#7c3aed11 1px, transparent 1px), linear-gradient(90deg, #7c3aed11 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-violet-900/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-purple-900/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-700/40 bg-violet-900/20 text-violet-300 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            AR-Powered Historical Discovery Platform
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
            Peel back the{' '}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              layers of time
            </span>
            <br />
            wherever you stand
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            SHROUD overlays the hidden history of the world onto real locations through
            augmented reality — and connects you with the community building the future of
            heritage technology.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/discover"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white font-semibold hover:from-violet-500 hover:to-purple-600 transition-all shadow-lg shadow-purple-900/40 glow-pulse"
            >
              <Compass className="w-5 h-5" />
              Start Discovering
            </Link>
            <Link
              to="/events"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/10 text-slate-300 font-semibold hover:bg-white/5 hover:border-white/20 transition-all"
            >
              <Users className="w-5 h-5" />
              Browse Events
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 mt-10 text-sm text-slate-500">
            <div className="flex -space-x-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-[#0a0a0f]"
                  style={{
                    background: `hsl(${260 + i * 20}deg 60% 50%)`,
                  }}
                />
              ))}
            </div>
            <span>94,000+ explorers worldwide</span>
            <div className="flex items-center gap-0.5 text-yellow-400">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/5 bg-[#0e0e1a] py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center">
                <div className="w-10 h-10 rounded-xl bg-violet-900/30 border border-violet-700/30 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-violet-400" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">{value}</div>
                <div className="text-sm text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Technology that reveals the{' '}
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              invisible past
            </span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            SHROUD combines augmented reality, geospatial data, and community intelligence to transform the world into a living museum.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, title, description, gradient, border }) => (
            <div
              key={title}
              className={`relative rounded-2xl border p-6 bg-gradient-to-br ${gradient} ${border} hover:border-opacity-60 transition-all`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-violet-300" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Sites */}
      <section className="py-16 bg-[#0e0e1a] border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Featured Historical Sites
              </h2>
              <p className="text-slate-400 text-sm">Explore the world's most significant landmarks</p>
            </div>
            <Link
              to="/discover"
              className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredSites.map(site => (
              <SiteCard key={site.id} site={site} featured />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-24 max-w-6xl mx-auto px-4">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Upcoming Events
            </h2>
            <p className="text-slate-400 text-sm">Hackathons, workshops, and meetups in the SHROUD community</p>
          </div>
          <Link
            to="/events"
            className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#0e0e1a] border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-900/40">
            <Compass className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to see the world differently?
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            Join thousands of explorers, historians, and hackers building the future of human memory.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/discover"
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white font-semibold hover:from-violet-500 hover:to-purple-600 transition-all shadow-lg shadow-purple-900/40"
            >
              Explore Sites
              <ChevronRight className="w-5 h-5" />
            </Link>
            <Link
              to="/events"
              className="flex items-center gap-2 px-8 py-4 rounded-xl border border-white/10 text-slate-300 font-semibold hover:bg-white/5 transition-all"
            >
              Join an Event
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-violet-400" />
            <span className="text-white font-semibold tracking-wider">SHR<span className="text-violet-400">OUD</span></span>
          </div>
          <p>© 2026 SHROUD. Open-source heritage technology.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-300 transition-colors">About</a>
            <a href="#" className="hover:text-slate-300 transition-colors">GitHub</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
