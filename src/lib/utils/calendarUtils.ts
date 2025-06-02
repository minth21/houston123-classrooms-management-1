import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Classroom } from "@/lib/api/classroom";
import { ScheduledClass, ValidSchedule } from "@/types/calendar";

// Days of week in Vietnamese
export const DAYS_OF_WEEK = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

// Day abbreviations in Vietnamese
export const DAYS_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

// Hour slots for the schedule (5AM to 10PM)
export const HOURS = Array.from({ length: 18 }, (_, i) => i + 5);

// Enhanced color palette with better contrast and more distinct colors
export const colors = [
  "bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200",
  "bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200",
  "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200",
  "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200",
  "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200",
  "bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200",
  "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200",
  "bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200",
  "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 hover:bg-fuchsia-200",
  "bg-lime-100 text-lime-800 border-lime-300 hover:bg-lime-200",
];

export const getClassTimePeriod = (startTime: string, endTime: string) => {
  const [startHourStr, startMinuteStr] = startTime.split(":");
  const [endHourStr, endMinuteStr] = endTime.split(":");
  
  const startHour = parseInt(startHourStr);
  const startMinute = parseInt(startMinuteStr || "0");
  const endHour = parseInt(endHourStr);
  const endMinute = parseInt(endMinuteStr || "0");
  
  // Calculate duration in hours (as decimal)
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  const durationMinutes = endTotalMinutes - startTotalMinutes;
  
  return durationMinutes / 60; // Return duration in hours
};

export const getClassPosition = (startTime: string) => {
  const [hourStr, minuteStr] = startTime.split(":");
  const hour = parseInt(hourStr);
  const minute = parseInt(minuteStr || "0");
  
  // Convert to minutes from 5:00 AM (start of calendar)
  const totalMinutes = (hour - 5) * 60 + minute;
  // Each hour slot is 4rem (64px), so calculate position in rem
  // 60 minutes = 4rem, so 1 minute = 4/60 rem
  return (totalMinutes * 4) / 60;
};

export const getClassesForDate = (date: Date, classes: ScheduledClass[]) => {
  return classes.filter(
    (classItem) => classItem.day === date.getDay()
  );
};

export const formatTime = (time: string) => {
  return format(new Date(`2000-01-01T${time}`), "HH:mm", { locale: vi });
};

export const getDayClassGroups = (dayClasses: ScheduledClass[]) => {
  const groups: ScheduledClass[][] = [];
  let currentGroup: ScheduledClass[] = [];

  dayClasses.forEach((classItem) => {
    if (currentGroup.length === 0) {
      currentGroup.push(classItem);
    } else {
      const lastClass = currentGroup[currentGroup.length - 1];
      if (
        lastClass.startTime === classItem.startTime &&
        lastClass.endTime === classItem.endTime
      ) {
        currentGroup.push(classItem);
      } else {
        groups.push([...currentGroup]);
        currentGroup = [classItem];
      }
    }
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
};

export const isUpcoming = (classTime: string, dayOfWeek: number) => {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const classHour = parseInt(classTime.split(":")[0]);

  if (dayOfWeek > currentDay) return "upcoming";
  if (dayOfWeek < currentDay) return "past";
  if (classHour > currentHour) return "upcoming";
  if (classHour < currentHour) return "past";
  return "current";
};

export const isDateInRange = (
  date: Date,
  startDate: Date | null,
  endDate: Date | null
): boolean => {
  if (!startDate && !endDate) return true;
  if (!startDate) return date <= endDate!;
  if (!endDate) return date >= startDate;
  return date >= startDate && date <= endDate;
};

export const getCombinedSchedules = (classroom: Classroom): ValidSchedule[] => {
  const schedules: ValidSchedule[] = [];
  const seenSchedules = new Set<string>(); // Track unique day+time combinations

  // Prioritize regular schedules first
  if (classroom.schedule && Array.isArray(classroom.schedule)) {
    classroom.schedule.forEach((schedule) => {
      // Check if we have valid time data
      if (schedule.beginTime && schedule.finishTime && schedule.dayOfWeek !== undefined) {
        const scheduleKey = `${schedule.dayOfWeek}-${schedule.beginTime}-${schedule.finishTime}`;
        
        if (!seenSchedules.has(scheduleKey)) {
          const validSchedule = {
            classRoomCode: schedule.classRoomCode || null,
            dayOfWeek: schedule.dayOfWeek,
            beginTime: schedule.beginTime,
            finishTime: schedule.finishTime,
            validFrom: classroom.startDate ? new Date(classroom.startDate) : null,
            validTo: classroom.finishDate ? new Date(classroom.finishDate) : null,
            type: "schedule" as const,
          };
          schedules.push(validSchedule);
          seenSchedules.add(scheduleKey);
        }
      }
    });
  }

  // Add school shifts only if they don't conflict with regular schedules
  if (classroom.schoolShift && Array.isArray(classroom.schoolShift)) {
    classroom.schoolShift.forEach((shift) => {
      // Check if we have valid time data
      if (shift.startTime && shift.endTime && shift.day !== undefined) {
        const scheduleKey = `${shift.day}-${shift.startTime}-${shift.endTime}`;
        
        // Only add if we haven't seen this day+time combination
        if (!seenSchedules.has(scheduleKey)) {
          const validSchedule = {
            classRoomCode: shift.roomId || null,
            dayOfWeek: shift.day,
            beginTime: shift.startTime,
            finishTime: shift.endTime,
            validFrom: shift.date ? new Date(shift.date) : (classroom.startDate ? new Date(classroom.startDate) : null),
            validTo: shift.expiryDate ? new Date(shift.expiryDate) : (classroom.finishDate ? new Date(classroom.finishDate) : null),
            type: "schoolShift" as const,
          };
          schedules.push(validSchedule);
          seenSchedules.add(scheduleKey);
        }
      }
    });
  }

  return schedules;
};