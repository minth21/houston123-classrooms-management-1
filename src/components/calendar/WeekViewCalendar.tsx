"use client";

import { ScheduledClass } from "@/types/calendar";
import { useTranslation } from "react-i18next";
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

interface WeekViewCalendarProps {
  displayDates: Date[];
  scheduledClasses: ScheduledClass[];
  onClassClick: (classItem: ScheduledClass) => void;
}

export function WeekViewCalendar({
  displayDates,
  scheduledClasses,
  onClassClick,
}: WeekViewCalendarProps) {
  const { t } = useTranslation();
  const toMinutes = (time: string) => {
    const [h, m = "0"] = time.split(":");
    return Number(h) * 60 + Number(m);
  };
  const overlaps = (a: ScheduledClass, b: ScheduledClass) =>
    toMinutes(a.startTime) < toMinutes(b.endTime) &&
    toMinutes(a.endTime) > toMinutes(b.startTime);

  const layoutClusters = (classes: ScheduledClass[]) => {
    const events = [...classes].sort((a, b) => {
      const s = toMinutes(a.startTime) - toMinutes(b.startTime);
      if (s !== 0) return s;
      return toMinutes(b.endTime) - toMinutes(a.endTime);
    });
    const clusters: ScheduledClass[][] = [];
    events.forEach((ev) => {
      let target: ScheduledClass[] | null = null;
      for (const c of clusters) {
        if (c.some((e) => overlaps(e, ev))) {
          target = c;
          break;
        }
      }
      if (target) target.push(ev);
      else clusters.push([ev]);
    });

    const meta: Record<string, { leftPct: number; widthPct: number }>[] = [];
    const clusterMetas: Record<string, { leftPct: number; widthPct: number }> = {};

    clusters.forEach((cluster) => {
      const cols: ScheduledClass[][] = [];
      const baseCol: Record<string, number> = {};
      cluster.forEach((ev) => {
        let col = 0;
        while (true) {
          const colEvents = cols[col];
          if (!colEvents) {
            cols[col] = [ev];
            baseCol[ev.id] = col;
            break;
          }
            if (colEvents.every((e) => !overlaps(e, ev))) {
              colEvents.push(ev);
              baseCol[ev.id] = col;
              break;
            }
          col++;
        }
      });
      const total = cols.length;
      const span: Record<string, number> = {};
      cluster.forEach((ev) => {
        const startCol = baseCol[ev.id];
        let maxSpan = 1;
        for (let next = startCol + 1; next < total; next++) {
          const conflict = cols[next].some((other) => overlaps(other, ev));
          if (conflict) break;
          maxSpan++;
        }
        span[ev.id] = maxSpan;
      });
      cluster.forEach((ev) => {
        const right = baseCol[ev.id] + span[ev.id] - 1;
        cluster.forEach((other) => {
          if (other === ev) return;
          if (!overlaps(ev, other)) return;
          const oCol = baseCol[other.id];
          if (oCol > baseCol[ev.id] && oCol <= right) {
            span[ev.id] = Math.min(span[ev.id], oCol - baseCol[ev.id]);
          }
        });
      });
      cluster.forEach((ev) => {
        const colWidth = 100 / total;
        const leftPct = baseCol[ev.id] * colWidth;
        const widthPct = colWidth * span[ev.id];
        clusterMetas[ev.id] = { leftPct, widthPct };
      });
    });
    return clusterMetas;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header with day names */}
      <div className="grid grid-cols-7 border-b">
        {displayDates.map((date, index) => (
          <div key={index} className="border-r p-2 text-center last:border-r-0">
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
          <div className="ml-16 grid grid-cols-7">
            {" "}
            {displayDates.map((date, dayIndex) => {
              const dateISO = date.toISOString().slice(0, 10);
              // Only classes instantiated for this exact date
              const dayClasses = scheduledClasses.filter(
                (c) => c.dateISO === dateISO
              );
              const clusterMeta = layoutClusters(dayClasses);

              return (
                <div
                  key={dayIndex}
                  className="relative border-r last:border-r-0"
                >
                  {/* Hour grid lines */}
                  {HOURS.map((hour) => (
                    <div key={hour} className="h-16 border-b last:border-b-0" />
                  ))}{" "}
                  {/* Classes */}
                  {dayClasses.map((classItem) => {
                    const duration = getClassTimePeriod(classItem.startTime, classItem.endTime);
                    const topPosition = getClassPosition(classItem.startTime);
                    const info = clusterMeta[classItem.id];
                    const left = `${info.leftPct}%`;
                    const width = `${info.widthPct}%`;

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
                              <div className="text-[10px] flex justify-between items-center gap-1">
                                <span>
                                  {formatTime(classItem.startTime)} - {formatTime(classItem.endTime)}
                                </span>
                                {classItem.status && (
                                  <span
                                    className="ml-1 font-semibold capitalize"
                                    aria-label={t(`classScheduleCalendar.status.${classItem.status}`)}
                                    title={t(`classScheduleCalendar.status.${classItem.status}`)}
                                  >
                                    {classItem.status === "current"
                                      ? "•"
                                      : classItem.status === "upcoming"
                                      ? "→"
                                      : "✓"}
                                  </span>
                                )}
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
