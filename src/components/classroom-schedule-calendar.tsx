"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useStaff } from "@/context/staff-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Classroom } from "@/lib/api/classroom";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Clock,
  MapPin,
  Users,
  BookOpen,
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
import { getCombinedSchedules, isDateInRange, isUpcoming } from "@/lib/utils/calendarUtils";

// Days of week in Vietnamese
const DAYS_OF_WEEK = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

// Day abbreviations in Vietnamese
const DAYS_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

// Hour slots for the schedule (5AM to 10PM)
const HOURS = Array.from({ length: 18 }, (_, i) => i + 5);

interface ValidSchedule {
  classRoomCode: string | null;
  dayOfWeek: number;
  beginTime: string;
  finishTime: string;
  validFrom: Date | null;
  validTo: Date | null;
  type: "schedule" | "schoolShift";
}

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
  const [selectedClass, setSelectedClass] = useState<ScheduledClass | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [displayDates, setDisplayDates] = useState<Date[]>([]);
  const [calendarIsOpen, setCalendarIsOpen] = useState(false);
  const [autoTransition, setAutoTransition] = useState(false);
  const autoTransitionInterval = useRef<NodeJS.Timeout | undefined>(undefined);
  const { staff, loading: staffLoading } = useStaff();

  // Enhanced color palette with better contrast and more distinct colors
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

  // Handle date change with callback
  const handleDateChange = (newDate: Date) => {
    const updatedDate = new Date(newDate);
    setDate(updatedDate);

    // Trigger the callback to allow parent component to refresh data
    onDateChange?.(updatedDate);

    // Clear and re-process schedules immediately when date changes
    setSelectedClass(null);
    setDisplayDates([]);
    if (!staffLoading && classrooms) {
      processSchedules(classrooms);
    }
  };

  // Handle view change with callback
  const handleViewChange = (newView: CalendarView) => {
    setView(newView);
    onViewChange?.(newView);
  };  // Process classrooms into scheduled classes
  const processSchedules = (classroomsToProcess: Classroom[]) => {
    const subjectColorMap = new Map();
    const processed: ScheduledClass[] = [];

    console.log("Processing classrooms:", classroomsToProcess.length);

    classroomsToProcess.forEach((classroom) => {
      console.log("Processing classroom:", {
        classID: classroom.classID,
        schedule: classroom.schedule,
        schoolShift: classroom.schoolShift,
        isActive: classroom.isActive,
        teacherCode: classroom.teacherCode,
        supporter: classroom.supporter
      });

      // Check if user has access to this classroom
      if (
        !(showAllClasses ||
          (!staffLoading && staff &&
            (classroom.teacherCode === staff?.userId ||
              (classroom.supporter && classroom.supporter.includes(staff?.userId)))))
      ) {
        console.log("Skipping classroom due to access control:", classroom.classID);
        return;
      }

      // Skip inactive classes
      if (classroom.isActive === false) {
        console.log("Skipping inactive classroom:", classroom.classID);
        return;
      }

      // Get all valid schedules for this classroom
      const validSchedules = getCombinedSchedules(classroom);
      console.log("Valid schedules for", classroom.classID, ":", validSchedules);

      if (validSchedules.length > 0) {
        // Assign a consistent color based on subject name
        let color = subjectColorMap.get(classroom.subjectName);
        if (!color) {
          color = colors[subjectColorMap.size % colors.length];
          subjectColorMap.set(classroom.subjectName, color);
        }        validSchedules.forEach((schedule, index) => {
          const status = isUpcoming(schedule.beginTime, schedule.dayOfWeek);
          const processedClass: ScheduledClass = {
            id: `${classroom.classID}-${index}-${schedule.type}`,
            classId: classroom.classID,
            subjectName: classroom.subjectName,
            roomId: schedule.classRoomCode || "N/A",
            teacherName: classroom.teacherName || "N/A",
            startTime: schedule.beginTime,
            endTime: schedule.finishTime,
            day: schedule.dayOfWeek,
            color,
            studentCount: classroom.studentNumber ?? undefined,
            status: status as "upcoming" | "past" | "current",
          };
          console.log("Adding processed class:", processedClass);
          processed.push(processedClass);
        });
      }
    });    console.log("Total processed classes:", processed.length);
    
    // Additional check for duplicates at the end
    const duplicateCheck = new Map();
    processed.forEach(cls => {
      const key = `${cls.classId}-${cls.day}-${cls.startTime}-${cls.endTime}`;
      if (duplicateCheck.has(key)) {
        console.warn("Duplicate class found:", cls, "Original:", duplicateCheck.get(key));
      } else {
        duplicateCheck.set(key, cls);
      }
    });
    
    return processed;
  };

  // Memoize the processed schedules
  const processedSchedules = useMemo(() => {
    if (!staffLoading && classrooms) {
      return processSchedules(classrooms);
    }
    return [];
  }, [classrooms, staff, staffLoading, showAllClasses]);
  // Filter schedules by date range based on current view
  const scheduledClasses = useMemo(() => {
    console.log("Filtering schedules. View:", view, "Date:", date, "Total schedules:", processedSchedules.length);
    
    // For different views, we need different date ranges
    let startDate: Date, endDate: Date;
    
    switch (view) {
      case "day":
        startDate = new Date(date);
        endDate = new Date(date);
        break;
      case "week":
        // Get start of week (Sunday)
        startDate = new Date(date);
        startDate.setDate(date.getDate() - date.getDay());
        // Get end of week (Saturday)
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;      case "month":
        // For month view, we need to show all days visible in the calendar grid
        // This includes days from previous and next month to fill the grid
        const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const firstDayOfWeek = firstOfMonth.getDay(); // 0 = Sunday
        
        // Start from the Sunday of the week containing the first day of month
        startDate = new Date(firstOfMonth);
        startDate.setDate(1 - firstDayOfWeek);
        
        // End at the Saturday of the week containing the last day of month
        const lastOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        endDate = new Date(lastOfMonth);
        const remainingDays = 6 - lastOfMonth.getDay();
        endDate.setDate(lastOfMonth.getDate() + remainingDays);
        break;
      case "list":
        // For list view, show all classes (or a reasonable range)
        startDate = new Date(date);
        startDate.setDate(date.getDate() - 30); // Show 30 days before
        endDate = new Date(date);
        endDate.setDate(date.getDate() + 30); // Show 30 days after
        break;
      default:
        startDate = new Date(date);
        endDate = new Date(date);
    }
    
    console.log("Date range:", { startDate, endDate, view });    const filteredClasses = processedSchedules.filter(classItem => {
      const targetDay = classItem.day; // 0=Sunday, 1=Monday, etc.
      
      // Calculate the number of days in our range
      const rangeDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      console.log(`Checking class ${classItem.classId} (day ${targetDay}) against range ${rangeDays} days`);
      
      // Check if any day in the range matches the target day of week
      if (rangeDays >= 7) {
        // Range spans a full week or more, so it definitely includes this day
        console.log("Class", classItem.classId, "day", targetDay, "included (range >= 7 days)");
        return true;
      }
      
      // For shorter ranges (like day view or partial week)
      const startDay = startDate.getDay();
      const endDay = endDate.getDay();
      
      let includesDay = false;
      
      if (rangeDays === 1) {
        // Single day view - only include if target day matches exactly
        includesDay = targetDay === startDay;
      } else if (startDay <= endDay) {
        // Range doesn't wrap around the week
        includesDay = targetDay >= startDay && targetDay <= endDay;
      } else {
        // Range wraps around the week (e.g., Saturday to Monday)
        includesDay = targetDay >= startDay || targetDay <= endDay;
      }
      
      if (includesDay) {
        console.log("Class", classItem.classId, "day", targetDay, "found in range", startDay, "to", endDay, `(${rangeDays} days)`);
      } else {
        console.log("Class", classItem.classId, "day", targetDay, "NOT in range", startDay, "to", endDay, `(${rangeDays} days)`);
      }
      
      return includesDay;
    });
    
    console.log("Filtered classes for display:", filteredClasses.length);
    return filteredClasses;
  }, [processedSchedules, date, view]);

  // Update display dates when view or date changes
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
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
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

          <Tabs value={view} onValueChange={(value) => handleViewChange(value as CalendarView)}>
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
