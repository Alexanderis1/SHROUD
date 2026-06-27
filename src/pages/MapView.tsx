import { useState } from 'react';
import { Map, Globe, Users, Info } from 'lucide-react';
import { historicalSites } from '../data/historicalSites';
import { communityEvents } from '../data/communityEvents';
import InteractiveMap from '../components/InteractiveMap';
import clsx from 'clsx';

type Layer = 'both' | 'sites' | 'events';

export default function MapView() {
  const [layer, setLayer] = useState<Layer>('both');

  const sites = layer === 'events' ? [] : historicalSites;
  const events = layer === 'sites' ? [] : communityEvents;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 pt-8">
          <div className="flex items-center gap-2 text-violet-400 text-sm font-medium mb-3">
            <Map className="w-4 h-4" />
            World Map
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Explore the SHROUD World Map
          </h1>
          <p className="text-slate-400 max-w-xl">
            Visualise historical sites and community events across the globe. Click any marker for details.
          </p>
        </div>

        {/* Layer controls */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-sm text-slate-400 font-medium">Show layers:</span>
          {([
            { id: 'both', label: 'Everything', icon: Globe },
            { id: 'sites', label: 'Historical Sites', icon: Globe },
            { id: 'events', label: 'Events', icon: Users },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setLayer(id)}
              className={clsx(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border',
                layer === id
                  ? 'bg-violet-600 text-white border-violet-500'
                  : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-slate-200'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Map */}
        <InteractiveMap
          sites={sites}
          events={events}
          center={[25, 15]}
          zoom={2}
          height="600px"
        />

        {/* Info panel */}
        <div className="mt-6 p-4 rounded-xl bg-[#12121f] border border-white/5 flex items-start gap-3">
          <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-slate-300 font-medium mb-1">Map tips</p>
            <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
              <li>Click any marker to see details about the site or event</li>
              <li>
                <span className="text-violet-400 font-medium">Purple markers</span> = Historical sites,{' '}
                <span className="text-cyan-400 font-medium">Cyan markers</span> = Community events
              </li>
              <li>Scroll or pinch to zoom, click and drag to pan</li>
              <li>Showing {historicalSites.length} sites and {communityEvents.filter(e => e.format !== 'online').length} in-person events</li>
            </ul>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Sites on map', value: historicalSites.length, color: 'text-violet-400' },
            { label: 'Countries', value: new Set(historicalSites.map(s => s.country)).size, color: 'text-violet-400' },
            { label: 'Events mapped', value: communityEvents.filter(e => e.format !== 'online').length, color: 'text-cyan-400' },
            { label: 'Event cities', value: new Set(communityEvents.filter(e => e.format !== 'online').map(e => e.city)).size, color: 'text-cyan-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-white/5 bg-[#12121f] p-4 text-center">
              <div className={`text-2xl font-bold ${color} mb-1`}>{value}</div>
              <div className="text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
