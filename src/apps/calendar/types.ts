/**
 * Calendar App Types
 */

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface AgendaSummary {
  date: Date;
  totalEvents: number;
  events: CalendarEvent[];
  busyHours: number;
  freeSlots: TimeSlot[];
}
