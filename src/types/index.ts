export interface HistoricalSite {
  id: string;
  name: string;
  era: string;
  year: string;
  description: string;
  longDescription: string;
  lat: number;
  lng: number;
  category: SiteCategory;
  tags: string[];
  imageGradient: string;
  facts: string[];
  rating: number;
  visitors: number;
  city: string;
  country: string;
}

export type SiteCategory =
  | 'monument'
  | 'battlefield'
  | 'ruins'
  | 'architecture'
  | 'natural'
  | 'cultural';

export interface CommunityEvent {
  id: string;
  title: string;
  type: EventType;
  description: string;
  longDescription: string;
  date: string;
  time: string;
  location: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  organizer: string;
  attendees: number;
  maxAttendees: number;
  tags: string[];
  prize?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'all-levels';
  format: 'in-person' | 'hybrid' | 'online';
  imageGradient: string;
  featured: boolean;
}

export type EventType =
  | 'hackathon'
  | 'workshop'
  | 'meetup'
  | 'conference'
  | 'exhibition'
  | 'competition';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'site' | 'event';
  label: string;
}
