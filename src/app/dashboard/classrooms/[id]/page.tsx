"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  classroomService,
  type Attendance,
  type Classroom,
} from "@/lib/api/classroom";
import { Toaster } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import DashboardHeader from "@/components/dashboard-header";
import Loader from "@/components/loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClassroomInfoCard } from "@/components/classroom/ClassroomInfoCard";
import { AttendanceTable } from "@/components/classroom/AttendanceTable";
import { ClassroomDiary } from "@/components/classroom/ClassroomDiary";

interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  author: string;
  attachments: any[];
}

export default function ClassroomDetailPage() {
  const params = useParams();
  const classId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "";
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentClassData, setCurrentClassData] = useState<Classroom | null>(
    null
  );

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
  };

  // Get current attendance ID for today
  const getCurrentAttendanceId = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayAttendance = attendance.find((record) =>
      record.date.startsWith(today)
    );
    return todayAttendance?._id;
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
            classroomService.getClassroomAttendance(classId),
          ]);
          if (isMounted) {
            const classroom = classrooms.find((c) => c.classID === classId);
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
      </div>{" "}
      <div className="grid gap-4">
        <ClassroomInfoCard
          classroom={currentClassData}
          attendanceId={getCurrentAttendanceId()}
        />

        <Tabs defaultValue="attendance" className="w-full">
          <TabsList>
            <TabsTrigger value="attendance">Điểm danh</TabsTrigger>
            <TabsTrigger value="diary">Nhật ký</TabsTrigger>
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
          </TabsContent>{" "}
        </Tabs>
      </div>
    </div>
  );
}
