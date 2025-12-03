/**
 * Calendar Manager Agent
 * Example app that demonstrates the framework capabilities
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type { App, AppContext, AppCommand } from '../../ports/app.js';
import type { CalendarEvent, AgendaSummary, TimeSlot } from './types.js';
import { format, startOfDay, endOfDay, isWithinInterval, addHours } from 'date-fns';

export class CalendarManagerApp implements App {
  readonly id = 'calendar-manager';
  readonly name = 'Calendar Manager Agent';
  readonly description = 'Manage your calendar, find meeting slots, and get agenda summaries';
  readonly version = '0.1.0';

  private context: AppContext | null = null;
  private events: CalendarEvent[] = [];

  readonly commands: AppCommand[] = [
    {
      name: 'agenda',
      description: 'Show today\'s agenda',
      aliases: ['today', 'summary'],
      execute: async (_args, _context) => {
        const summary = await this.getAgendaSummary(new Date());
        console.log(`\n📅 Agenda for ${format(summary.date, 'MMMM d, yyyy')}`);
        console.log(`Total events: ${summary.totalEvents}`);
        console.log(`Busy hours: ${summary.busyHours}`);
        console.log(`\nEvents:`);
        summary.events.forEach(event => {
          console.log(`  • ${format(event.startTime, 'HH:mm')} - ${event.title}`);
        });
      }
    },
    {
      name: 'add',
      description: 'Add a new event',
      execute: async (_args, _context) => {
        // This would be called from CLI with args
        console.log('Use the UI to add events');
      }
    },
    {
      name: 'slots',
      description: 'Find available meeting slots',
      execute: async (_args, _context) => {
        const slots = await this.findAvailableSlots(new Date());
        console.log('\n🕒 Available slots today:');
        slots.forEach(slot => {
          console.log(`  • ${format(slot.start, 'HH:mm')} - ${format(slot.end, 'HH:mm')}`);
        });
      }
    }
  ];

  async initialize(context: AppContext): Promise<void> {
    this.context = context;
    await this.loadEvents();
  }

  render(): React.ReactElement {
    return <CalendarUI app={this} />;
  }

  async cleanup(): Promise<void> {
    // Save any pending changes
  }

  private async loadEvents(): Promise<void> {
    if (!this.context) return;

    const keys = await this.context.storage.list('calendar/events/*');
    this.events = [];

    for (const key of keys) {
      const event = await this.context.storage.read(key);
      if (event) {
        // Parse dates from JSON
        event.startTime = new Date(event.startTime);
        event.endTime = new Date(event.endTime);
        event.createdAt = new Date(event.createdAt);
        event.updatedAt = new Date(event.updatedAt);
        this.events.push(event);
      }
    }
  }

  async addEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent> {
    if (!this.context) throw new Error('Not initialized');

    const newEvent: CalendarEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.context.storage.write(`calendar/events/${newEvent.id}`, newEvent);
    this.events.push(newEvent);

    return newEvent;
  }

  async getAgendaSummary(date: Date): Promise<AgendaSummary> {
    const start = startOfDay(date);
    const end = endOfDay(date);

    const todayEvents = this.events.filter(event =>
      isWithinInterval(event.startTime, { start, end })
    );

    const busyHours = todayEvents.reduce((total, event) => {
      const duration = (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60 * 60);
      return total + duration;
    }, 0);

    const freeSlots = await this.findAvailableSlots(date);

    return {
      date,
      totalEvents: todayEvents.length,
      events: todayEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
      busyHours,
      freeSlots
    };
  }

  async findAvailableSlots(date: Date, minDuration: number = 1): Promise<TimeSlot[]> {
    const start = startOfDay(date);
    start.setHours(9, 0, 0, 0); // Work day starts at 9 AM
    const end = startOfDay(date);
    end.setHours(17, 0, 0, 0); // Work day ends at 5 PM

    const todayEvents = this.events.filter(event =>
      isWithinInterval(event.startTime, { start, end })
    ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    const slots: TimeSlot[] = [];
    let currentTime = start;

    for (const event of todayEvents) {
      if (currentTime < event.startTime) {
        const duration = (event.startTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
        if (duration >= minDuration) {
          slots.push({
            start: currentTime,
            end: event.startTime,
            available: true
          });
        }
      }
      currentTime = new Date(Math.max(currentTime.getTime(), event.endTime.getTime()));
    }

    // Add remaining time slot if any
    if (currentTime < end) {
      const duration = (end.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
      if (duration >= minDuration) {
        slots.push({
          start: currentTime,
          end,
          available: true
        });
      }
    }

    return slots;
  }

  getEvents(): CalendarEvent[] {
    return [...this.events];
  }
}

// UI Component
const CalendarUI: React.FC<{ app: CalendarManagerApp }> = ({ app }) => {
  const [view, setView] = useState<'agenda' | 'add' | 'slots'>('agenda');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [newEventTitle, setNewEventTitle] = useState('');

  useEffect(() => {
    setEvents(app.getEvents());
  }, [app]);

  const handleAddEvent = async () => {
    if (!newEventTitle.trim()) return;

    const now = new Date();
    await app.addEvent({
      title: newEventTitle,
      startTime: now,
      endTime: addHours(now, 1),
      description: '',
      tags: []
    });

    setNewEventTitle('');
    setEvents(app.getEvents());
    setView('agenda');
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">📅 Calendar Manager Agent</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          [1] Agenda  [2] Add Event  [3] Find Slots  [q] Quit
        </Text>
      </Box>

      {view === 'agenda' && (
        <Box flexDirection="column">
          <Text bold>Today's Agenda:</Text>
          {events.length > 0 ? (
            events.map(event => (
              <Box key={event.id} marginTop={1}>
                <Text>
                  {format(event.startTime, 'HH:mm')} - {event.title}
                </Text>
              </Box>
            ))
          ) : (
            <Text dimColor>No events scheduled</Text>
          )}
        </Box>
      )}

      {view === 'add' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold>Add New Event:</Text>
          </Box>
          <Box>
            <Text>Title: </Text>
            <TextInput value={newEventTitle} onChange={setNewEventTitle} onSubmit={handleAddEvent} />
          </Box>
        </Box>
      )}

      {view === 'slots' && (
        <Box flexDirection="column">
          <Text bold>Finding available slots...</Text>
          <Text dimColor>(Feature in development)</Text>
        </Box>
      )}
    </Box>
  );
};

// Export the app instance
export default new CalendarManagerApp();
