"use client";

import { useState, useEffect } from "react";
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
import { vi, enUS } from "date-fns/locale"; 
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
import { useTranslation } from "react-i18next"; 

// Hour slots for the schedule (5AM to 10PM)
const HOURS = Array.from({ length: 18 }, (_, i) => i + 5);

interface ScheduledClass {
  id: string;
  classId: string;
  subjectName: string;
  roomId: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  day: number;
  color: string;
  studentCount?: number;
}

type CalendarView = "day" | "week" | "month" | "list";

interface ClassScheduleCalendarProps {
  classrooms: Classroom[];
  initialView?: CalendarView;
  initialDate?: Date;
  onViewChange?: (view: CalendarView) => void;
  onDateChange?: (date: Date) => void;
}

export default function ClassScheduleCalendar({
  classrooms,
  initialView = "week",
  initialDate = new Date(),
  onViewChange,
  onDateChange,
}: ClassScheduleCalendarProps) {
  // --- Setup ---
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('vi') ? vi : enUS;
  const [date, setDate] = useState<Date>(initialDate);
  const [view, setView] = useState<CalendarView>(initialView);
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<ScheduledClass | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [displayDates, setDisplayDates] = useState<Date[]>([]);
  const [calendarIsOpen, setCalendarIsOpen] = useState(false);

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
    setDate(newDate);
    onDateChange?.(newDate);
  };

  // Handle view change with callback
  const handleViewChange = (newView: CalendarView) => {
    setView(newView);
    onViewChange?.(newView);
  };
 
  // --- Lấy dữ liệu từ file JSON ---
const daysOfWeekData = t("classScheduleCalendar.daysOfWeek", { returnObjects: true });
const DAYS_OF_WEEK: string[] = Array.isArray(daysOfWeekData) ? daysOfWeekData : [];

const daysShortData = t("classScheduleCalendar.daysShort", { returnObjects: true });
const DAYS_SHORT: string[] = Array.isArray(daysShortData) ? daysShortData : [];

  // Process classrooms to extract scheduled classes
