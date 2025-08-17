"use client";

import { useState, useEffect, useMemo } from "react";
import { useStaff } from "@/context/staff-context";
import { Calendar } from "@/components/ui/calendar";
import { Classroom } from "@/lib/api/classroom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Clock,
  MapPin,
  Users,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from "lucide-react";
import Link from "next/link";
import { CalendarView, ScheduledClass } from "@/types/calendar";
import { DayViewCalendar } from "./calendar/DayViewCalendar";
import { WeekViewCalendar } from "./calendar/WeekViewCalendar";
import { MonthViewCalendar } from "./calendar/MonthViewCalendar";
import { ListViewCalendar } from "./calendar/ListViewCalendar";
import { getCombinedSchedules } from "@/lib/utils/calendarUtils";

interface ClassScheduleCalendarProps {
  classrooms: Classroom[];
  initialView?: CalendarView;
  initialDate?: Date;
  onViewChange?: (view: CalendarView) => void;
  onDateChange?: (date: Date) => void;
  showAllClasses?: boolean;
}

export default function ClassScheduleCalendar({
  classrooms,
  initialView = "week",
  initialDate = new Date(),
  onViewChange,
  onDateChange,
  showAllClasses = false,
}: ClassScheduleCalendarProps) {
  const [date, setDate] = useState<Date>(initialDate);
  const [view, setView] = useState<CalendarView>(initialView);
  const [selectedClass, setSelectedClass] = useState<ScheduledClass | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [displayDates, setDisplayDates] = useState<Date[]>([]);
  const [calendarIsOpen, setCalendarIsOpen] = useState(false);
  const [autoTransition, setAutoTransition] = useState(false);
  const { staff, loading: staffLoading } = useStaff();

  // Color palette
  const colors = [
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

  const truncateDate = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

  // Handlers
  const handleDateChange = (newDate: Date) => {
    const updatedDate = new Date(newDate);
    setDate(updatedDate);
    onDateChange?.(updatedDate);
    setSelectedClass(null);
  };

  const handleViewChange = (newView: CalendarView) => {
    setView(newView);
    onViewChange?.(newView);
  };

  // Build concrete session instances for schedules inside range
  const generateSessionInstances = (
    classroomsToProcess: Classroom[],
    rangeStart: Date,
    rangeEnd: Date
  ) => {
    const subjectColorMap = new Map<string, string>();
    const sessions: ScheduledClass[] = [];
    const startDay = truncateDate(rangeStart);
    const endDay = new Date(
      rangeEnd.getFullYear(),
      rangeEnd.getMonth(),
      rangeEnd.getDate(),
      23,
      59,
      59,
      999
    );
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    const dateCache: Date[] = [];
    for (let t = startDay.getTime(); t <= endDay.getTime(); t += dayMs) {
      dateCache.push(new Date(t));
    }
    classroomsToProcess.forEach((classroom) => {
      // Access control
      if (
        !(
          showAllClasses ||
          (!staffLoading &&
            staff &&
            (classroom.teacherCode === staff?.userId ||
              (classroom.supporter &&
                classroom.supporter.includes(staff?.userId))))
        )
      ) {
        return;
      }
      if (classroom.isActive === false) return;
      const validSchedules = getCombinedSchedules(classroom);
      if (!validSchedules.length) return;
      let color = subjectColorMap.get(classroom.subjectName);
      if (!color) {
        color = colors[subjectColorMap.size % colors.length];
        subjectColorMap.set(classroom.subjectName, color);
      }
      validSchedules.forEach((schedule, schedIndex) => {
        dateCache.forEach((d) => {
          if (d.getDay() !== schedule.dayOfWeek) return;
          if (
            (schedule.validFrom && d < truncateDate(schedule.validFrom)) ||
            (schedule.validTo && d > truncateDate(schedule.validTo))
          )
            return;
          const [sHour, sMin = "0"] = schedule.beginTime.split(":");
            const [eHour, eMin = "0"] = schedule.finishTime.split(":");
          const startDateTime = new Date(d);
          startDateTime.setHours(parseInt(sHour), parseInt(sMin), 0, 0);
          const endDateTime = new Date(d);
          endDateTime.setHours(parseInt(eHour), parseInt(eMin), 0, 0);
          let status: "past" | "current" | "upcoming" = "upcoming";
          if (endDateTime < now) status = "past";
          else if (startDateTime <= now && endDateTime >= now) status = "current";
          const dateISO = d.toISOString().slice(0, 10);
          const sessionId = `${classroom.classID}-${schedIndex}-${dateISO}`;
          sessions.push({
            id: sessionId,
            classId: classroom.classID,
            subjectName: classroom.subjectName,
            roomId: schedule.classRoomCode || "N/A",
            teacherName: classroom.teacherName || "N/A",
            startTime: schedule.beginTime,
            endTime: schedule.finishTime,
            day: schedule.dayOfWeek,
            color,
            studentCount: classroom.studentNumber ?? undefined,
            status,
            dateISO,
            startDateTimeISO: startDateTime.toISOString(),
            endDateTimeISO: endDateTime.toISOString(),
          });
        });
      });
    });
    return sessions;
  };

  // Generate concrete sessions for active view/date
  const processedSchedules = useMemo(() => {
    if (staffLoading || !classrooms) return [];
    let rangeStart = new Date(date);
    let rangeEnd = new Date(date);
    if (view === "week") {
      rangeStart = new Date(date);
      rangeStart.setDate(date.getDate() - date.getDay());
      rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeStart.getDate() + 6);
    } else if (view === "month") {
      rangeStart = new Date(date.getFullYear(), date.getMonth(), 1);
      rangeEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const pre = rangeStart.getDay();
      rangeStart.setDate(rangeStart.getDate() - pre);
      const post = 6 - rangeEnd.getDay();
      rangeEnd.setDate(rangeEnd.getDate() + post);
    } else if (view === "list") {
      rangeStart = new Date(date);
      rangeStart.setDate(rangeStart.getDate() - 30);
      rangeEnd = new Date(date);
      rangeEnd.setDate(rangeEnd.getDate() + 30);
    }
    return generateSessionInstances(classrooms, rangeStart, rangeEnd);
  }, [classrooms, staff, staffLoading, showAllClasses, view, date]);

  const scheduledClasses = useMemo(() => {
    if (view === "day") {
      const targetISO = date.toISOString().slice(0, 10);
      return processedSchedules.filter((s) => s.dateISO === targetISO);
    }
    return processedSchedules;
  }, [processedSchedules, date, view]);

  useEffect(() => {
    setDisplayDates(getDisplayDates());
  }, [view, date]);


  // Handle auto-transition
  useEffect(() => {
    if (autoTransition) {
      const interval = setInterval(() => {
        const newDate = new Date(date);
        newDate.setDate(date.getDate() + 1);
        handleDateChange(newDate);
      }, 5000); // Change date every 5 seconds

      return () => clearInterval(interval);
    }
  }, [autoTransition, date, onDateChange]);

  // Handle class click
  const handleClassClick = (classItem: ScheduledClass) => {
    setSelectedClass(classItem);
    setIsDialogOpen(true);
  };

  // Get the dates to display based on the current view
  const getDisplayDates = () => {
    const dates: Date[] = [];
    const currentDate = new Date(date);

    switch (view) {
      case "day":
        dates.push(currentDate);
        break;
      case "week":
        // Get the start of the week (Sunday)
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        // Add 7 days
        for (let i = 0; i < 7; i++) {
          const newDate = new Date(startOfWeek);
          newDate.setDate(startOfWeek.getDate() + i);
          dates.push(newDate);
        }
        break;
      case "month":
        // Get the start of the month
        const startOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        // Get the day of week of the first day (0 = Sunday)
        const firstDayOfWeek = startOfMonth.getDay();
        // Get the start date (previous month's dates to fill the first week)
        const startDate = new Date(startOfMonth);
        startDate.setDate(1 - firstDayOfWeek);
        // Add 42 days (6 weeks)
        for (let i = 0; i < 42; i++) {
          const newDate = new Date(startDate);
          newDate.setDate(startDate.getDate() + i);
          dates.push(newDate);
        }
        break;
      default:
        dates.push(currentDate);
    }

    return dates;
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newDate = new Date(date);
              newDate.setDate(date.getDate() - 1);
              handleDateChange(newDate);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            onClick={() => setCalendarIsOpen(true)}
            className="w-[240px] justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(date, "PPP", { locale: vi })}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const newDate = new Date(date);
              newDate.setDate(date.getDate() + 1);
              handleDateChange(newDate);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Tabs
            value={view}
            onValueChange={(value) => handleViewChange(value as CalendarView)}
          >
            <TabsList>
              <TabsTrigger value="day">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Ngày
              </TabsTrigger>
              <TabsTrigger value="week">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Tuần
              </TabsTrigger>
              <TabsTrigger value="month">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Tháng
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="mr-2 h-4 w-4" />
                Danh sách
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Calendar view */}
      <div className="flex-1 rounded-md border">
        {view === "day" && (
          <DayViewCalendar
            date={date}
            scheduledClasses={scheduledClasses}
            onClassClick={handleClassClick}
          />
        )}
        {view === "week" && (
          <WeekViewCalendar
            displayDates={displayDates}
            scheduledClasses={scheduledClasses}
            onClassClick={handleClassClick}
          />
        )}
        {view === "month" && (
          <MonthViewCalendar
            displayDates={displayDates}
            scheduledClasses={scheduledClasses}
            onClassClick={handleClassClick}
          />
        )}
        {view === "list" && (
          <ListViewCalendar
            scheduledClasses={scheduledClasses}
            onClassClick={handleClassClick}
          />
        )}
      </div>

      {/* Class details dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedClass?.subjectName}</DialogTitle>
            <DialogDescription>
              <div className="mt-4 space-y-2">
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  <span>
                    {selectedClass?.startTime} - {selectedClass?.endTime}
                  </span>
                </div>
                <div className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  <span>Phòng: {selectedClass?.roomId}</span>
                </div>
                <div className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Giáo viên: {selectedClass?.teacherName}</span>
                </div>
                {selectedClass?.studentCount && (
                  <div className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Số học viên: {selectedClass.studentCount}</span>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end">
            <Link href={`/dashboard/classrooms/${selectedClass?.classId}`}>
              <Button>Xem </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Date picker dialog */}
      <Dialog open={calendarIsOpen} onOpenChange={setCalendarIsOpen}>
        <DialogContent>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(date) => {
              if (date) {
                handleDateChange(date);
                setCalendarIsOpen(false);
              }
            }}
            initialFocus
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
