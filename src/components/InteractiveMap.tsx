import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { HistoricalSite, CommunityEvent } from '../types';

interface InteractiveMapProps {
  sites?: HistoricalSite[];
  events?: CommunityEvent[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}

const createSiteIcon = () =>
  L.divIcon({
    className: '',
    html: `<div style="
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #c4b5fd;
      box-shadow: 0 0 12px #7c3aed99;
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });

const createEventIcon = () =>
  L.divIcon({
    className: '',
    html: `<div style="
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #0891b2, #06b6d4);
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #67e8f9;
      box-shadow: 0 0 12px #0891b299;
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });

export default function InteractiveMap({
  sites = [],
  events = [],
  center = [30, 10],
  zoom = 2,
  height = '500px',
}: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add site markers
    sites.forEach(site => {
      const marker = L.marker([site.lat, site.lng], { icon: createSiteIcon() }).addTo(map);
      marker.bindPopup(`
        <div style="min-width: 200px;">
          <div style="font-weight: 600; font-size: 14px; color: #c4b5fd; margin-bottom: 4px;">${site.name}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">${site.city}, ${site.country}</div>
          <div style="font-size: 11px; color: #7c3aed; font-weight: 500; margin-bottom: 4px;">${site.era} · ${site.year}</div>
          <div style="font-size: 12px; color: #cbd5e1; line-height: 1.4;">${site.description}</div>
          <div style="margin-top: 8px; display: flex; align-items: center; gap: 4px;">
            <span style="font-size: 12px; color: #fbbf24;">★</span>
            <span style="font-size: 12px; color: #e2e8f0; font-weight: 500;">${site.rating}</span>
          </div>
        </div>
      `);
    });

    // Add event markers
    events.forEach(event => {
      if (event.format === 'online') return;
      const marker = L.marker([event.lat, event.lng], { icon: createEventIcon() }).addTo(map);
      const date = new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      marker.bindPopup(`
        <div style="min-width: 200px;">
          <div style="font-weight: 600; font-size: 14px; color: #67e8f9; margin-bottom: 4px;">${event.title}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">${event.city}, ${event.country}</div>
          <div style="font-size: 11px; color: #0891b2; font-weight: 500; margin-bottom: 4px;">${date} · ${event.type}</div>
          <div style="font-size: 12px; color: #cbd5e1; line-height: 1.4;">${event.description}</div>
          ${event.prize ? `<div style="margin-top: 6px; font-size: 12px; color: #fbbf24; font-weight: 600;">Prize: ${event.prize}</div>` : ''}
        </div>
      `);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ height }} className="rounded-2xl overflow-hidden border border-white/10 relative">
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-[#0a0a0f]/90 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 z-[1000]">
        <div className="flex items-center gap-4 text-xs text-slate-300">
          {sites.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-violet-500 shadow-[0_0_6px_#7c3aed]" />
              <span>Historical Sites</span>
            </div>
          )}
          {events.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_6px_#0891b2]" />
              <span>Events</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
