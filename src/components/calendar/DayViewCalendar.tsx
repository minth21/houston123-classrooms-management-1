import { ScheduledClass } from "@/types/calendar";
import {
  DAYS_SHORT,
  HOURS,
  formatTime,
  getClassPosition,
  getClassTimePeriod,
} from "@/lib/utils/calendarUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DayViewCalendarProps {
  date: Date;
  scheduledClasses: ScheduledClass[];
  onClassClick: (classItem: ScheduledClass) => void;
}

export function DayViewCalendar({
  date,
  scheduledClasses,
  onClassClick,
}: DayViewCalendarProps) {
  const allDayClasses = scheduledClasses.filter(
    (classItem) => classItem.day === date.getDay()
  );

  const dayClasses = allDayClasses.filter((classItem, index, array) => {
    return (
      array.findIndex(
        (c) =>
          c.classId === classItem.classId &&
          c.startTime === classItem.startTime &&
          c.endTime === classItem.endTime
      ) === index
    );
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4 text-center">
        <div className="text-lg font-semibold">
          {DAYS_SHORT[date.getDay()]}, {date.getDate()}/{date.getMonth() + 1}
        </div>
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

          {/* Main content area */}
          <div className="ml-16">
            {/* Hour grid lines */}
            {HOURS.map((hour) => (
              <div key={hour} className="h-16 border-b last:border-b-0" />
            ))}

            {/* Classes */}
            {dayClasses.map((classItem) => {
              const period = getClassTimePeriod(
                classItem.startTime,
                classItem.endTime
              );
              const topRem = getClassPosition(classItem.startTime);
              return (
                <TooltipProvider key={classItem.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`absolute left-0 right-0 mx-2 cursor-pointer rounded-md border p-2 ${classItem.color}`}
                        style={{
                          top: `${topRem}rem`,
                          height: `${period * 4}rem`,
                          zIndex: 10,
                        }}
                        onClick={() => onClassClick(classItem)}
                      >
                        <div className="font-medium">
                          {classItem.subjectName}
                        </div>
                        <div className="text-sm">
                          {formatTime(classItem.startTime)} -{" "}
                          {formatTime(classItem.endTime)}
                        </div>
                        <div className="text-sm">Phòng: {classItem.roomId}</div>
                        <div className="text-sm">
                          Giáo viên: {classItem.teacherName}
                        </div>
                        {classItem.studentCount && (
                          <div className="text-sm">
                            Số học viên: {classItem.studentCount}
                          </div>
                        )}
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
                        <div className="text-sm">Phòng: {classItem.roomId}</div>
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
        </div>
      </ScrollArea>
    </div>
  );
}
