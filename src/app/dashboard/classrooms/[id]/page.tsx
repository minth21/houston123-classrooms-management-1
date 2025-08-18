"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  classroomService,
  type Attendance,
  type Classroom,
} from "@/lib/api/classroom";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";

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
import { ClassroomMembersTable } from "@/components/classroom/ClassroomMembersTable";
import type { ClassroomMember } from "@/types/classroomMember";
import { ScoreSheetTable } from "@/components/classroom/ScoreSheetTable";
import { ScoreSummaryGraph } from "@/components/classroom/ScoreSummaryGraph";
import { MissingScoresNotice } from "@/components/classroom/MissingScoresNotice";
import {
  flattenScoreSheet,
  type ScoreSheetResponse,
  type FlattenedScoreRow,
} from "@/types/scoreSheet";
import { ScoreDetailDialog } from "@/components/classroom/ScoreDetailDialog";
import { ScoreProgressDashboard } from "@/components/classroom/ScoreProgressDashboard";
import { ScoreEditDialog } from "@/components/classroom/ScoreEditDialog";

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
  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [scoreMonth, setScoreMonth] = useState<number>(
    new Date().getMonth() + 1
  );
  const [scoreYear, setScoreYear] = useState<number>(new Date().getFullYear());
  const [scoreType, setScoreType] = useState<number>(0);
  const [scoreData, setScoreData] = useState<ScoreSheetResponse | null>(null);
  const [scoreRows, setScoreRows] = useState<FlattenedScoreRow[]>([]);
  const [selectedScoreRow, setSelectedScoreRow] =
    useState<FlattenedScoreRow | null>(null);
  const [isScoreDialogOpen, setIsScoreDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isScoresLoading, setIsScoresLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentClassData, setCurrentClassData] = useState<Classroom | null>(
    null
  );
  const { t } = useTranslation();

  // Helper to merge existing score rows (if any) with classroom members so that
  // every student is displayed even if they have no score entries yet.
  function buildScoreRows(
    resp: ScoreSheetResponse | null,
    memberList: ClassroomMember[],
    classID: string,
    month: number,
    year: number
  ): FlattenedScoreRow[] {
    const rows: FlattenedScoreRow[] = resp
      ? flattenScoreSheet(resp, classID, month, year)
      : [];
    const existingIds = new Set(rows.map((r) => r.userID));
    memberList.forEach((m) => {
      const id = (m as any).userID || (m as any).userId; // adapt to possible backend field variants
      if (!existingIds.has(id)) {
        rows.push({
          userID: id,
            // fallback to empty string if name missing to keep sort stable
          userName: m.name || "",
          grade: (m as any).grade,
          missing: true,
          raw: null,
        });
      }
    });
    return rows.sort((a, b) => a.userName.localeCompare(b.userName));
  }

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
      setError(t("classroomDetailPage.errors.loadFailed"));
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
          // Fetch members separately (non-blocking UI of initial data)
          setIsMembersLoading(true);
          classroomService
            .getClassroomMembers(classId, { isOriginal: true })
            .then((m) => setMembers(m))
            .catch(() => setMembers([]))
            .finally(() => setIsMembersLoading(false));
          // Preload score sheet
          setIsScoresLoading(true);
          classroomService
            .getClassroomScoreSheet({
              classID: classId,
              month: scoreMonth,
              year: scoreYear,
              type: scoreType,
            })
            .then((resp) => {
              setScoreData(resp);
              if (resp) {
                setScoreRows(
                  buildScoreRows(resp, members, classId, scoreMonth, scoreYear)
                );
              } else {
                setScoreRows(
                  buildScoreRows(null, members, classId, scoreMonth, scoreYear)
                );
              }
            })
            .finally(() => setIsScoresLoading(false));
          if (isMounted) {
            let classroom = classrooms.find((c) => c.classID === classId);
            if (!classroom) {
              console.warn(
                "Classroom not found in list, attempting fallback fetch",
                { classId }
              );
              const fetched = await classroomService.getClassroomById(classId);
              if (fetched) classroom = fetched;
            }
            if (!classroom) {
              console.warn("Classroom not found after fallback", {
                requested: classId,
                available: classrooms.map((c) => c.classID).slice(0, 25),
                total: classrooms.length,
              });
              setError(t("classroomDetailPage.errors.notFound"));
              setCurrentClassData(null);
            } else setCurrentClassData(classroom);
            setAttendance(attendanceData);
            setIsLoading(false);
          }
        }
      } catch (err) {
        if (isMounted) {
          if (!error) {
            setError(t("classroomDetailPage.errors.loadFailed"));
          }
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [classId]);

  // Refetch scores when selector changes
  useEffect(() => {
    let active = true;
    if (!classId) return;
    setIsScoresLoading(true);
    classroomService
      .getClassroomScoreSheet({
        classID: classId,
        month: scoreMonth,
        year: scoreYear,
        type: scoreType,
      })
      .then((resp) => {
        if (!active) return;
        setScoreData(resp);
        setScoreRows(
          buildScoreRows(resp, members, classId, scoreMonth, scoreYear)
        );
      })
      .finally(() => active && setIsScoresLoading(false));
    return () => {
      active = false;
    };
  }, [scoreMonth, scoreYear, scoreType, classId]);

  // Recompute rows if members load after scores (or change)
  useEffect(() => {
    setScoreRows(
      buildScoreRows(scoreData, members, classId, scoreMonth, scoreYear)
    );
  }, [members]);

  // (Old inline buildScoreRows removed; consolidated above.)

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
          <AlertDescription>
            {t("classroomDetailPage.errors.loadFailed")}
          </AlertDescription>
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
            {t("classroomDetailPage.backToList")}
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
            <TabsTrigger value="attendance">
              {t("classroomDetailPage.tabs.attendance")}
            </TabsTrigger>
            <TabsTrigger value="diary">
              {t("classroomDetailPage.tabs.diary")}
            </TabsTrigger>
            <TabsTrigger value="members">
              {t("classroomDetailPage.tabs.members", "Members")}
            </TabsTrigger>
            <TabsTrigger value="scores">{t("scoreSheet.tab")}</TabsTrigger>
            <TabsTrigger value="progress">
              {t("progress.tab", "Progress")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="attendance">
            <AttendanceTable
              attendance={attendance}
              onCommentSubmit={handleCommentSubmit}
            />
          </TabsContent>{" "}
          <TabsContent value="diary">
            <ClassroomDiary
              diaryEntries={diaryEntries}
              onDiarySubmit={handleDiarySubmit}
              classroom={currentClassData}
            />
          </TabsContent>{" "}
          <TabsContent value="members">
            <ClassroomMembersTable
              members={members}
              isLoading={isMembersLoading}
            />
          </TabsContent>
          <TabsContent value="scores" className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex flex-col">
                <label className="text-xs font-medium">
                  {t("scoreSheet.filters.month")}
                </label>
                <select
                  className="border rounded px-2 py-1 text-sm bg-background"
                  value={scoreMonth}
                  onChange={(e) => setScoreMonth(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium">
                  {t("scoreSheet.filters.year")}
                </label>
                <select
                  className="border rounded px-2 py-1 text-sm bg-background"
                  value={scoreYear}
                  onChange={(e) => setScoreYear(Number(e.target.value))}
                >
                  {Array.from(
                    { length: 3 },
                    (_, i) => new Date().getFullYear() - i
                  ).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium">
                  {t("scoreSheet.filters.type")}
                </label>
                <select
                  className="border rounded px-2 py-1 text-sm bg-background"
                  value={scoreType}
                  onChange={(e) => setScoreType(Number(e.target.value))}
                >
                  <option value={0}>{t("scoreSheet.type.process")}</option>
                  <option value={1}>{t("scoreSheet.type.final")}</option>
                </select>
              </div>
            </div>
            <MissingScoresNotice rows={scoreRows} />
            <ScoreSummaryGraph rows={scoreRows} />
            <ScoreSheetTable
              rows={scoreRows}
              isLoading={isScoresLoading}
              onSelectStudent={(r) => {
                setSelectedScoreRow(r);
                setIsScoreDialogOpen(true);
              }}
            />
            <ScoreDetailDialog
              open={isScoreDialogOpen}
              onOpenChange={(o) => {
                setIsScoreDialogOpen(o);
                if (!o) setSelectedScoreRow(null);
              }}
              row={selectedScoreRow}
              onEdit={(r) => {
                setIsScoreDialogOpen(false);
                setSelectedScoreRow(r);
                setIsEditDialogOpen(true);
              }}
            />
            <ScoreEditDialog
              open={isEditDialogOpen}
              onOpenChange={(o) => {
                setIsEditDialogOpen(o);
                if (!o) setSelectedScoreRow(null);
              }}
              row={selectedScoreRow}
              classID={classId}
              month={scoreMonth}
              year={scoreYear}
              type={scoreType}
              onSaved={async () => {
                setIsScoresLoading(true);
                const resp = await classroomService.getClassroomScoreSheet({
                  classID: classId,
                  month: scoreMonth,
                  year: scoreYear,
                  type: scoreType,
                });
                setScoreData(resp);
                setScoreRows(
                  buildScoreRows(resp, members, classId, scoreMonth, scoreYear)
                );
                setIsScoresLoading(false);
              }}
            />
          </TabsContent>
          <TabsContent value="progress" className="space-y-4">
            <ScoreProgressDashboard
              classID={classId}
              baseMonth={scoreMonth}
              baseYear={scoreYear}
              type={scoreType}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
