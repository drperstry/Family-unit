'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Header, Sidebar, MobileNav, MinimalFooter } from '@/components/layout';
import { Button, Card, Badge, Loading, EmptyState, Modal } from '@/components/ui';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Filter,
  Grid3X3,
  List,
} from 'lucide-react';

interface FamilyEvent {
  _id: string;
  title: string;
  description?: string;
  type: 'birthday' | 'anniversary' | 'reunion' | 'ceremony' | 'holiday' | 'other';
  startDate: string;
  endDate?: string;
  allDay: boolean;
  location?: {
    name?: string;
    address?: string;
  };
  attendees?: string[];
  recurring?: {
    frequency: 'yearly' | 'monthly' | 'weekly';
    until?: string;
  };
  createdBy: string;
}

type ViewMode = 'calendar' | 'list';

const EVENT_COLORS: Record<string, string> = {
  birthday: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800',
  anniversary: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  reunion: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  ceremony: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  holiday: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  other: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};

export default function EventsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedEvent, setSelectedEvent] = useState<FamilyEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user?.familyId) {
      fetchEvents();
    }
  }, [authLoading, isAuthenticated, user, router]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/families/${user?.familyId}/events`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.data?.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysCount; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month days to complete the grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.type === filterType);
    }
    return filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [events, filterType]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return filteredEvents.filter(e => new Date(e.startDate) >= now).slice(0, 5);
  }, [filteredEvents]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <Sidebar userRole={user?.role} />

      <main className="lg:pl-64 pt-16 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Family Events
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Keep track of birthdays, anniversaries, reunions, and more
              </p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Calendar/List View */}
            <div className="lg:col-span-3">
              <Card className="overflow-hidden">
                {/* Calendar Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h2>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigateMonth('prev')}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => navigateMonth('next')}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                      <Button variant="outline" size="sm" onClick={goToToday}>
                        Today
                      </Button>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                      >
                        <option value="all">All Events</option>
                        <option value="birthday">Birthdays</option>
                        <option value="anniversary">Anniversaries</option>
                        <option value="reunion">Reunions</option>
                        <option value="ceremony">Ceremonies</option>
                        <option value="holiday">Holidays</option>
                        <option value="other">Other</option>
                      </select>

                      <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setViewMode('calendar')}
                          className={`p-2 ${viewMode === 'calendar' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                          <Grid3X3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`p-2 ${viewMode === 'list' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {viewMode === 'calendar' ? (
                  <div className="p-4">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div
                          key={day}
                          className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {daysInMonth.map(({ date, isCurrentMonth }, index) => {
                        const dayEvents = getEventsForDate(date);
                        const today = isToday(date);

                        return (
                          <div
                            key={index}
                            className={`min-h-[100px] p-2 border rounded-lg ${
                              isCurrentMonth
                                ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                                : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800'
                            } ${today ? 'ring-2 ring-amber-500' : ''}`}
                          >
                            <div
                              className={`text-sm font-medium mb-1 ${
                                today
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : isCurrentMonth
                                  ? 'text-gray-900 dark:text-white'
                                  : 'text-gray-400 dark:text-gray-600'
                              }`}
                            >
                              {date.getDate()}
                            </div>

                            <div className="space-y-1">
                              {dayEvents.slice(0, 3).map((event) => (
                                <button
                                  key={event._id}
                                  onClick={() => setSelectedEvent(event)}
                                  className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate border ${EVENT_COLORS[event.type]}`}
                                >
                                  {event.title}
                                </button>
                              ))}
                              {dayEvents.length > 3 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                                  +{dayEvents.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredEvents.length === 0 ? (
                      <div className="p-8">
                        <EmptyState
                          icon={CalendarIcon}
                          title="No Events"
                          description="No events scheduled yet. Add your first family event!"
                        />
                      </div>
                    ) : (
                      filteredEvents.map((event) => (
                        <div
                          key={event._id}
                          onClick={() => setSelectedEvent(event)}
                          className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                        >
                          <div className="flex items-start gap-4">
                            <div className="text-center min-w-[60px]">
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {new Date(event.startDate).getDate()}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short' })}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {event.title}
                                </h3>
                                <Badge variant="secondary" size="sm" className="capitalize">
                                  {event.type}
                                </Badge>
                              </div>

                              {event.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                                  {event.description}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                {!event.allDay && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatTime(event.startDate)}
                                  </span>
                                )}
                                {event.location?.name && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {event.location.name}
                                  </span>
                                )}
                                {event.attendees && event.attendees.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5" />
                                    {event.attendees.length} attending
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Upcoming Events */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Upcoming Events
                </h3>
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No upcoming events
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map((event) => (
                      <button
                        key={event._id}
                        onClick={() => setSelectedEvent(event)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${EVENT_COLORS[event.type].split(' ')[0]}`} />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                              {event.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(event.startDate)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              {/* Event Types Legend */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Event Types
                </h3>
                <div className="space-y-2">
                  {Object.entries(EVENT_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${color.split(' ')[0]}`} />
                      <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                        {type}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Event Detail Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title || ''}
      >
        {selectedEvent && (
          <div className="space-y-4">
            <Badge variant="secondary" className="capitalize">
              {selectedEvent.type}
            </Badge>

            {selectedEvent.description && (
              <p className="text-gray-600 dark:text-gray-300">
                {selectedEvent.description}
              </p>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-200">
                  {formatDate(selectedEvent.startDate)}
                  {!selectedEvent.allDay && ` at ${formatTime(selectedEvent.startDate)}`}
                </span>
              </div>

              {selectedEvent.location?.name && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-200">
                    {selectedEvent.location.name}
                    {selectedEvent.location.address && `, ${selectedEvent.location.address}`}
                  </span>
                </div>
              )}

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-200">
                    {selectedEvent.attendees.length} people attending
                  </span>
                </div>
              )}

              {selectedEvent.recurring && (
                <div className="flex items-center gap-3 text-sm">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-200">
                    Repeats {selectedEvent.recurring.frequency}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1">
                Edit
              </Button>
              <Button className="flex-1">
                RSVP
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <MobileNav />
      <div className="hidden lg:block">
        <MinimalFooter />
      </div>
    </div>
  );
}
