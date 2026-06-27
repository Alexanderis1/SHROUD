import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Globe, X } from 'lucide-react';
import { historicalSites, siteCategories } from '../data/historicalSites';
import type { SiteCategory } from '../types';
import SiteCard from '../components/SiteCard';
import clsx from 'clsx';

export default function Discover() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | SiteCategory>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'visitors' | 'name'>('rating');

  const filtered = useMemo(() => {
    let result = [...historicalSites];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q) ||
          s.country.toLowerCase().includes(q) ||
          s.era.toLowerCase().includes(q) ||
          s.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (category !== 'all') {
      result = result.filter(s => s.category === category);
    }

    result.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'visitors') return b.visitors - a.visitors;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [search, category, sortBy]);

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-10 pt-8">
          <div className="flex items-center gap-2 text-violet-400 text-sm font-medium mb-3">
            <Globe className="w-4 h-4" />
            Historical Discovery
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Explore the World's History
          </h1>
          <p className="text-slate-400 max-w-xl">
            Discover {historicalSites.length} curated historical sites with rich context, timelines, and AR-ready metadata.
          </p>
        </div>

        {/* Search + Filters */}
        <div className="sticky top-16 z-30 bg-[#0a0a0f]/90 backdrop-blur-xl pb-4 pt-2 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search sites, eras, countries…"
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

            {/* Sort */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="bg-[#12121f] border border-white/10 text-slate-300 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-600"
              >
                <option value="rating">Sort: Top Rated</option>
                <option value="visitors">Sort: Most Visited</option>
                <option value="name">Sort: A–Z</option>
              </select>
            </div>
          </div>

          {/* Category chips */}
          <div className="flex gap-2 flex-wrap mt-3">
            {siteCategories.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setCategory(id as 'all' | SiteCategory)}
                className={clsx(
                  'px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border',
                  category === id
                    ? 'bg-violet-600 text-white border-violet-500'
                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-slate-200'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-slate-500 mb-6">
          {filtered.length === historicalSites.length
            ? `Showing all ${filtered.length} sites`
            : `${filtered.length} of ${historicalSites.length} sites`}
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(site => (
              <SiteCard key={site.id} site={site} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Globe className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 font-medium mb-1">No sites found</p>
            <p className="text-slate-500 text-sm">Try adjusting your search or filters</p>
            <button
              onClick={() => { setSearch(''); setCategory('all'); }}
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
