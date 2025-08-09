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
} from "lucide-react";
import Link from "next/link";
import DashboardHeader from "@/components/dashboard-header";
import Loader from "@/components/loader";
import { RecordingSettingsDialog } from "@/components/recording-settings-dialog";
import { useTranslation } from "react-i18next";
import { vi, enUS } from "date-fns/locale";

interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  author: string;
  attachments: any[];
}

export default function ClassroomDetailPage() {
   const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('vi') ? vi : enUS;
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
  const [recordingSettings, setRecordingSettings] = useState<RecordingSettings>();

  const handleSaveRecordingSettings = async (settings: RecordingSettings) => {
    try {
      setIsSubmitting(true);
      // Tạm thời chỉ lưu vào state, trong thực tế bạn sẽ gọi API để lưu
      setRecordingSettings(settings);
      toast.success(t("classroomDetailPage.toasts.saveRecordingSettingsSuccess"));
    } catch (error) {
      console.error("Error saving recording settings:", error);
      toast.error(t("classroomDetailPage.toasts.saveRecordingSettingsError"));
    } finally {
      setIsSubmitting(false);
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
          setError(t("classroomDetailPage.errors.loadFailed"));
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
    return new Intl.DateTimeFormat(i18n.language, {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }).format(date);
  };

  // Format time range
 const formatTimeRange = (startTime: string, endTime: string): string => {
    const formatTime = (time: string) => time.slice(0, 5);
    const start = formatTime(startTime);
    const end = formatTime(endTime);
    return start && end ? `${start} - ${end}` : "";
  };

  // --- Lấy dữ liệu từ file JSON ---
const daysOfWeekData = t("classScheduleCalendar.daysOfWeek", { returnObjects: true });
const DAYS_OF_WEEK: string[] = Array.isArray(daysOfWeekData) ? daysOfWeekData : [];
  const getDayOfWeek = (day: number): string => {
    return DAYS_OF_WEEK[day % 7] || '';
  };


  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (error || attendance.length === 0) {
     return <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">{error || t("classroomDetailPage.errors.noDataFound")}
     </div>;
  }

  const currentClassData = attendance[0];

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Link
          href="/dashboard/classrooms"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("classroomDetailPage.backToList")}
        </Link>
      </div>

          <DashboardHeader 
          title={currentClassData.classId} 
          description={currentClassData.subjectName} />


      {/* Classroom Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-3 text-blue-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{t("classroomDetailPage.infoCard.schedule")}</p>
                <p className="text-sm text-gray-500">
                  {currentClassData.schoolShift &&
                  currentClassData.schoolShift.length > 0
                    ? getDayOfWeek(currentClassData.schoolShift[0].day) +
                      ", " +
                      formatTimeRange(
                        currentClassData.schoolShift[0].startTime,
                        currentClassData.schoolShift[0].endTime
                      )
                    : t("common.notAvailable")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-3 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{t("classroomDetailPage.infoCard.room")}</p>
                <p className="text-sm text-gray-500">
                  {currentClassData.roomId ||t("common.notAvailable")}
                </p>
              </div>
            </div>            
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-3 text-green-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{t("classroomDetailPage.infoCard.teacher")}</p>
                <p className="text-sm text-gray-500">
                  {currentClassData.staffName ? (
                    <Link 
                      href={`/dashboard/teachers/${currentClassData.staffId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {currentClassData.staffName}
                    </Link>
                  ) : (
                    (t("common.notAvailable"))                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-3 text-purple-600">
                <Video className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium">{t("classroomDetailPage.infoCard.recording")}</p>
                  <RecordingSettingsDialog
                    settings={recordingSettings}
                    onSave={handleSaveRecordingSettings}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Attendance and Diary */}
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">{t("classroomDetailPage.tabs.attendance")}</TabsTrigger>
          <TabsTrigger value="diary">{t("classroomDetailPage.tabs.diary")}</TabsTrigger>
        </TabsList>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("classroomDetailPage.attendance.title")}</CardTitle>
              <CardDescription>
                {t("classroomDetailPage.attendance.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t("classroomDetailPage.attendance.noRecords")}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                      <TableHead>{t("classroomDetailPage.attendance.table.date")}</TableHead>
                      <TableHead>{t("classroomDetailPage.attendance.table.time")}</TableHead>
                      <TableHead>{t("classroomDetailPage.attendance.table.room")}</TableHead>
                      <TableHead>{t("classroomDetailPage.attendance.table.studentCount")}</TableHead>
                      <TableHead>{t("classroomDetailPage.attendance.table.status")}</TableHead>
                      <TableHead>{t("classroomDetailPage.attendance.table.actions")}</TableHead>
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
                                  ? t("classroomDetailPage.attendance.status.confirmed")
                                : t("classroomDetailPage.attendance.status.attended")
                              : t("classroomDetailPage.attendance.status.notAttended")}
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
                                {t("classroomDetailPage.attendance.addNoteButton")}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                     <DialogTitle>
                                      {t("classroomDetailPage.attendance.dialog.title", { date: formatDate(record.date) })}
                                     </DialogTitle>
                                  <DialogDescription>
                                  {t("classroomDetailPage.attendance.dialog.description")}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                  <div className="grid gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="comment">{t("classroomDetailPage.attendance.dialog.noteLabel")}</Label>
                                      <Input
                                        id="comment"
                                        value={commentText}
                                        onChange={(e) =>
                                          setCommentText(e.target.value)
                                        }
                                        placeholder={t("classroomDetailPage.attendance.dialog.placeholder")}
                                        className="min-h-[100px]"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="attachments">
                                     {t("classroomDetailPage.attendance.dialog.attachmentsLabel")}
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
                                          {t("classroomDetailPage.attendance.dialog.filesSelected", { count: selectedFiles.length })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
 <div className="flex justify-end gap-2">
  <Button
    type="submit"
    onClick={async () => {
      if (!commentText.trim() || !selectedAttendance) return;
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
            // highlight-start
            loading: t("classroomDetailPage.toasts.addingNoteLoading"),
            success: () => {
              setCommentText("");
              setSelectedFiles([]);
              fetchAttendanceData();
              return t("classroomDetailPage.toasts.addNoteSuccess");
            },
            error: t("classroomDetailPage.toasts.addNoteError"),
            // highlight-end
          }
        );
      } catch (error) {
        console.error("Error posting comment:", error);
        // highlight-next-line
        toast.error(t("classroomDetailPage.toasts.addNoteFallbackError"));
      } finally {
        setIsSubmitting(false);
      }
    }}
    disabled={isSubmitting || !commentText.trim()}
  >
    {/* highlight-start */}
    {isSubmitting
      ? t("common.submitting")
      : t("classroomDetailPage.attendance.dialog.submitButton")}
    {/* highlight-end */}
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
              <CardTitle>{t("classroomDetailPage.diary.title")}</CardTitle>
             <CardDescription>
              {t("classroomDetailPage.diary.description")}
              </CardDescription>

            </CardHeader>
            <CardContent className="space-y-6">
              {/* New Diary Entry Form */}
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="diary-content">{t("classroomDetailPage.diary.newEntryLabel")}</Label>
                      <Input
                        id="diary-content"
                        value={diaryContent}
                        onChange={(e) => setDiaryContent(e.target.value)}
                        placeholder={t("classroomDetailPage.diary.placeholder")}
                        className="h-24"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="diary-attachments">{t("classroomDetailPage.attendance.dialog.attachmentsLabel")}</Label>
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
                          {t("classroomDetailPage.attendance.dialog.filesSelected", { count: diaryFiles.length })}
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
                                loading: t("classroomDetailPage.toasts.addingDiaryLoading"),
                                success: () => {
                                  setDiaryContent("");
                                  setDiaryFiles([]);
                                  setDiaryEntries([
                                    {
                                      id: `diary${new Date().getTime()}`,
                                      date: new Date().toISOString(),
                                      content: diaryContent,
                                      author: t("common.teacher") ,
                                      attachments: [],
                                    },
                                    ...diaryEntries,
                                  ]);
                                  return t("classroomDetailPage.toasts.addDiarySuccess");
                                 },
                                  error: t("classroomDetailPage.toasts.addDiaryError"),
                              }
                            );
                          } catch (error) {
                            console.error("Error posting diary:", error);
                            toast.error(
                            t("classroomDetailPage.toasts.addDiaryFallbackError")                            );
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        disabled={isSubmitting || !diaryContent.trim()}
                      >
                        {isSubmitting ? t("classroomDetailPage.diary.posting") 
                                      : t("classroomDetailPage.diary.submitButton")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Diary Entries List */}
              <div className="space-y-4">
                {diaryEntries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                  {t("classroomDetailPage.diary.noEntries")}
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
                                        <span>{t("classroomDetailPage.diary.attachmentFile", { index: i + 1 })}</span>
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