useEffect(() => {
  const processSchedules = () => {
    // Create a map to keep track of colors by subject to maintain consistency
    const subjectColorMap = new Map();
    const processed: ScheduledClass[] = [];

    classrooms.forEach((classroom) => {
      if (classroom.schedule && classroom.schedule.length > 0) {
        classroom.schedule.forEach((schedule, index) => {
          if (
            schedule.dayOfWeek !== undefined &&
            schedule.beginTime &&
            schedule.finishTime
          ) {
            // Assign a consistent color based on subject name
            let color = subjectColorMap.get(classroom.subjectName);
            if (!color) {
              color = colors[subjectColorMap.size % colors.length];
              subjectColorMap.set(classroom.subjectName, color);
            }

            processed.push({
              id: `${classroom.classID}-${index}`,
              classId: classroom.classID,
              subjectName: classroom.subjectName,
              // highlight-start
              roomId: schedule.classRoomCode || t("common.notAvailable"),
              teacherName: classroom.teacherName || t("common.notAvailable"),
              // highlight-end
              startTime: schedule.beginTime,
              endTime: schedule.finishTime,
              day: schedule.dayOfWeek,
              color,
              studentCount: classroom.studentNumber || 0,
            });
          }
        });
      }
    });

      setScheduledClasses(processed);
  };

  processSchedules();
  // highlight-next-line
}, [classrooms, t]); // Thêm 't' vào dependency array

  // Update display dates based on selected date and view
  useEffect(() => {
    // Calculate display dates based on selected date and view
    if (view === "day") {
      setDisplayDates([date]);
    } else if (view === "week") {
      // For week view, find the Sunday of the current week
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek;
      const sunday = new Date(date);
      sunday.setDate(diff);

      // Create array of dates for the week
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        return d;
      });

      setDisplayDates(weekDates);
    } else if (view === "month") {
      // For month view, generate all dates in the current month
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      // Get the first Sunday before or on the first day of the month
      const startDate = new Date(firstDay);
      const firstDayOfWeek = firstDay.getDay();
      startDate.setDate(firstDay.getDate() - firstDayOfWeek);

      // Get the last Saturday after or on the last day of the month
      const endDate = new Date(lastDay);
      const lastDayOfWeek = lastDay.getDay();
      endDate.setDate(lastDay.getDate() + (6 - lastDayOfWeek));

      // Create array of all dates to display
      const days = [];
      let current = new Date(startDate);
      while (current <= endDate) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }

      setDisplayDates(days);
    } else {
      // List view - show week based on selected date
      const dayOfWeek = date.getDay();
      const sunday = new Date(date);
      sunday.setDate(date.getDate() - dayOfWeek);

      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        return d;
      });
      setDisplayDates(weekDates);
    }
  }, [date, view]);

  const handleClassClick = (classItem: ScheduledClass) => {
    setSelectedClass(classItem);
    setIsDialogOpen(true);
  };

  // Get the time duration of a class in hours
  const getClassTimePeriod = (startTime: string, endTime: string) => {
    const start =
      parseInt(startTime.split(":")[0]) +
      parseInt(startTime.split(":")[1]) / 60;
    const end =
      parseInt(endTime.split(":")[0]) + parseInt(endTime.split(":")[1]) / 60;
    return end - start;
  };

  // Get the position of a class on the time grid
  const getClassPosition = (startTime: string) => {
    const [hours, minutes] = startTime.split(":").map(Number);
    // Calculate position based on 5AM (index 0) as the start time
    return hours - 5 + minutes / 60;
  };

  // Filter classes for the selected display dates
  const getClassesForDate = (date: Date) => {
    return scheduledClasses.filter(
      (classItem) => classItem.day === date.getDay()
    );
  };

  // Format time for display (e.g., "09:00" to "09:00")
  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  // Calculate day classes with their groups for better overlap handling
  const getDayClassGroups = (dayClasses: ScheduledClass[]) => {
    if (!dayClasses.length) return [];

    // Sort classes by start time
    const sortedClasses = [...dayClasses].sort((a, b) => {
      return getClassPosition(a.startTime) - getClassPosition(b.startTime);
    });

    // Group overlapping classes together using a more precise algorithm
    const groups: ScheduledClass[][] = [];

    for (let i = 0; i < sortedClasses.length; i++) {
      const current = sortedClasses[i];
      const currentStart = getClassPosition(current.startTime);
      const currentEnd =
        currentStart + getClassTimePeriod(current.startTime, current.endTime);

      // Try to find an existing group where this class can fit
      let foundGroup = false;

      for (const group of groups) {
        // Check if this class overlaps with any class in the current group
        const overlaps = group.some((cls) => {
          const clsStart = getClassPosition(cls.startTime);
          const clsEnd =
            clsStart + getClassTimePeriod(cls.startTime, cls.endTime);

          // Check for any time overlap
          return currentStart < clsEnd && currentEnd > clsStart;
        });

        if (!overlaps) {
          // If no overlap, add to this group
          group.push(current);
          foundGroup = true;
          break;
        }
      }

      // If couldn't fit in any existing group, create a new one
      if (!foundGroup) {
        groups.push([current]);
      }
    }

    return groups;
  };

