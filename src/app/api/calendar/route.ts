import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import { FamilyMember } from '@/models/FamilyMember';
import { Event } from '@/models/Event';
import { Family } from '@/models/Family';
import { getCurrentUser, canAccessFamily } from '@/lib/auth';
import { UserRole, VisibilityStatus, ContentStatus } from '@/types';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  isValidObjectId,
} from '@/lib/utils';

interface CalendarEvent {
  id: string;
  type: 'birthday' | 'anniversary' | 'memorial' | 'event';
  title: string;
  date: Date;
  recurring: boolean;
  memberId?: string;
  memberName?: string;
  memberPhoto?: string;
  eventId?: string;
  age?: number;
  isToday: boolean;
  isUpcoming: boolean;
  daysUntil: number;
}

// GET /api/calendar - Get calendar events (birthdays, anniversaries, events)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const month = searchParams.get('month'); // 1-12
    const year = searchParams.get('year');
    const type = searchParams.get('type'); // 'birthday', 'anniversary', 'memorial', 'event', or 'all'
    const upcoming = searchParams.get('upcoming'); // days ahead to look

    if (!familyId || !isValidObjectId(familyId)) {
      return errorResponse('Valid family ID is required', 400);
    }

    await connectDB();

    const family = await Family.findById(familyId);
    if (!family) {
      return notFoundResponse('Family');
    }

    // Check access
    const isPublic = family.visibility === VisibilityStatus.PUBLIC;
    const canAccess = canAccessFamily(
      user?.role || UserRole.GUEST,
      user?.familyId,
      familyId,
      isPublic
    );

    if (!canAccess) {
      return forbiddenResponse('You do not have access to this family');
    }

    const now = new Date();
    const currentYear = parseInt(year || String(now.getFullYear()), 10);
    const currentMonth = month ? parseInt(month, 10) : null;
    const upcomingDays = upcoming ? parseInt(upcoming, 10) : 30;

    const calendarEvents: CalendarEvent[] = [];

    // Get all active family members
    const members = await FamilyMember.find({
      familyId,
      isDeleted: false,
      status: ContentStatus.APPROVED,
    }).lean();

    // Process birthdays
    if (!type || type === 'all' || type === 'birthday') {
      for (const member of members) {
        if (member.dateOfBirth && !member.isDeceased) {
          const birthDate = new Date(member.dateOfBirth);
          const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

          // Check if matches month filter
          if (currentMonth && birthDate.getMonth() + 1 !== currentMonth) {
            continue;
          }

          const age = currentYear - birthDate.getFullYear();
          const daysUntil = Math.ceil((birthdayThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isToday = daysUntil === 0;
          const isUpcoming = daysUntil > 0 && daysUntil <= upcomingDays;

          // If birthday has passed this year, calculate for next year
          let adjustedDaysUntil = daysUntil;
          if (daysUntil < 0) {
            const birthdayNextYear = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
            adjustedDaysUntil = Math.ceil((birthdayNextYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          }

          calendarEvents.push({
            id: `birthday-${member._id}`,
            type: 'birthday',
            title: `${member.firstName} ${member.lastName}'s Birthday`,
            date: birthdayThisYear,
            recurring: true,
            memberId: member._id.toString(),
            memberName: `${member.firstName} ${member.lastName}`,
            memberPhoto: member.photo,
            age: isToday || daysUntil >= 0 ? age : age + 1,
            isToday,
            isUpcoming,
            daysUntil: adjustedDaysUntil,
          });
        }
      }
    }

    // Process death anniversaries (memorials)
    if (!type || type === 'all' || type === 'memorial') {
      for (const member of members) {
        if (member.dateOfDeath) {
          const deathDate = new Date(member.dateOfDeath);
          const memorialThisYear = new Date(currentYear, deathDate.getMonth(), deathDate.getDate());

          if (currentMonth && deathDate.getMonth() + 1 !== currentMonth) {
            continue;
          }

          const yearsSince = currentYear - deathDate.getFullYear();
          const daysUntil = Math.ceil((memorialThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isToday = daysUntil === 0;
          const isUpcoming = daysUntil > 0 && daysUntil <= upcomingDays;

          let adjustedDaysUntil = daysUntil;
          if (daysUntil < 0) {
            const memorialNextYear = new Date(currentYear + 1, deathDate.getMonth(), deathDate.getDate());
            adjustedDaysUntil = Math.ceil((memorialNextYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          }

          calendarEvents.push({
            id: `memorial-${member._id}`,
            type: 'memorial',
            title: `${member.firstName} ${member.lastName}'s Memorial`,
            date: memorialThisYear,
            recurring: true,
            memberId: member._id.toString(),
            memberName: `${member.firstName} ${member.lastName}`,
            memberPhoto: member.photo,
            age: yearsSince,
            isToday,
            isUpcoming,
            daysUntil: adjustedDaysUntil,
          });
        }
      }
    }

    // Process events
    if (!type || type === 'all' || type === 'event') {
      const eventQuery: Record<string, unknown> = {
        familyId,
        isDeleted: false,
        status: ContentStatus.APPROVED,
      };

      // Filter by month/year if specified
      if (currentMonth) {
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
        const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
        eventQuery.startDate = { $gte: startOfMonth, $lte: endOfMonth };
      } else if (upcoming) {
        const endDate = new Date(now.getTime() + upcomingDays * 24 * 60 * 60 * 1000);
        eventQuery.startDate = { $gte: now, $lte: endDate };
      }

      const events = await Event.find(eventQuery)
        .sort({ startDate: 1 })
        .lean();

      for (const event of events) {
        const daysUntil = Math.ceil((new Date(event.startDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const isToday = daysUntil === 0;
        const isUpcoming = daysUntil > 0 && daysUntil <= upcomingDays;

        calendarEvents.push({
          id: `event-${event._id}`,
          type: 'event',
          title: event.title,
          date: event.startDate,
          recurring: false,
          eventId: event._id.toString(),
          isToday,
          isUpcoming,
          daysUntil,
        });
      }
    }

    // Sort by days until
    calendarEvents.sort((a, b) => {
      // Today first, then upcoming by days
      if (a.isToday && !b.isToday) return -1;
      if (!a.isToday && b.isToday) return 1;
      return a.daysUntil - b.daysUntil;
    });

    // Summary stats
    const stats = {
      total: calendarEvents.length,
      today: calendarEvents.filter(e => e.isToday).length,
      upcoming: calendarEvents.filter(e => e.isUpcoming).length,
      birthdays: calendarEvents.filter(e => e.type === 'birthday').length,
      memorials: calendarEvents.filter(e => e.type === 'memorial').length,
      events: calendarEvents.filter(e => e.type === 'event').length,
    };

    return successResponse({
      events: calendarEvents,
      stats,
      filters: {
        month: currentMonth,
        year: currentYear,
        type: type || 'all',
        upcomingDays,
      },
    });
  } catch (error) {
    console.error('Calendar error:', error);
    return errorResponse('Failed to get calendar events', 500);
  }
}

// GET /api/calendar/today - Get today's events and upcoming
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return unauthorizedResponse();
    }

    if (!user.familyId) {
      return forbiddenResponse('You must belong to a family');
    }

    await connectDB();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get members with birthdays today
    const members = await FamilyMember.find({
      familyId: user.familyId,
      isDeleted: false,
      status: ContentStatus.APPROVED,
      isDeceased: false,
    }).lean();

    const todayBirthdays: Array<{ member: typeof members[0]; age: number }> = [];
    const upcomingBirthdays: Array<{ member: typeof members[0]; age: number; daysUntil: number }> = [];

    for (const member of members) {
      if (member.dateOfBirth) {
        const birthDate = new Date(member.dateOfBirth);
        const birthdayThisYear = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        const age = now.getFullYear() - birthDate.getFullYear();

        if (birthdayThisYear >= todayStart && birthdayThisYear <= todayEnd) {
          todayBirthdays.push({ member, age });
        } else if (birthdayThisYear > todayEnd && birthdayThisYear <= weekFromNow) {
          const daysUntil = Math.ceil((birthdayThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          upcomingBirthdays.push({ member, age, daysUntil });
        }
      }
    }

    // Get events happening today
    const todayEvents = await Event.find({
      familyId: user.familyId,
      isDeleted: false,
      status: ContentStatus.APPROVED,
      startDate: { $gte: todayStart, $lte: todayEnd },
    }).lean();

    // Get upcoming events this week
    const upcomingEvents = await Event.find({
      familyId: user.familyId,
      isDeleted: false,
      status: ContentStatus.APPROVED,
      startDate: { $gt: todayEnd, $lte: weekFromNow },
    }).sort({ startDate: 1 }).lean();

    return successResponse({
      today: {
        birthdays: todayBirthdays.map(b => ({
          memberId: b.member._id.toString(),
          name: `${b.member.firstName} ${b.member.lastName}`,
          photo: b.member.photo,
          age: b.age,
        })),
        events: todayEvents.map(e => ({
          id: e._id.toString(),
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate,
          isAllDay: e.isAllDay,
        })),
      },
      upcoming: {
        birthdays: upcomingBirthdays.map(b => ({
          memberId: b.member._id.toString(),
          name: `${b.member.firstName} ${b.member.lastName}`,
          photo: b.member.photo,
          age: b.age,
          daysUntil: b.daysUntil,
        })),
        events: upcomingEvents.map(e => ({
          id: e._id.toString(),
          title: e.title,
          startDate: e.startDate,
          endDate: e.endDate,
          isAllDay: e.isAllDay,
          daysUntil: Math.ceil((new Date(e.startDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        })),
      },
    });
  } catch (error) {
    console.error('Today calendar error:', error);
    return errorResponse('Failed to get today\'s calendar', 500);
  }
}
