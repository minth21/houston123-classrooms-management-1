import { ScheduledClass } from "@/types/calendar";
import { DAYS_SHORT, formatTime } from "@/lib/utils/calendarUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MonthViewCalendarProps {
  displayDates: Date[];
  scheduledClasses: ScheduledClass[];
  onClassClick: (classItem: ScheduledClass) => void;
  currentDate?: Date; // Add current date for month comparison
}

export function MonthViewCalendar({
  displayDates,
  scheduledClasses,
  onClassClick,
  currentDate = new Date(),
}: MonthViewCalendarProps) {  const getClassesForDate = (date: Date) => {
    const classesForDay = scheduledClasses.filter(
      (classItem) => classItem.day === date.getDay()
    );
    
    // Deduplicate classes based on classId, startTime, and endTime
    const uniqueClasses = classesForDay.filter((classItem, index, array) => {
      return array.findIndex(c => 
        c.classId === classItem.classId && 
        c.startTime === classItem.startTime && 
        c.endTime === classItem.endTime
      ) === index;
    });
    
    // Debug logging to check for duplicates
    if (classesForDay.length !== uniqueClasses.length) {
      console.log(`Date ${date.toDateString()}: Found ${classesForDay.length} classes, reduced to ${uniqueClasses.length} unique classes`);
    }
    
    return uniqueClasses;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with day names */}
      <div className="grid grid-cols-7 border-b">
        {DAYS_SHORT.map((day, index) => (
          <div
            key={index}
            className="border-r p-2 text-center last:border-r-0"
          >
            <div className="font-semibold">{day}</div>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <ScrollArea className="flex-1">
        <div className="grid h-full grid-cols-7 grid-rows-6">          {displayDates.map((date, index) => {
            const dayClasses = getClassesForDate(date);
            const isCurrentMonth = date.getMonth() === currentDate.getMonth() && 
                                  date.getFullYear() === currentDate.getFullYear();

            return (
              <div
                key={index}
                className={`relative border-r border-b p-1 ${
                  !isCurrentMonth ? "bg-muted/50" : ""
                }`}
              >
                {/* Date number */}
                <div className="mb-1 text-right text-sm">
                  {date.getDate()}
                </div>

                {/* Classes */}
                <div className="space-y-1">
                  {dayClasses.map((classItem) => (
                    <TooltipProvider key={classItem.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`cursor-pointer rounded-md border p-1 text-xs ${classItem.color}`}
                            onClick={() => onClassClick(classItem)}
                          >
                            <div className="truncate font-medium">
                              {classItem.subjectName}
                            </div>
                            <div className="truncate text-[10px]">
                              {formatTime(classItem.startTime)} -{" "}
                              {formatTime(classItem.endTime)}
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
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
} 