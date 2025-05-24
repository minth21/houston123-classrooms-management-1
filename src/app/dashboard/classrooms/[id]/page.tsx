"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  classroomService,
  type Attendance,
  type RecordingSettings,
} from "@/lib/api/classroom";
import { Toaster, toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  FileText,
  MessageSquare,
  ChevronLeft,
  Users,
  Video,
  StopCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import DashboardHeader from "@/components/dashboard-header";
import Loader from "@/components/loader";

import { Alert, AlertDescription } from "@/components/ui/alert";

interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  author: string;
  attachments: any[];
}

interface Recording {
  id: string;
  stream: MediaStream;
  recorder: MediaRecorder;
  isRecording: boolean;
  blob?: Blob;
  classCode?: string;
}

export default function ClassroomDetailPage() {
  const params = useParams();
  const classId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diaryFiles, setDiaryFiles] = useState<File[]>([]);
  const [diaryContent, setDiaryContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [commentText, setCommentText] = useState("");
  const [selectedAttendance, setSelectedAttendance] = useState<string>("");
  const [recording, setRecording] = useState<Recording | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingSettings, setRecordingSettings] = useState<RecordingSettings>();

  const handleSaveRecordingSettings = async (settings: RecordingSettings) => {
    try {
      setIsSubmitting(true);
      // Tạm thời chỉ lưu vào state, trong thực tế bạn sẽ gọi API để lưu
      setRecordingSettings(settings);
      toast.success("Đã lưu cấu hình ghi hình thành công");
    } catch (error) {
      console.error("Error saving recording settings:", error);
      toast.error("Có lỗi xảy ra khi lưu cấu hình ghi hình");
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadRecording = async () => {
    if (!recording || !recording.blob || !recording.classCode || !selectedAttendance) {
      toast.error("Vui lòng chọn buổi học trước khi lưu video");
      return;
    }

    try {
      const file = new File([recording.blob], `recording-${Date.now()}.webm`, {
        type: "video/webm",
      });

      await classroomService.postComment({
        attendanceId: selectedAttendance,
        content: "Video ghi hình buổi học",
        files: [file],
      });

      // Clear recording after successful upload
      setRecording(null);
      toast.success("Video đã được tải lên thành công");

      // Refresh attendance data to show the new comment with video
      await fetchAttendanceData();
    } catch (error) {
      console.error("Error uploading recording:", error);
      setRecordingError("Không thể tải video lên máy chủ. Vui lòng thử lại.");
    }
  };

  // Auto-select current attendance when starting recording
  const startRecording = async () => {
    // Find the most recent attendance for today
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.find(record => 
      record.date.startsWith(today)
    );

    if (!todayAttendance) {
      toast.error("Không tìm thấy buổi học cho ngày hôm nay");
      return;
    }

    // Set the selected attendance
    setSelectedAttendance(todayAttendance._id);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const options = {
        mimeType: "video/webm",
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000,
      };

      const recorder = new MediaRecorder(stream, options);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setRecording((prev) => (prev ? { ...prev, blob } : null));

        // Stop all tracks after recording is stopped
        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording
      recorder.start(1000);

      setRecording({
        id: Date.now().toString(),
        stream,
        recorder,
        isRecording: true,
        classCode: classId,
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      setRecordingError("Không thể bắt đầu ghi hình. Vui lòng thử lại.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      if (recording.recorder.state === "recording") {
        recording.recorder.stop();
      }
      setRecording((prev) => (prev ? { ...prev, isRecording: false } : null));
    } catch (error) {
      console.error("Error stopping recording:", error);
      setRecordingError("Không thể dừng ghi hình. Vui lòng thử lại.");
    }
  };

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const attendanceData = await classroomService.getClassroomAttendance(
        classId
      );
      setAttendance(attendanceData);
    } catch (err) {
      setError("Failed to load classroom data");
      setAttendance([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle branch selection
  const handleBranchSelect = () => {
    // Không gọi lại fetchAttendanceData trừ khi cần thiết
    // Do nothing to prevent refresh loop
  };

  // Load data on mount only once
  useEffect(() => {
    // Lưu trữ biến để kiểm tra nếu component đã unmounted
    let isMounted = true;

    const fetchData = async () => {
      try {
        if (classId && isMounted) {
          setIsLoading(true);
          setError(null);
          const attendanceData = await classroomService.getClassroomAttendance(
            classId
          );
          // Chỉ set state nếu component vẫn mounted
          if (isMounted) {
            setAttendance(attendanceData);
            setIsLoading(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load classroom data");
          setAttendance([]);
          setIsLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup function để tránh memory leaks và race conditions
    return () => {
      isMounted = false;
    };
  }, []); // empty dependency array to run only once
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    // Tạo formatter cho phần ngày tháng
    const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Lấy chỉ ngày tháng, bỏ phần thời gian 00:00
    return dateFormatter.format(date);
  };
  // Format time range
  const formatTimeRange = (startTime: string, endTime: string): string => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(":");
      if (hours === "00" && minutes === "00") return "";
      return time.slice(0, 5);
    };

    const start = formatTime(startTime);
    const end = formatTime(endTime);

    return start && end ? `${start} - ${end}` : "";
  };

  // Get day of week in Vietnamese
  const getDayOfWeek = (day: number): string => {
    const days = [
      "Chủ nhật",
      "Thứ 2",
      "Thứ 3",
      "Thứ 4",
      "Thứ 5",
      "Thứ 6",
      "Thứ 7",
    ];
    return days[day % 7];
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (error || attendance.length === 0) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
        {error || "No attendance data found"}
      </div>
    );
  }

  const currentClassData = attendance[0];

  return (
    <div className="space-y-6 container">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/classrooms"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Quay lại
          </Link>
          <h1 className="text-2xl font-semibold">Chi tiết lớp học</h1>
        </div>
        <div className="flex items-center gap-2">
          {recording ? (
            <div className="space-y-4">
              {recording.isRecording ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-red-500 font-medium">Đang ghi...</span>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={stopRecording}
                    className="gap-2"
                  >
                    <StopCircle className="h-4 w-4" />
                    Dừng ghi hình
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {recording.blob && (
                    <Button onClick={uploadRecording} className="gap-2">
                      <FileText className="h-4 w-4" />
                      Lưu video
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Button
              onClick={startRecording}
              className="gap-2"
              disabled={!!recordingError}
            >
              <Video className="h-4 w-4" />
              Bắt đầu ghi hình
            </Button>
          )}
        </div>
      </div>

      {recordingError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{recordingError}</AlertDescription>
        </Alert>
      )}

      {recording && !recording.isRecording && recording.blob && (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <video
              src={URL.createObjectURL(recording.blob)}
              controls
              className="w-full rounded-lg shadow-lg"
            />
          </CardContent>
        </Card>
      )}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DashboardHeader
        title={currentClassData.classId}
        description={currentClassData.subjectName}
      />

      {/* Classroom Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-3 text-blue-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Lịch học</p>
                <p className="text-sm text-gray-500">
                  {currentClassData.schoolShift &&
                  currentClassData.schoolShift.length > 0
                    ? getDayOfWeek(currentClassData.schoolShift[0].day) +
                      ", " +
                      formatTimeRange(
                        currentClassData.schoolShift[0].startTime,
                        currentClassData.schoolShift[0].endTime
                      )
                    : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-3 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Phòng học</p>
                <p className="text-sm text-gray-500">
                  {currentClassData.roomId || "N/A"}
                </p>
              </div>
            </div>            
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-3 text-green-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Giáo viên</p>
                <p className="text-sm text-gray-500">
                  {currentClassData.staffName ? (
                    <Link 
                      href={`/dashboard/teachers/${currentClassData.staffId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {currentClassData.staffName}
                    </Link>
                  ) : (
                    "N/A"
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-3 text-purple-600">
                <Video className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium">Ghi hình</p>                  <p className="text-sm text-gray-600">
                    {recording?.isRecording ? "Đang ghi" : recording?.blob ? "Đã ghi xong" : "Chưa ghi hình"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Attendance and Diary */}
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">Điểm danh</TabsTrigger>
          <TabsTrigger value="diary">Nhật ký lớp học</TabsTrigger>
        </TabsList>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bản ghi chấm công</CardTitle>
              <CardDescription>
                Xem và quản lý điểm danh lớp học
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Không có bản ghi điểm danh nào
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead>Giờ học</TableHead>
                        <TableHead>Phòng học</TableHead>
                        <TableHead>Số học sinh</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {" "}
                      {attendance.map((record) => (
                        <TableRow key={record._id}>
                          <TableCell>{formatDate(record.date)}</TableCell>
                          <TableCell>
                            {formatTimeRange(record.startTime, record.endTime)}
                          </TableCell>
                          <TableCell>{record.roomId}</TableCell>
                          <TableCell>{record.numberOfStudent}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.isAttended ? "default" : "secondary"
                              }
                              className={
                                record.isAttended
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : ""
                              }
                            >
                              {record.isAttended
                                ? record.attendanceDetail?.confirmed
                                  ? "Đã xác nhận"
                                  : "Đã điểm danh"
                                : "Chưa điểm danh"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setSelectedAttendance(record._id)
                                  }
                                >
                                  <MessageSquare className="mr-2 h-4 w-4" />
                                  Thêm ghi chú
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>
                                    Thêm ghi chú - {formatDate(record.date)}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Thêm ghi chú hoặc nhận xét về buổi học này
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <div className="grid gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="comment">Ghi chú</Label>
                                      <Input
                                        id="comment"
                                        value={commentText}
                                        onChange={(e) =>
                                          setCommentText(e.target.value)
                                        }
                                        placeholder="Nhập ghi chú của bạn tại đây..."
                                        className="min-h-[100px]"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="attachments">
                                        Đính kèm
                                      </Label>
                                      <Input
                                        id="attachments"
                                        type="file"
                                        onChange={(e) => {
                                          if (e.target.files) {
                                            setSelectedFiles(
                                              Array.from(e.target.files)
                                            );
                                          }
                                        }}
                                        multiple
                                      />
                                      {selectedFiles.length > 0 && (
                                        <div className="text-sm text-gray-500">
                                          Đã chọn {selectedFiles.length} tệp
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      type="submit"
                                      onClick={async () => {
                                        if (
                                          !commentText.trim() ||
                                          !selectedAttendance
                                        )
                                          return;
                                        try {
                                          setIsSubmitting(true);
                                          await toast.promise(
                                            classroomService.postComment({
                                              attendanceId: selectedAttendance,
                                              content: commentText,
                                              files:
                                                selectedFiles.length > 0
                                                  ? selectedFiles
                                                  : undefined,
                                            }),
                                            {
                                              loading: "Đang thêm ghi chú...",
                                              success: () => {
                                                setCommentText("");
                                                setSelectedFiles([]);
                                                fetchAttendanceData();
                                                return "Đã thêm ghi chú thành công";
                                              },
                                              error:
                                                "Có lỗi xảy ra khi thêm ghi chú",
                                            }
                                          );
                                        } catch (error) {
                                          console.error(
                                            "Error posting comment:",
                                            error
                                          );
                                          toast.error(
                                            "Không thể thêm ghi chú. Vui lòng thử lại sau."
                                          );
                                        } finally {
                                          setIsSubmitting(false);
                                        }
                                      }}
                                      disabled={
                                        isSubmitting || !commentText.trim()
                                      }
                                    >
                                      {isSubmitting
                                        ? "Đang gửi..."
                                        : "Gửi ghi chú"}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diary Tab */}
        <TabsContent value="diary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nhật ký lớp học</CardTitle>
              <CardDescription>
                Ghi lại các ghi chú, quan sát và tiến trình cho lớp học này
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* New Diary Entry Form */}
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="diary-content">Mục nhật ký mới</Label>
                      <Input
                        id="diary-content"
                        value={diaryContent}
                        onChange={(e) => setDiaryContent(e.target.value)}
                        placeholder="Hôm nay lớp học như thế nào?"
                        className="h-24"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="diary-attachments">Đính kèm</Label>
                      <Input
                        id="diary-attachments"
                        type="file"
                        onChange={(e) => {
                          if (e.target.files) {
                            setDiaryFiles(Array.from(e.target.files));
                          }
                        }}
                        multiple
                      />
                      {diaryFiles.length > 0 && (
                        <div className="text-sm text-gray-500">
                          Đã chọn {diaryFiles.length} tệp
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={async () => {
                          if (!diaryContent.trim()) return;
                          try {
                            setIsSubmitting(true);
                            await toast.promise(
                              classroomService.postDiary({
                                classCode: classId,
                                content: diaryContent,
                                files:
                                  diaryFiles.length > 0
                                    ? diaryFiles
                                    : undefined,
                              }),
                              {
                                loading: "Đang thêm mục nhật ký...",
                                success: () => {
                                  setDiaryContent("");
                                  setDiaryFiles([]);
                                  setDiaryEntries([
                                    {
                                      id: `diary${new Date().getTime()}`,
                                      date: new Date().toISOString(),
                                      content: diaryContent,
                                      author: "Giáo viên",
                                      attachments: [],
                                    },
                                    ...diaryEntries,
                                  ]);
                                  return "Đã thêm mục nhật ký thành công";
                                },
                                error: "Có lỗi xảy ra khi thêm mục nhật ký",
                              }
                            );
                          } catch (error) {
                            console.error("Error posting diary:", error);
                            toast.error(
                              "Không thể thêm mục nhật ký. Vui lòng thử lại sau."
                            );
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={isSubmitting || !diaryContent.trim()}
                      >
                        {isSubmitting ? "Đang đăng..." : "Đăng mục nhật ký"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Diary Entries List */}
              <div className="space-y-4">
                {diaryEntries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Chưa có mục nhật ký nào
                  </div>
                ) : (
                  diaryEntries.map((entry) => (
                    <Card key={entry.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="border-b bg-slate-50 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs">
                                {entry.author
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {entry.author}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(entry.date)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="text-sm whitespace-pre-line">
                            {entry.content}
                          </p>
                          {entry.attachments &&
                            entry.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {entry.attachments.map((attachment, i) => (
                                  <div
                                    key={i}
                                    className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs"
                                  >
                                    <FileText className="h-3 w-3" />
                                    <span>tệp-đính-kèm-{i + 1}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <Toaster position="top-right" expand={true} richColors />
    </div>
  );
}
