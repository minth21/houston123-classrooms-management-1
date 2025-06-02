"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  classroomService,
  type Attendance,
  type RecordingSettings,
  type Classroom,
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
import { ClassroomInfoCard } from "@/components/classroom/ClassroomInfoCard";
import { AttendanceTable } from "@/components/classroom/AttendanceTable";
import { ClassroomDiary } from "@/components/classroom/ClassroomDiary";
import { RecordingControls } from "@/components/classroom/RecordingControls";

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
  const [recordingSettings, setRecordingSettings] = useState<RecordingSettings>();
  const [currentClassData, setCurrentClassData] = useState<Classroom | null>(null);

  // Fetch classroom data
  const fetchClassroomData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const classrooms = await classroomService.getClassrooms();
      const classroom = classrooms.find(c => c.classID === classId);
      if (!classroom) {
        throw new Error("Classroom not found");
      }
      setCurrentClassData(classroom);
    } catch (err) {
      setError("Failed to load classroom data");
      setCurrentClassData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const attendanceData = await classroomService.getClassroomAttendance(classId);
      setAttendance(attendanceData);
    } catch (err) {
      setError("Failed to load classroom data");
      setAttendance([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle comment submission
  const handleCommentSubmit = async (attendanceId: string, content: string) => {
    await classroomService.postComment({
      attendanceId,
      content,
    });
    await fetchAttendanceData();
  };

  // Handle diary submission
  const handleDiarySubmit = async (content: string, files: File[]) => {
    await classroomService.postDiary({
      classCode: classId,
      content,
      files,
    });
    // TODO: Implement diary entries fetching
  };
  // Handle recording upload for live class
  const handleLiveRecordingUpload = async (file: File, attendanceId: string) => {
    try {
      await classroomService.postComment({
        attendanceId,
        content: "Video ghi hình buổi học",
        files: [file],
      });

      await fetchAttendanceData();
      toast.success("Upload video thành công!");
    } catch (error) {
      console.error("Error uploading recording:", error);
      toast.error("Có lỗi xảy ra khi upload video");
      throw error;
    }
  };

  // Get current attendance ID for today
  const getCurrentAttendanceId = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.find(record => 
      record.date.startsWith(today)
    );
    return todayAttendance?._id;
  };

  // TODO: Implement recording settings API integration
  const handleSaveRecordingSettings = async (settings: RecordingSettings) => {
    try {
      // TODO: Call API to save settings
      setRecordingSettings(settings);
      toast.success("Đã lưu cấu hình ghi hình thành công");
    } catch (error) {
      console.error("Error saving recording settings:", error);
      toast.error("Có lỗi xảy ra khi lưu cấu hình ghi hình");
    }
  };

  // Load data on mount
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        if (classId && isMounted) {
          setIsLoading(true);
          setError(null);
          const [classrooms, attendanceData] = await Promise.all([
            classroomService.getClassrooms(),
            classroomService.getClassroomAttendance(classId)
          ]);
          if (isMounted) {
            const classroom = classrooms.find(c => c.classID === classId);
            if (!classroom) {
              throw new Error("Classroom not found");
            }
            setCurrentClassData(classroom);
            setAttendance(attendanceData);
            setIsLoading(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load classroom data");
          setCurrentClassData(null);
          setAttendance([]);
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [classId]);

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!currentClassData) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>Classroom not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Toaster />
      <DashboardHeader 
        title={currentClassData.classID}
        description={currentClassData.subjectName}
      />

      <div className="mb-4">
        <Link href="/dashboard/classrooms">
          <Button variant="ghost" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Quay lại
          </Button>
        </Link>
      </div>      <div className="grid gap-4">
        <ClassroomInfoCard 
          classroom={currentClassData} 
          attendanceId={getCurrentAttendanceId()}
          onRecordingUpload={handleLiveRecordingUpload}
        />

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList>
            <TabsTrigger value="attendance">Điểm danh</TabsTrigger>
            <TabsTrigger value="diary">Nhật ký</TabsTrigger>
            <TabsTrigger value="recording">Ghi hình</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
            <AttendanceTable
              attendance={attendance}
              onCommentSubmit={handleCommentSubmit}
            />
          </TabsContent>

          <TabsContent value="diary">
            <ClassroomDiary
              diaryEntries={diaryEntries}
              onDiarySubmit={handleDiarySubmit}
            />
          </TabsContent>          <TabsContent value="recording">
            <RecordingControls
              onUpload={(recording: any) => {
                if (!recording.blob) {
                  throw new Error("No recording to upload");
                }

                const file = new File([recording.blob], `recording-${Date.now()}.webm`, {
                  type: "video/webm",
                });

                const attendanceId = getCurrentAttendanceId();
                if (!attendanceId) {
                  throw new Error("No attendance record found for today");
                }

                return handleLiveRecordingUpload(file, attendanceId);
              }}
              recordingSettings={recordingSettings}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
