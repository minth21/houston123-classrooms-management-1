import { useState } from "react";
import { Attendance } from "@/lib/api/classroom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface AttendanceTableProps {
  attendance: Attendance[];
  onCommentSubmit: (attendanceId: string, content: string) => Promise<void>;
}

export function AttendanceTable({
  attendance,
  onCommentSubmit,
}: AttendanceTableProps) {
  const { t } = useTranslation();
  const [selectedAttendance, setSelectedAttendance] = useState<string>("");
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCommentSubmit = async () => {
    if (!selectedAttendance || !commentText.trim()) {
      toast.error(t("classroomDetailPage.attendance.dialog.placeholder"));
      return;
    }

    try {
      setIsSubmitting(true);
      await onCommentSubmit(selectedAttendance, commentText);
      setCommentText("");
      toast.success(t("classroomDetailPage.toasts.addNoteSuccess"));
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error(t("classroomDetailPage.toasts.addNoteError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTimeRange = (startTime: string, endTime: string): string => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(":");
      return `${hours}:${minutes}`;
    };
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              {t("classroomDetailPage.attendance.table.date")}
            </TableHead>
            <TableHead>
              {t("classroomDetailPage.attendance.table.time")}
            </TableHead>
            <TableHead>
              {t("classroomDetailPage.attendance.table.room")}
            </TableHead>
            <TableHead>
              {t("classroomDetailPage.attendance.table.studentCount")}
            </TableHead>
            <TableHead>
              {t("classroomDetailPage.attendance.table.status")}
            </TableHead>
            <TableHead>
              {t("classroomDetailPage.attendance.table.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendance.map((record) => (
            <TableRow key={record._id}>
              <TableCell>{formatDate(record.date)}</TableCell>
              <TableCell>
                {formatTimeRange(record.startTime, record.endTime)}
              </TableCell>
              <TableCell>{record.roomId}</TableCell>
              <TableCell>{record.staffName}</TableCell>
              <TableCell>
                <Badge variant={record.isAttended ? "default" : "secondary"}>
                  {record.isAttended
                    ? t("classroomDetailPage.attendance.status.attended")
                    : t("classroomDetailPage.attendance.status.notAttended")}
                </Badge>
              </TableCell>
              <TableCell>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAttendance(record._id)}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {t("classroomDetailPage.attendance.dialog.title", {
                          date: new Date(record.date).toLocaleDateString(),
                        })}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="comment">
                          {t("classroomDetailPage.attendance.dialog.noteLabel")}
                        </Label>
                        <Input
                          id="comment"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={
                            t(
                              "classroomDetailPage.attendance.dialog.placeholder"
                            ) as string
                          }
                        />
                      </div>
                      <Button
                        onClick={handleCommentSubmit}
                        disabled={isSubmitting}
                      >
                        {isSubmitting
                          ? t("common.submitting")
                          : t(
                              "classroomDetailPage.attendance.dialog.submitButton"
                            )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
