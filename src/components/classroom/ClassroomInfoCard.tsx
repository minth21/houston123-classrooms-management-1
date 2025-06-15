import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Clock, Users, AlertCircle, Video } from "lucide-react";
import { Classroom } from "@/lib/api/classroom";
import { DAYS_OF_WEEK } from "@/lib/utils/calendarUtils";
import { format, isTomorrow, addDays } from "date-fns";
import { vi } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordingModal } from "@/components/classroom/RecordingModal";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface ClassroomInfoCardProps {
  classroom: Classroom;
  attendanceId?: string;
}

export function ClassroomInfoCard({
  classroom,
  attendanceId,
}: ClassroomInfoCardProps) {
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [lastKeyPressTime, setLastKeyPressTime] = useState(0);

  // Keyboard shortcut for test mode (Ctrl + Shift + T) with debounce
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Simple keyboard shortcut: Ctrl + Shift + T
      if (event.ctrlKey && event.shiftKey && event.key === "T") {
        event.preventDefault(); // Prevent browser default behavior

        const now = Date.now();
        // Debounce: only allow toggle every 500ms
        if (now - lastKeyPressTime < 500) {
          return;
        }
        setLastKeyPressTime(now);

        setTestMode((current) => {
          const newMode = !current;
          toast.success(
            `🧪 Test Mode: ${newMode ? "ON" : "OFF"} (Ctrl+Shift+T)`
          );
          return newMode;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lastKeyPressTime]);

  const formatTimeRange = (startTime: string, endTime: string): string => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(":");
      return `${hours}:${minutes}`;
    };
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      // Try to parse the date string
      const date = new Date(dateString);

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        // If invalid, try to parse as ISO string or return as is
        return dateString;
      }

      // Format the date in Vietnamese format
      return format(date, "dd/MM/yyyy", { locale: vi });
    } catch (error) {
      // If parsing fails, return the original string
      return dateString;
    }
  };

  const getNextClass = () => {
    if (!classroom.schedule || classroom.schedule.length === 0) {
      return null;
    }

    const now = new Date();
    const currentTime = format(now, "HH:mm");
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Check if class is happening today and hasn't ended yet
    const todaySchedule = classroom.schedule.find(
      (s) => s.dayOfWeek === currentDay
    );
    if (
      todaySchedule &&
      todaySchedule.finishTime &&
      currentTime < todaySchedule.finishTime
    ) {
      return {
        ...todaySchedule,
        date: now,
        isToday: true,
        isHappening:
          todaySchedule.beginTime && currentTime >= todaySchedule.beginTime,
      };
    }

    // Find next class in the week
    for (let i = 1; i <= 7; i++) {
      const checkDate = addDays(now, i);
      const checkDay = checkDate.getDay();
      const schedule = classroom.schedule.find((s) => s.dayOfWeek === checkDay);

      if (schedule) {
        return {
          ...schedule,
          date: checkDate,
          isToday: false,
          isHappening: false,
        };
      }
    }

    return null;
  };

  const nextClass = getNextClass();

  const getNextClassText = () => {
    if (!nextClass) return null;

    const timeRange = formatTimeRange(
      nextClass.beginTime || "",
      nextClass.finishTime || ""
    );

    if (nextClass.isToday) {
      if (nextClass.isHappening) {
        return {
          text: `Đang diễn ra • ${timeRange}`,
          variant: "destructive" as const,
          icon: <AlertCircle className="h-3 w-3" />,
        };
      } else {
        return {
          text: `Hôm nay • ${timeRange}`,
          variant: "secondary" as const,
          icon: <Clock className="h-3 w-3" />,
        };
      }
    } else if (isTomorrow(nextClass.date)) {
      return {
        text: `Ngày mai • ${timeRange}`,
        variant: "outline" as const,
        icon: <Calendar className="h-3 w-3" />,
      };
    } else {
      return {
        text: `${format(nextClass.date, "dd/MM", {
          locale: vi,
        })} • ${timeRange}`,
        variant: "outline" as const,
        icon: <Calendar className="h-3 w-3" />,
      };
    }
  };

  const nextClassInfo = getNextClassText();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{classroom.subjectName}</CardTitle>
            <CardDescription>Thông tin lớp học</CardDescription>
          </div>{" "}
          {nextClassInfo && (
            <div className="flex items-center gap-2">
              {(nextClassInfo.text.includes("Đang diễn ra") || testMode) &&
                (attendanceId || testMode) && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setIsRecordingModalOpen(true)}
                    className="flex items-center gap-1"
                  >
                    <Video className="h-3 w-3" />
                    {testMode ? "Ghi buổi học (TEST)" : "Ghi buổi học"}
                  </Button>
                )}
              <Badge
                variant={nextClassInfo.variant}
                className="flex items-center gap-1"
              >
                {nextClassInfo.icon}
                {nextClassInfo.text}
              </Badge>
            </div>
          )}{" "}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hidden Test Switch - Click 7 times on the title to toggle */}{" "}
        <div
          className={`absolute top-2 right-2 w-4 h-4 cursor-pointer z-10 transition-opacity ${
            testMode ? "opacity-30 bg-yellow-400 rounded-full" : "opacity-0"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            const now = Date.now();
            const clicks = (window as any).__testClicks || [];
            clicks.push(now);
            // Keep only clicks within last 3 seconds
            const recentClicks = clicks.filter(
              (time: number) => now - time < 3000
            );
            (window as any).__testClicks = recentClicks;

            // Visual feedback for clicks
            const clickCount = recentClicks.length;
            if (clickCount < 7) {
              toast.info(`🧪 Test Mode: ${clickCount}/7 clicks`);
            }

            if (recentClicks.length >= 7) {
              setTestMode(!testMode);
              (window as any).__testClicks = [];
              // Show toast notification
              toast.success(`🧪 Test Mode: ${!testMode ? "ON" : "OFF"}`);
            }
          }}
          title={
            testMode
              ? "Test Mode: ON (click 7x to turn OFF)"
              : "Test Mode: OFF (click 7x to turn ON)"
          }
        />{" "}
        {testMode && (
          <div className="mb-4 p-2 bg-yellow-100 border border-yellow-400 rounded text-yellow-800 text-xs">
            🧪 <strong>TEST MODE</strong> - Nút ghi hình sẽ hiện ngay cả khi
            không có lớp học
            <br />
            <span className="text-xs opacity-75">
              Tắt: Click 7x góc phải hoặc nhấn{" "}
              <kbd className="bg-yellow-200 px-1 rounded">Ctrl+Shift+T</kbd>
            </span>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {classroom.schedule?.map((schedule, index) => (
              <span key={index}>
                {index > 0 && ", "}
                {DAYS_OF_WEEK[schedule.dayOfWeek || 0]} (
                {formatTimeRange(
                  schedule.beginTime || "",
                  schedule.finishTime || ""
                )}
                )
              </span>
            ))}
          </span>
        </div>{" "}
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatDate(classroom.beginDate)} -{" "}
            {formatDate(classroom.finishDate)}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            Giáo viên: {classroom.teacherName}
            {classroom.studentNumber &&
              ` • ${classroom.studentNumber} học viên`}{" "}
          </span>
        </div>
      </CardContent>{" "}
      {/* Recording Modal */}
      {isRecordingModalOpen && (
        <RecordingModal
          isOpen={isRecordingModalOpen}
          onClose={() => setIsRecordingModalOpen(false)}
          classCode={classroom.classID}
          classroomName={`${classroom.subjectName}${testMode ? " (TEST)" : ""}`}
        />
      )}
    </Card>
  );
}
