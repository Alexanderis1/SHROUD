import { useState } from 'react';
import { MapPin, Star, Users, Clock, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import type { HistoricalSite } from '../types';
import clsx from 'clsx';

interface SiteCardProps {
  site: HistoricalSite;
  featured?: boolean;
}

export default function SiteCard({ site, featured = false }: SiteCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formatVisitors = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toString();
  };

  const categoryColors: Record<string, string> = {
    monument: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
    ruins: 'bg-rose-900/40 text-rose-300 border-rose-700/40',
    architecture: 'bg-sky-900/40 text-sky-300 border-sky-700/40',
    battlefield: 'bg-red-900/40 text-red-300 border-red-700/40',
    natural: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
    cultural: 'bg-purple-900/40 text-purple-300 border-purple-700/40',
  };

  return (
    <article
      className={clsx(
        'group relative rounded-2xl border overflow-hidden transition-all duration-300',
        'bg-[#12121f] border-white/5 hover:border-purple-700/40',
        featured ? 'ring-1 ring-violet-500/30' : '',
      )}
    >
      {/* Header gradient banner */}
      <div className={clsx('relative h-32 bg-gradient-to-br', site.imageGradient)}>
        {featured && (
          <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-600/90 text-violet-100 backdrop-blur-sm">
            Featured
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12121f] via-transparent to-transparent" />
        {/* Era badge */}
        <div className="absolute bottom-3 right-3">
          <span className="text-xs px-2.5 py-1 rounded-full bg-black/40 text-white/80 backdrop-blur-sm border border-white/10">
            {site.year}
          </span>
        </div>
      </div>

      <div className="p-5">
        {/* Title & location */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-white text-lg leading-tight group-hover:text-violet-300 transition-colors">
            {site.name}
          </h3>
          <span className={clsx(
            'shrink-0 text-xs px-2 py-0.5 rounded-full border capitalize',
            categoryColors[site.category] ?? 'bg-gray-800 text-gray-300 border-gray-600'
          )}>
            {site.category}
          </span>
        </div>

        <div className="flex items-center gap-1 text-slate-400 text-sm mb-3">
          <MapPin className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span>{site.city}, {site.country}</span>
          <span className="mx-1 text-slate-600">·</span>
          <Clock className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <span>{site.era}</span>
        </div>

        <p className="text-slate-400 text-sm leading-relaxed mb-4">
          {site.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-white font-medium">{site.rating}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Users className="w-4 h-4 text-violet-400" />
            <span>{formatVisitors(site.visitors)}/yr</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {site.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>

        {/* Expandable facts */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expanded ? 'Hide' : 'Show'} historical facts
        </button>

        {expanded && (
          <div className="mt-4 space-y-2 fade-in-up">
            <p className="text-slate-300 text-sm leading-relaxed mb-3">
              {site.longDescription}
            </p>
            <ul className="space-y-2">
              {site.facts.map((fact, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-violet-900/50 border border-violet-700/40 flex items-center justify-center text-violet-400 text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
