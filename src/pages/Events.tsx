import { useState, useMemo } from 'react';
import { Search, Calendar, X, Trophy, Users, Globe, Wifi, Building2 } from 'lucide-react';
import { communityEvents, eventTypes } from '../data/communityEvents';
import type { EventType } from '../types';
import EventCard from '../components/EventCard';
import clsx from 'clsx';

const formatIcons = {
  'in-person': Building2,
  hybrid: Wifi,
  online: Globe,
};

export default function Events() {
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState<'all' | EventType>('all');
  const [formatFilter, setFormatFilter] = useState<'all' | 'in-person' | 'hybrid' | 'online'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'attendees' | 'name'>('date');

  const filtered = useMemo(() => {
    let result = [...communityEvents];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        e =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.city.toLowerCase().includes(q) ||
          e.country.toLowerCase().includes(q) ||
          e.organizer.toLowerCase().includes(q) ||
          e.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (eventType !== 'all') {
      result = result.filter(e => e.type === eventType);
    }

    if (formatFilter !== 'all') {
      result = result.filter(e => e.format === formatFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'date') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'attendees') return b.attendees - a.attendees;
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [search, eventType, formatFilter, sortBy]);

  const hackathonCount = communityEvents.filter(e => e.type === 'hackathon').length;
  const totalPrize = communityEvents
    .filter(e => e.prize)
    .reduce((sum, e) => {
      const numeric = parseFloat((e.prize ?? '0').replace(/[^0-9.]/g, ''));
      return sum + (isNaN(numeric) ? 0 : numeric);
    }, 0);

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-10 pt-8">
          <div className="flex items-center gap-2 text-violet-400 text-sm font-medium mb-3">
            <Users className="w-4 h-4" />
            Community Events
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Hackathons & Community Gatherings
          </h1>
          <p className="text-slate-400 max-w-xl">
            Join {communityEvents.length} upcoming events — from 48-hour hackathons to expert workshops and global conferences.
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-white/5 bg-[#12121f] p-4 text-center">
            <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-white">{hackathonCount}</div>
            <div className="text-xs text-slate-400">Hackathons</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#12121f] p-4 text-center">
            <Users className="w-5 h-5 text-violet-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-white">
              {communityEvents.reduce((s, e) => s + e.attendees, 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">Total Registered</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#12121f] p-4 text-center">
            <Calendar className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-white">${(totalPrize / 1000).toFixed(0)}K+</div>
            <div className="text-xs text-slate-400">In Prizes</div>
          </div>
        </div>

        {/* Filters */}
        <div className="sticky top-16 z-30 bg-[#0a0a0f]/90 backdrop-blur-xl pb-4 pt-2 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search events, cities, organisations…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#12121f] border border-white/10 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-violet-600 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="bg-[#12121f] border border-white/10 text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-600"
            >
              <option value="date">Sort: Soonest</option>
              <option value="attendees">Sort: Most Popular</option>
              <option value="name">Sort: A–Z</option>
            </select>
          </div>

          {/* Type chips */}
          <div className="flex gap-2 flex-wrap mt-3">
            {eventTypes.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setEventType(id as 'all' | EventType)}
                className={clsx(
                  'px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border',
                  eventType === id
                    ? 'bg-violet-600 text-white border-violet-500'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-slate-200'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Format chips */}
          <div className="flex gap-2 mt-2">
            {(['all', 'in-person', 'hybrid', 'online'] as const).map(fmt => {
              const Icon = fmt !== 'all' ? formatIcons[fmt] : null;
              return (
                <button
                  key={fmt}
                  onClick={() => setFormatFilter(fmt)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border',
                    formatFilter === fmt
                      ? 'bg-cyan-700/60 text-cyan-200 border-cyan-600/40'
                      : 'bg-white/5 text-slate-500 border-white/5 hover:text-slate-300'
                  )}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {fmt === 'all' ? 'All Formats' : fmt.charAt(0).toUpperCase() + fmt.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        <div className="text-sm text-slate-500 mb-6">
          {filtered.length === communityEvents.length
            ? `Showing all ${filtered.length} events`
            : `${filtered.length} of ${communityEvents.length} events`}
        </div>

        {filtered.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium mb-1">No events found</p>
            <p className="text-slate-500 text-sm">Try adjusting your search or filters</p>
            <button
              onClick={() => { setSearch(''); setEventType('all'); setFormatFilter('all'); }}
              className="mt-4 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