// Render week view
const renderWeekView = () => {
  return (
    <div className="grid grid-cols-7 gap-px h-[700px] border rounded-md overflow-hidden bg-border">
      {displayDates.map((displayDate, dayIndex) => (
        <div key={dayIndex} className="flex flex-col h-full bg-card">
          <div
            className={`text-center py-2 font-medium ${
              isSameDay(displayDate, new Date())
                ? "bg-primary text-primary-foreground"
                : "bg-muted/20"
            }`}
          >
    {/* Dữ liệu từ mảng DAYS_OF_WEEK đã được dịch */}
            <div>{DAYS_OF_WEEK[displayDate.getDay()]}</div>
            <div className="text-sm">{format(displayDate, "dd/MM")}</div>
          </div>
          <div className="flex-1 relative overflow-hidden">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute w-full border-t border-border/30"
                style={{ top: `${((hour - 5) / 18) * 100}%` }}
              >
                <div className="text-xs text-muted-foreground -mt-2 ml-1">
                  {hour}:00
                </div>
              </div>
            ))}

             {(() => {
              const dayClasses = scheduledClasses.filter(
                (classItem) => classItem.day === displayDate.getDay()
              );


                // Helper function to check if two classes overlap
                const doClassesOverlap = (
                  a: ScheduledClass,
                  b: ScheduledClass
                ) => {
                  const aStart = getClassPosition(a.startTime);
                  const aEnd =
                    aStart + getClassTimePeriod(a.startTime, a.endTime);
                  const bStart = getClassPosition(b.startTime);
                  const bEnd =
                    bStart + getClassTimePeriod(b.startTime, b.endTime);
                  return !(aEnd <= bStart || bEnd <= aStart);
                };

                // Group overlapping classes
                const classGroups: ScheduledClass[][] = [];
                dayClasses.forEach((classItem) => {
                  // Try to find an existing group for this class
                  let foundGroup = false;
                  for (const group of classGroups) {
                    if (
                      !group.some((existingClass) =>
                        doClassesOverlap(existingClass, classItem)
                      )
                    ) {
                      group.push(classItem);
                      foundGroup = true;
                      break;
                    }
                  }
                  // If no suitable group found, create a new one
                  if (!foundGroup) {
                    classGroups.push([classItem]);
                  }
                });

  return classGroups.map((group, groupIndex) => {
                return group.map((classItem, itemIndex) => {
                  const startPosition = getClassPosition(classItem.startTime);
                  const duration = getClassTimePeriod(
                    classItem.startTime,
                    classItem.endTime
                  );
                    // Calculate width and position for overlapping items
                    const itemWidth = 92 / group.length; // Leave small margin on edges
                    const leftPosition = itemIndex * itemWidth + 4; // Start from 4% margin

                    return (
                      <TooltipProvider key={classItem.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute rounded-md border shadow-sm p-1.5 overflow-hidden cursor-pointer transition-all hover:brightness-95 hover:shadow-md ${classItem.color}`}
                              style={{
                                top: `${(startPosition / 18) * 100}%`,
                                height: `${(duration / 18) * 100}%`,
                                left: `${leftPosition}%`,
                                width: `${itemWidth - 1}%`, // -1 for gap
                                minHeight: "30px",
                                zIndex: 10 + itemIndex,
                              }}
                              onClick={() => handleClassClick(classItem)}
                            >
                              <div className="space-y-0.5">
                                <div className="font-medium text-xs leading-tight truncate">
                                  {classItem.subjectName}
                                </div>
                                <div className="text-xs truncate flex items-center">
                                  <Clock className="inline-block h-3 w-3 mr-1 opacity-70" />
                                  {formatTime(classItem.startTime)} -{" "}
                                  {formatTime(classItem.endTime)}
                                </div>
                                <div className="text-xs truncate flex items-center">
                                  <BookOpen className="inline-block h-3 w-3 mr-1 opacity-70" />
                                  {classItem.classId}
                                </div>
                                {duration > 0.75 && (
                                  <>
                                    <div className="text-xs truncate flex items-center">
                                      <MapPin className="inline-block h-3 w-3 mr-1 opacity-70" />
                                      {classItem.roomId}
                                    </div>
                                    <div className="text-xs truncate flex items-center">
                                      <Users className="inline-block h-3 w-3 mr-1 opacity-70" />
                                    {t("classScheduleCalendar.studentCount", { count: classItem.studentCount || 0 })}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs p-2">
                            <div className="space-y-1.5">
                              <p className="font-medium">
                                {classItem.subjectName}
                              </p>
                              <div className="grid gap-1 text-xs">
                                <p className="flex items-center">
                                  <BookOpen className="h-3 w-3 mr-1.5 opacity-70" />
                                {t("classScheduleCalendar.details.classIdLabel")}{" "}{classItem.classId}
                                </p>
                                <p className="flex items-center">
                                  <MapPin className="h-3 w-3 mr-1.5 opacity-70" />
                                {t("classScheduleCalendar.details.roomLabel")}{" "}{classItem.roomId}
                                </p>
                                <p className="flex items-center">
                                  <Users className="h-3 w-3 mr-1.5 opacity-70" />
                                {t("classScheduleCalendar.details.teacherLabel")}{" "}{classItem.teacherName}
                                </p>
                                <p className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1.5 opacity-70" />
                                  {formatTime(classItem.startTime)} -{" "}
                                  {formatTime(classItem.endTime)}
                                </p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  });
                });
              })()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dayDate = displayDates[0];
    const dayOfWeek = dayDate.getDay();

    return (
      <div className="h-[700px] relative border rounded-md overflow-hidden bg-card">
        <div
          className={`text-center py-3 font-medium border-b ${
            isSameDay(dayDate, new Date())
              ? "bg-primary text-primary-foreground"
              : "bg-muted/20"
          }`}
        >
          <div className="text-lg">{DAYS_OF_WEEK[dayOfWeek]}</div>
          <div
            className={
              isSameDay(dayDate, new Date())
                ? "text-primary-foreground/80"
                : "text-muted-foreground"
            }
          >
         {/* Giả sử bạn có biến 'dateLocale' được lấy từ ngôn ngữ hiện tại */}
          {/* const dateLocale = i18n.language === 'vi' ? vi : enUS; */}
          {format(dayDate, "dd MMMM yyyy", { locale: dateLocale })}          </div>
        </div>
      <div className="relative h-[calc(100%-60px)]">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="flex absolute w-full h-[5.55%] border-t border-border/30"
            style={{ top: `${((hour - 5) / 18) * 100}%` }}
          >
            <div className="w-16 text-xs text-muted-foreground flex items-start justify-center pt-1 border-r border-border/30">
              {hour}:00
            </div>
            <div className="flex-1"></div>
          </div>
        ))}

          {(() => {
            const dayClasses = scheduledClasses.filter(
              (classItem) => classItem.day === dayOfWeek
            );

            const classGroups = getDayClassGroups(dayClasses);

            return classGroups.map((group, groupIndex) => {
            return group.map((classItem, itemIndex) => {
              const startPosition = getClassPosition(classItem.startTime);
              const duration = getClassTimePeriod(
                classItem.startTime,
                classItem.endTime
              );

                // Improved width calculation with margins between items
                const totalWidthPercentage = 84;
              const margin = group.length > 1 ? 2 : 0;
              const itemWidth = (totalWidthPercentage - margin * (group.length - 1)) / group.length;
              const leftPosition = 16 + itemIndex * (itemWidth + margin);
              const minHeight = Math.max(60, duration * 20);


                return (
                  <TooltipProvider key={classItem.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          key={classItem.id}
                          className={`absolute rounded-md border-2 shadow-sm p-2 overflow-hidden cursor-pointer transition-all hover:brightness-95 hover:shadow-md ${classItem.color}`}
                          style={{
                            top: `${(startPosition / 18) * 100}%`,
                            height: `${(duration / 18) * 100}%`,
                            left: `${leftPosition}%`,
                            width: `${itemWidth}%`,
                            minHeight: `${minHeight}px`,
                            zIndex: 10 + itemIndex,
                          }}
                          onClick={() => handleClassClick(classItem)}
                        >
                          <div className="font-medium truncate">
                            {classItem.subjectName}
                          </div>
                          <div className="text-sm truncate">
                          {t("classScheduleCalendar.details.classIdLabel")}{" "}{classItem.classId}
                          </div>
                          <div className="text-sm truncate">
                          {t("classScheduleCalendar.details.roomLabel")}{" "}{classItem.roomId}
                          </div>
                          <div className="text-sm truncate mt-1 flex items-center">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {formatTime(classItem.startTime)} -{" "}
                            {formatTime(classItem.endTime)}
                          </div>
                          {duration > 1.5 && (
                            <div className="text-sm truncate mt-1 flex items-center">
                              <Users className="inline h-3 w-3 mr-1" />
                            {/* highlight-start */}
                            {t("classScheduleCalendar.studentCount", { count: classItem.studentCount || 0 })}
                            {/* highlight-end */}                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{classItem.subjectName}</p>
                          <p className="text-xs flex items-center">
                            <BookOpen className="h-3 w-3 mr-1 inline" />
                          {t("classScheduleCalendar.details.classIdLabel")}{" "}{classItem.classId}
                          </p>
                          <p className="text-xs flex items-center">
                            <MapPin className="h-3 w-3 mr-1 inline" />
                           {t("classScheduleCalendar.details.roomLabel")}{" "}{classItem.roomId}
                          </p>
                          <p className="text-xs flex items-center">
                            <Users className="h-3 w-3 mr-1 inline" />
                           {t("classScheduleCalendar.details.teacherLabel")}{" "}{classItem.teacherName}
                          </p>
                          <p className="text-xs flex items-center">
                            <Clock className="h-3 w-3 mr-1 inline" />
                            {formatTime(classItem.startTime)} -{" "}
                            {formatTime(classItem.endTime)}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              });
            });
          })()}
        </div>
      </div>
    );
  };

  // Render month view
  const renderMonthView = () => {
    // Group dates by week for display
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    displayDates.forEach((date, index) => {
      currentWeek.push(date);

      if (currentWeek.length === 7 || index === displayDates.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    return (
    <div className="border rounded-md overflow-hidden bg-card">
      {/* Month header */}
      <div className="bg-muted/20 font-medium p-3 text-center border-b">
        {format(
          new Date(date.getFullYear(), date.getMonth(), 1),
          "MMMM yyyy",
          // highlight-next-line
          { locale: dateLocale } // Sử dụng dateLocale để tự động đổi ngôn ngữ
        )}
      </div>

        {/* Day headers */}
      <div className="grid grid-cols-7 bg-muted/10 text-center py-2 border-b">
        {DAYS_SHORT.map((day, index) => (
          <div key={index} className="text-xs font-medium">
            {day}
          </div>
        ))}
      </div>

       {/* Calendar grid */}
      <div className="bg-card">
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="grid grid-cols-7 border-b last:border-b-0"
          >
            {week.map((day, dayIndex) => {
              const isCurrentMonth = day.getMonth() === date.getMonth();
              const isToday = isSameDay(day, new Date());
              const dayClasses = getClassesForDate(day);

              return (
                <div
                  key={dayIndex}
                  className={`min-h-[120px] border-r last:border-r-0 p-1 ${
                    isCurrentMonth ? "" : "bg-muted/10 text-muted-foreground"
                  } ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}
                >
                  <div className="text-right text-xs p-1">
                    {format(day, "d")}
                  </div>

                  <ScrollArea className="h-[90px]">
                    <div className="space-y-1 px-1">
                      {dayClasses.length > 0 ? (
                        dayClasses.map((classItem) => (
                          <div
                            key={classItem.id}
                            onClick={() => handleClassClick(classItem)}
                            className={`text-xs p-1 rounded cursor-pointer ${classItem.color}`}
                          >
                            <div className="font-medium truncate">
                              {formatTime(classItem.startTime)} -{" "}
                              {formatTime(classItem.endTime)}
                            </div>
                            <div className="truncate">
                              {classItem.subjectName}
                            </div>
                          </div>
                        ))
                      ) : isCurrentMonth ? (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          {/* highlight-next-line */}
                          {t("classScheduleCalendar.monthView.noClasses")}
                        </div>
                      ) : null}
                    </div>
                  </ScrollArea>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render list view
const renderListView = () => {
  // Use displayDates which now contains current week's dates
  return (
    <div className="space-y-6">
      {displayDates.map((day, dayIndex) => {
        const dayClasses = getClassesForDate(day);
        if (dayClasses.length === 0) return null;

        // Group classes by time slot to handle overlapping
        const timeGroups = new Map<string, ScheduledClass[]>();
        dayClasses.forEach((classItem) => {
          const timeKey = `${classItem.startTime}-${classItem.endTime}`;
          if (!timeGroups.has(timeKey)) {
            timeGroups.set(timeKey, []);
          }
          const group = timeGroups.get(timeKey);
          if (group) {
            group.push(classItem);
          }
        });

        const isToday = isSameDay(day, new Date());

        return (
          <Card key={dayIndex} className={isToday ? "border-primary" : ""}>
            <CardHeader className={`pb-2 ${isToday ? "bg-primary/5" : ""}`}>
              {" "}
              <CardTitle className="text-base flex items-center">
                {/* Sử dụng dateLocale để tự động đổi ngôn ngữ */}
                {format(day, "EEEE, dd/MM/yyyy", { locale: dateLocale })}
                {isToday && (
                  <Badge variant="default" className="ml-2">
                    {/* highlight-next-line */}
                    {t("classScheduleCalendar.listView.todayBadge")}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-4">
                {Array.from(timeGroups.entries())
                  .sort(([timeA], [timeB]) => {
                    const [startA] = timeA.split("-");
                    const [startB] = timeB.split("-");
                    return startA.localeCompare(startB);
                  })
                  .map(([timeKey, classes]) => {
                    const [startTime, endTime] = timeKey.split("-");
                    return (
                      <div key={timeKey} className="relative space-y-2">
                        <div className="flex items-center justify-between border-b pb-1">
                          <div className="flex items-center text-sm font-medium">
                            <Clock className="h-4 w-4 mr-1.5" />
                            {formatTime(startTime)} - {formatTime(endTime)}
                          </div>
                          {classes.length > 1 && (
                            <Badge variant="secondary" className="text-xs">
                              {/* highlight-next-line */}
                              {t("classScheduleCalendar.listView.concurrentClasses", { count: classes.length })}
                            </Badge>
                          )}
                        </div>

                                               <div className="grid gap-2">
                          {classes.map((classItem: ScheduledClass) => (
                            <div
                              key={classItem.id}
                              className={`p-3 rounded-md border ${classItem.color} cursor-pointer hover:brightness-95 transition-all`}
                              onClick={() => handleClassClick(classItem)}
                            >
                              <div className="grid sm:grid-cols-[1fr,auto] gap-3">
                                <div className="space-y-1">
                                  <div className="font-medium">
                                    {classItem.subjectName}
                                  </div>
                                  <div className="flex flex-wrap gap-3">
                                    <div className="flex items-center text-sm">
                                      <BookOpen className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                                      {classItem.classId}
                                    </div>
                                    <div className="flex items-center text-sm">
                                      <MapPin className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                                      {classItem.roomId}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center text-sm">
                                    <Users className="h-3.5 w-3.5 mr-1.5 opacity-70" />
                                    {/* highlight-next-line */}
                                    {t("classScheduleCalendar.studentCount", { count: classItem.studentCount || 0 })}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-2 pt-2 border-t text-sm flex items-center text-muted-foreground">
                                <Users className="h-3.5 w-3.5 mr-1.5" />
                                {/* highlight-next-line */}
                                {t("classScheduleCalendar.details.teacherLabel")}{" "}{classItem.teacherName}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
            </Card>
          );
        })}

        {/* Điều kiện kiểm tra nếu không có lớp nào trong cả tuần (áp dụng cho List View) */}
        {!displayDates.some((day) => getClassesForDate(day).length > 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
            {/* highlight-next-line */}
            <p>{t("classScheduleCalendar.listView.noClassesThisWeek")}</p>
          </div>
        )}
      </div>
    );
  };
  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>{/* Tiêu đề có thể được thêm ở đây */}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {" "}
            <Tabs
              value={view}
              onValueChange={(value) =>
                handleViewChange(value as CalendarView)
              }
              className="w-fit"
            >
              <TabsList>
                {/* highlight-start */}
                <TabsTrigger value="day" className="text-xs px-2 sm:px-3">
                  <span className="hidden sm:inline">{t("classScheduleCalendar.view.day")}</span>
                  <Calendar className="h-4 w-4 sm:hidden" />
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-2 sm:px-3">
                  <span className="hidden sm:inline">{t("classScheduleCalendar.view.week")}</span>
                  <LayoutGrid className="h-4 w-4 sm:hidden" />
                </TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-2 sm:px-3">
                  <span className="hidden sm:inline">{t("classScheduleCalendar.view.month")}</span>
                  <CalendarIcon className="h-4 w-4 sm:hidden" />
                </TabsTrigger>
                <TabsTrigger value="list" className="text-xs px-2 sm:px-3">
                  <span className="hidden sm:inline">{t("classScheduleCalendar.view.list")}</span>
                  <List className="h-4 w-4 sm:hidden" />
                </TabsTrigger>
                {/* highlight-end */}
              </TabsList>
            </Tabs>
             <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCalendarIsOpen(!calendarIsOpen)}
                className="text-xs gap-1"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {view === "month"
                    ? format(date, "MM/yyyy")
                    : format(date, "dd/MM/yyyy")}
                </span>
                <span className="sm:hidden">{format(date, "dd/MM")}</span>
              </Button>
              {/* Calendar popover */}
               {calendarIsOpen && (
                <div className="absolute z-50 mt-1 right-0 bg-background border rounded-md shadow-md">
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
                </div>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const newDate = new Date(date);
                  if (view === "day") newDate.setDate(newDate.getDate() - 1);
                  else if (view === "week")
                    newDate.setDate(newDate.getDate() - 7);
                  else if (view === "month")
                    newDate.setMonth(newDate.getMonth() - 1);
                  else if (view === "list")
                    newDate.setDate(newDate.getDate() - 7);
                  handleDateChange(newDate);
                }}
              >
                 <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date();
                  handleDateChange(newDate);
                }}
                className="text-xs"
              >
                {/* highlight-next-line */}
                {t("classScheduleCalendar.listView.todayBadge")}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  const newDate = new Date(date);
                  if (view === "day") newDate.setDate(newDate.getDate() + 1);
                  else if (view === "week")
                    newDate.setDate(newDate.getDate() + 7);
                  else if (view === "month")
                    newDate.setMonth(newDate.getMonth() + 1);
                  else if (view === "list")
                    newDate.setDate(newDate.getDate() + 7);
                  handleDateChange(newDate);
                }}
              >
               <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {scheduledClasses.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <CalendarIcon className="mx-auto h-10 w-10 mb-2 opacity-50" />
            {/* highlight-next-line */}
            <p>{t("classScheduleCalendar.emptyState.noClassesForSelectedTime")}</p>
          </div>
        ) : view === "day" ? (
          renderDayView()
        ) : view === "week" ? (
          renderWeekView()
        ) : view === "month" ? (
          renderMonthView()
        ) : (
          renderListView()
        )}
        {/* Class Detail Dialog */}
        {selectedClass && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedClass.subjectName}
                </DialogTitle>
                <DialogDescription>
                  {/* highlight-next-line */}
                  {t("classScheduleCalendar.dialog.description", { classId: selectedClass.classId })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-blue-100 p-3 text-blue-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    {/* highlight-next-line */}
                    <p className="text-sm text-muted-foreground">{t("classScheduleCalendar.dialog.subject")}</p>
                    <p className="font-medium">{selectedClass.subjectName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-amber-100 p-3 text-amber-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    {/* highlight-next-line */}
                    <p className="text-sm text-muted-foreground">{t("classScheduleCalendar.dialog.time")}</p>
                    <p className="font-medium">
                      {DAYS_OF_WEEK[selectedClass.day]},{" "}
                      {formatTime(selectedClass.startTime)} -{" "}
                      {formatTime(selectedClass.endTime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-green-100 p-3 text-green-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    {/* highlight-next-line */}
                    <p className="text-sm text-muted-foreground">{t("classScheduleCalendar.dialog.room")}</p>
                    <p className="font-medium">{selectedClass.roomId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-purple-100 p-3 text-purple-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    {/* highlight-next-line */}
                    <p className="text-sm text-muted-foreground">{t("classScheduleCalendar.dialog.teacher")}</p>
                    <p className="font-medium">{selectedClass.teacherName}</p>
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button asChild variant="default">
                    <Link
                      href={`/dashboard/classrooms/${selectedClass.classId}`}
                    >
                      {/* highlight-next-line */}
                      {t("classScheduleCalendar.dialog.viewDetailsButton")}
                    </Link>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
