import { Calendar, MapPin, Users, Trophy, Tag, Globe, Wifi, Building2 } from 'lucide-react';
import type { CommunityEvent } from '../types';
import clsx from 'clsx';

interface EventCardProps {
  event: CommunityEvent;
}

const typeConfig: Record<string, { label: string; color: string }> = {
  hackathon: { label: 'Hackathon', color: 'bg-violet-900/40 text-violet-300 border-violet-700/40' },
  workshop: { label: 'Workshop', color: 'bg-blue-900/40 text-blue-300 border-blue-700/40' },
  meetup: { label: 'Meetup', color: 'bg-teal-900/40 text-teal-300 border-teal-700/40' },
  conference: { label: 'Conference', color: 'bg-amber-900/40 text-amber-300 border-amber-700/40' },
  exhibition: { label: 'Exhibition', color: 'bg-rose-900/40 text-rose-300 border-rose-700/40' },
  competition: { label: 'Competition', color: 'bg-orange-900/40 text-orange-300 border-orange-700/40' },
};

const difficultyConfig: Record<string, string> = {
  beginner: 'text-green-400',
  intermediate: 'text-yellow-400',
  advanced: 'text-red-400',
  'all-levels': 'text-slate-400',
};

const formatConfig: Record<string, { icon: React.ElementType; label: string }> = {
  'in-person': { icon: Building2, label: 'In-Person' },
  hybrid: { icon: Wifi, label: 'Hybrid' },
  online: { icon: Globe, label: 'Online' },
};

export default function EventCard({ event }: EventCardProps) {
  const spotsLeft = event.maxAttendees - event.attendees;
  const fillPercent = Math.min((event.attendees / event.maxAttendees) * 100, 100);
  const type = typeConfig[event.type] ?? { label: event.type, color: 'bg-gray-800 text-gray-300 border-gray-600' };
  const FormatIcon = formatConfig[event.format]?.icon ?? Globe;
  const formatLabel = formatConfig[event.format]?.label ?? event.format;

  const formattedDate = new Date(event.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <article className={clsx(
      'group relative rounded-2xl border overflow-hidden transition-all duration-300',
      'bg-[#12121f] border-white/5 hover:border-purple-700/40',
      event.featured ? 'ring-1 ring-violet-500/30' : ''
    )}>
      {/* Header */}
      <div className={clsx('relative h-28 bg-gradient-to-br', event.imageGradient)}>
        {event.featured && (
          <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-600/90 text-violet-100 backdrop-blur-sm">
            Featured
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12121f] via-transparent to-transparent" />
        <div className="absolute top-3 right-3">
          <span className={clsx('text-xs px-2.5 py-1 rounded-full border', type.color)}>
            {type.label}
          </span>
        </div>
        {event.prize && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-300">{event.prize}</span>
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-semibold text-white text-lg leading-tight mb-1 group-hover:text-violet-300 transition-colors">
          {event.title}
        </h3>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400 mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-violet-400" />
            {formattedDate} · {event.time}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-violet-400" />
            {event.city}{event.country !== 'Online' ? `, ${event.country}` : ''}
          </span>
          <span className="flex items-center gap-1">
            <FormatIcon className="w-3.5 h-3.5 text-violet-400" />
            {formatLabel}
          </span>
        </div>

        <p className="text-slate-400 text-sm leading-relaxed mb-4">
          {event.description}
        </p>

        {/* Attendee bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-violet-400" />
              {event.attendees.toLocaleString()} registered
            </span>
            <span className={spotsLeft < 50 ? 'text-red-400 font-medium' : ''}>
              {spotsLeft > 0 ? `${spotsLeft.toLocaleString()} spots left` : 'Full'}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all',
                fillPercent > 90 ? 'bg-red-500' : fillPercent > 70 ? 'bg-amber-500' : 'bg-violet-500'
              )}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {event.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5"
            >
              <Tag className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="text-xs text-slate-500">
            by <span className="text-slate-300">{event.organizer}</span>
          </div>
          {event.difficulty && (
            <span className={clsx('text-xs font-medium capitalize', difficultyConfig[event.difficulty] ?? 'text-slate-400')}>
              {event.difficulty.replace('-', ' ')}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
