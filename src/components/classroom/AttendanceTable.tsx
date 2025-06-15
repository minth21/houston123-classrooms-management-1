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

interface AttendanceTableProps {
  attendance: Attendance[];
  onCommentSubmit: (attendanceId: string, content: string) => Promise<void>;
}

export function AttendanceTable({
  attendance,
  onCommentSubmit,
}: AttendanceTableProps) {
  const [selectedAttendance, setSelectedAttendance] = useState<string>("");
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCommentSubmit = async () => {
    if (!selectedAttendance || !commentText.trim()) {
      toast.error("Vui lòng nhập nội dung bình luận");
      return;
    }

    try {
      setIsSubmitting(true);
      await onCommentSubmit(selectedAttendance, commentText);
      setCommentText("");
      toast.success("Đã thêm bình luận thành công");
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("Có lỗi xảy ra khi thêm bình luận");
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
            <TableHead>Ngày</TableHead>
            <TableHead>Thời gian</TableHead>
            <TableHead>Phòng</TableHead>
            <TableHead>Giáo viên</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Thao tác</TableHead>
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
                  {record.isAttended ? "Đã điểm danh" : "Chưa điểm danh"}
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
                      <DialogTitle>Thêm bình luận</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="comment">Nội dung</Label>
                        <Input
                          id="comment"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Nhập nội dung bình luận..."
                        />
                      </div>
                      <Button
                        onClick={handleCommentSubmit}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Đang gửi..." : "Gửi"}
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
