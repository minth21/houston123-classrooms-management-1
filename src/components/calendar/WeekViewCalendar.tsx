import { ScheduledClass } from "@/types/calendar";
import { DAYS_SHORT, HOURS, formatTime, getClassPosition, getClassTimePeriod } from "@/lib/utils/calendarUtils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WeekViewCalendarProps {
  displayDates: Date[];
  scheduledClasses: ScheduledClass[];
  onClassClick: (classItem: ScheduledClass) => void;
}

export function WeekViewCalendar({
  displayDates,
  scheduledClasses,
  onClassClick,
}: WeekViewCalendarProps) {  const doClassesOverlap = (a: ScheduledClass, b: ScheduledClass) => {
    const [aStartHour, aStartMin] = a.startTime.split(":").map(Number);
    const [aEndHour, aEndMin] = a.endTime.split(":").map(Number);
    const [bStartHour, bStartMin] = b.startTime.split(":").map(Number);
    const [bEndHour, bEndMin] = b.endTime.split(":").map(Number);

    const aStartMinutes = aStartHour * 60 + (aStartMin || 0);
    const aEndMinutes = aEndHour * 60 + (aEndMin || 0);
    const bStartMinutes = bStartHour * 60 + (bStartMin || 0);
    const bEndMinutes = bEndHour * 60 + (bEndMin || 0);

    return (
      (aStartMinutes < bEndMinutes && aEndMinutes > bStartMinutes)
    );
  };

  const getOverlappingClasses = (classItem: ScheduledClass, dayClasses: ScheduledClass[]) => {
    return dayClasses.filter(
      (otherClass) =>
        otherClass.id !== classItem.id &&
        doClassesOverlap(classItem, otherClass)
    );
  };

  const getClassWidth = (classItem: ScheduledClass, dayClasses: ScheduledClass[]) => {
    const overlappingClasses = getOverlappingClasses(classItem, dayClasses);
    const totalOverlapping = overlappingClasses.length + 1;
    return `${100 / totalOverlapping}%`;
  };
  const getClassLeft = (classItem: ScheduledClass, dayClasses: ScheduledClass[]) => {
    const overlappingClasses = getOverlappingClasses(classItem, dayClasses);
    const totalOverlapping = overlappingClasses.length + 1;
    
    // Sort overlapping classes by start time to determine order
    const allOverlapping = [classItem, ...overlappingClasses].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
    
    const index = allOverlapping.findIndex(cls => cls.id === classItem.id);
    const leftPercent = (index * 100) / totalOverlapping;
    
    return `${leftPercent}%`;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with day names */}
      <div className="grid grid-cols-7 border-b">
        {displayDates.map((date, index) => (
          <div
            key={index}
            className="border-r p-2 text-center last:border-r-0"
          >
            <div className="font-semibold">{DAYS_SHORT[date.getDay()]}</div>
            <div className="text-sm text-muted-foreground">
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <ScrollArea className="flex-1">
        <div className="relative">
          {/* Hour markers */}
          <div className="absolute left-0 top-0 w-16 border-r">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-16 border-b p-1 text-right text-sm text-muted-foreground"
              >
                {hour}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="ml-16 grid grid-cols-7">            {displayDates.map((date, dayIndex) => {
              const allDayClasses = scheduledClasses.filter(
                (classItem) => classItem.day === date.getDay()
              );
              
              // Deduplicate classes based on classId, startTime, and endTime
              const dayClasses = allDayClasses.filter((classItem, index, array) => {
                return array.findIndex(c => 
                  c.classId === classItem.classId && 
                  c.startTime === classItem.startTime && 
                  c.endTime === classItem.endTime
                ) === index;
              });

              return (
                <div
                  key={dayIndex}
                  className="relative border-r last:border-r-0"
                >
                  {/* Hour grid lines */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="h-16 border-b last:border-b-0"
                    />
                  ))}                  {/* Classes */}
                  {dayClasses.map((classItem) => {
                    const duration = getClassTimePeriod(
                      classItem.startTime,
                      classItem.endTime
                    );
                    const topPosition = getClassPosition(classItem.startTime);
                    const width = getClassWidth(classItem, dayClasses);
                    const left = getClassLeft(classItem, dayClasses);

                    return (
                      <TooltipProvider key={classItem.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute cursor-pointer rounded-md border p-1 text-xs ${classItem.color}`}
                              style={{
                                top: `${topPosition}rem`,
                                left: left,
                                width: width,
                                height: `${duration * 4}rem`,
                                zIndex: 10,
                              }}
                              onClick={() => onClassClick(classItem)}
                            >
                              <div className="font-medium">
                                {classItem.subjectName}
                              </div>
                              <div className="text-[10px]">
                                {formatTime(classItem.startTime)} -{" "}
                                {formatTime(classItem.endTime)}
                              </div>
                              <div className="text-[10px]">
                                {classItem.roomId}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {classItem.subjectName}
                              </div>
                              <div className="text-sm">
                                {formatTime(classItem.startTime)} -{" "}
                                {formatTime(classItem.endTime)}
                              </div>
                              <div className="text-sm">
                                Phòng: {classItem.roomId}
                              </div>
                              <div className="text-sm">
                                Giáo viên: {classItem.teacherName}
                              </div>
                              {classItem.studentCount && (
                                <div className="text-sm">
                                  Số học viên: {classItem.studentCount}
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
} 