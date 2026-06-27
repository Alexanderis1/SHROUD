import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Compass, Globe, Users, Map } from 'lucide-react';
import clsx from 'clsx';

const navLinks = [
  { to: '/', label: 'Home', icon: Compass },
  { to: '/discover', label: 'Discover', icon: Globe },
  { to: '/events', label: 'Events', icon: Users },
  { to: '/map', label: 'Map', icon: Map },
];

export default function Navbar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-purple-900/30 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-900/40 group-hover:shadow-purple-700/60 transition-shadow">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-wider">
              SHR<span className="text-violet-400">OUD</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={clsx(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  location.pathname === to
                    ? 'text-violet-300 bg-violet-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2">
              Sign in
            </button>
            <button className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-700 text-white hover:from-violet-500 hover:to-purple-600 transition-all shadow-lg shadow-purple-900/30">
              Get Started
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-purple-900/30 bg-[#0a0a0f]/95 backdrop-blur-xl px-4 py-4 space-y-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={clsx(
                'flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                location.pathname === to
                  ? 'text-violet-300 bg-violet-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <div className="pt-3 border-t border-purple-900/30 flex flex-col gap-2">
            <button className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2 text-left">
              Sign in
            </button>
            <button className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-700 text-white text-center">
              Get Started
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
