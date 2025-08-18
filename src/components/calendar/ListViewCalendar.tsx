import { ScheduledClass } from "@/types/calendar";
import { DAYS_SHORT, formatTime } from "@/lib/utils/calendarUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface ListViewCalendarProps {
  scheduledClasses: ScheduledClass[];
  onClassClick: (classItem: ScheduledClass) => void;
}

export function ListViewCalendar({
  scheduledClasses,
  onClassClick,
}: ListViewCalendarProps) {
  const { t } = useTranslation();
  const uniqueClasses = scheduledClasses.filter((classItem, index, array) => {
    return (
      array.findIndex(
        (c) =>
          c.classId === classItem.classId &&
          c.startTime === classItem.startTime &&
          c.endTime === classItem.endTime
      ) === index
    );
  });

  // Sort classes by day and start time
  const sortedClasses = [...uniqueClasses].sort((a, b) => {
    if (a.day !== b.day) {
      return a.day - b.day;
    }
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="grid grid-cols-5 border-b p-2 font-semibold">
  <div>{t('listViewCalendar.headers.subject')}</div>
  <div>{t('listViewCalendar.headers.time')}</div>
  <div>{t('listViewCalendar.headers.room')}</div>
  <div>{t('listViewCalendar.headers.teacher')}</div>
  <div>{t('listViewCalendar.headers.status')}</div>
      </div>

      {/* List of classes */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {sortedClasses.map((classItem) => (
            <div
              key={classItem.id}
              className="grid cursor-pointer grid-cols-5 items-center p-2 hover:bg-muted/50"
              onClick={() => onClassClick(classItem)}
            >
              <div className="font-medium">{classItem.subjectName}</div>
              <div>
                <div>{DAYS_SHORT[classItem.day]}</div>
                <div className="text-sm text-muted-foreground">
                  {formatTime(classItem.startTime)} -{" "}
                  {formatTime(classItem.endTime)}
                </div>
              </div>
              <div>{classItem.roomId}</div>
              <div>{classItem.teacherName}</div>
              <div>
                <Badge
                  variant={
                    classItem.status === "current"
                      ? "default"
                      : classItem.status === "past"
                      ? "secondary"
                      : "outline"
                  }
                >
                  {classItem.status === 'current'
                    ? t('listViewCalendar.status.current')
                    : classItem.status === 'past'
                    ? t('listViewCalendar.status.past')
                    : t('listViewCalendar.status.upcoming')}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
