"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { classroomService, Classroom } from "@/lib/api/classroom";
import { useStaff } from "@/context/staff-context";
import DashboardHeader from "@/components/dashboard-header";
import Loader from "@/components/loader";
import { Search, Calendar, Clock, ChevronRight, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

export default function ClassroomsPage() {
  const router = useRouter();
  const { staff } = useStaff();
  const { t } = useTranslation();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const [branchSelected, setBranchSelected] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(
    null
  );
  const [isTimeDialogOpen, setIsTimeDialogOpen] = useState(false);
  const DEBUG = typeof window !== "undefined" && (window as any).__APP_DEBUG__ === true;

  const parseISOToDate = (value?: string | null): Date | null => {
    if (!value) return null;
    if (/([zZ]|[+\-]\d{2}:?\d{2})$/.test(value)) {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    const [datePart, timePart] = value.split("T");
    if (!datePart) return null;
    const [y, m, d] = datePart.split("-").map(Number);
    if (!y || !m || !d) return null;
    if (!timePart) return new Date(y, m - 1, d, 0, 0, 0, 0);
    const [hh, mm = "0", ss = "0"] = timePart.split(":");
    return new Date(y, m - 1, d, Number(hh), Number(mm), Number(ss));
  };

  // Load classrooms based on the selected branch and staff role
  const loadClassrooms = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!staff) {
        setError("Staff information not available");
        return;
      }

  const data = await classroomService.getClassrooms();
  const filteredData = data.filter((c) => c.teacherCode === staff.userId);

      setClassrooms(filteredData);
      setFilteredClassrooms(filteredData);
      if (filteredData.length > 0) {
        applyFilters(filteredData, searchQuery, filterParam || "all");
      }
    } catch (err: any) {
      if (err.message === "Please select a company and branch first") {
        setError(t("classroomsPage.errors.selectCompanyAndBranch"));
      } else {
        setError(t("classroomsPage.errors.loadFailed"));
        console.error("Error loading classrooms:", err);
      }
    } finally {
      setIsLoading(false);
    }
  };
  // Check authentication and branch selection when staff data is available
  useEffect(() => {
    const checkBranchAndLoad = () => {
      const branch = localStorage.getItem("selectedBranch");
      const company = localStorage.getItem("selectedCompany");
      if (branch && company && staff) {
  if (DEBUG) console.log("Loading classrooms with staff:", staff);
        setBranchSelected(true);
        loadClassrooms();
      }
    };
    checkBranchAndLoad();
  }, [staff]); // Add staff as a dependency

  // Apply filters to the classrooms data
  const applyFilters = (data: Classroom[], query: string, tab: string) => {
    let filtered = [...data];

    // Apply search filter
    if (query) {
      filtered = filtered.filter(
        (classroom) =>
          classroom.classID.toLowerCase().includes(query.toLowerCase()) ||
          classroom.subjectName.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply tab filter
    if (tab === "today") {
      const today = new Date().toISOString().split("T")[0];
      // Filter classrooms for today's classes based on schedule data
      filtered = filtered.filter((classroom) => {
        const schedules = classroom.schedule || [];
        const todayDayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
        return schedules.some((s) => s.dayOfWeek === todayDayOfWeek);
      });
    } else if (tab === "upcoming") {
      // Upcoming = classes whose first startDate is in future (>= now) within next 7 days
      // AND not already finished (finishDate >= now) and active
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((classroom) => {
        if (!classroom.isActive) return false;
        const start = parseISOToDate(classroom.startDate);
        if (!start) return false;
        // If finishDate exists and is before now -> exclude
        const finish = parseISOToDate(classroom.finishDate);
        if (finish && finish < now) return false;
        return start >= now && start <= nextWeek;
      });
    } else if (tab === "monday") {
      // Filter classes that have schedules on Monday
      filtered = filtered.filter((classroom) => {
        const schedules = classroom.schedule || [];
        return schedules.some((s) => s.dayOfWeek === 1);
      });
    } else if (tab === "wednesday") {
      // Filter classes that have schedules on Wednesday
      filtered = filtered.filter((classroom) => {
        const schedules = classroom.schedule || [];
        return schedules.some((s) => s.dayOfWeek === 3);
      });
    } else if (tab === "friday") {
      // Filter classes that have schedules on Friday
      filtered = filtered.filter((classroom) => {
        const schedules = classroom.schedule || [];
        return schedules.some((s) => s.dayOfWeek === 5);
      });
    } else if (tab === "weekend") {
      // Filter classes that have schedules on weekends (Saturday or Sunday)
      filtered = filtered.filter((classroom) => {
        const schedules = classroom.schedule || [];
        return schedules.some((s) => s.dayOfWeek === 0 || s.dayOfWeek === 6);
      });
    }

    // Enforce global finishDate filtering for all tabs (remove classes already ended)
    const now = new Date();
    filtered = filtered.filter((c) => {
      const finish = parseISOToDate(c.finishDate);
      return !finish || finish >= now;
    });

    setFilteredClassrooms(filtered);
  };

  // Handle search input
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(classrooms, query, filterParam || "all");
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    applyFilters(classrooms, searchQuery, value);
    // Update URL query params without causing a full page reload
    const newUrl = `/dashboard/classrooms${
      value !== "all" ? `?filter=${value}` : ""
    }`;
    window.history.pushState({}, "", newUrl);
  };
  // Navigate to classroom details or show the time schedule dialog
  const handleViewClassroom = (classroomId: string) => {
    const classroom = classrooms.find((c) => c.classID === classroomId);
    if (classroom) {
      setSelectedClassroom(classroom);
      setIsTimeDialogOpen(true);
    } else {
      window.location.href = `/dashboard/classrooms/${classroomId}`;
    }
  };

  // View full details by navigating to the classroom detail page
  const handleViewFullDetails = (classroomId: string) => {
    window.location.href = `/dashboard/classrooms/${classroomId}`;
  };

  // Update the renderContent function
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="py-8 text-center">
          <Loader size="md" />
        </div>
      );
    }

    if (!branchSelected) {
      return (
        <div className="py-12 text-center">
          <h3 className="text-xl font-semibold mb-2">
            {t("classroomsPage.selectionPrompt.title")}
          </h3>
          <p className="text-gray-500 mb-4">
            {t("classroomsPage.selectionPrompt.description")}
          </p>
          <div className="bg-yellow-50 p-4 rounded-lg inline-block">
            <p className="text-yellow-600">
              {t("classroomsPage.selectionPrompt.description")}
            </p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="py-8 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      );
    }

    if (filteredClassrooms.length === 0) {
      return (
        <div className="py-8 text-center">
          <p className="text-gray-500">
            {t("classroomsPage.emptyState.noResults")}
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("classroomsPage.tableHeaders.classId")}</TableHead>
            <TableHead>{t("classroomsPage.tableHeaders.subject")}</TableHead>
            <TableHead>{t("classroomsPage.tableHeaders.teacher")}</TableHead>
            <TableHead>{t("classroomsPage.tableHeaders.startDate")}</TableHead>
            <TableHead>{t("classroomsPage.tableHeaders.endDate")}</TableHead>
            <TableHead>{t("classroomsPage.tableHeaders.status")}</TableHead>
            <TableHead className="text-right">
              {t("classroomsPage.tableHeaders.actions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClassrooms.map((classroom) => (
            <TableRow key={classroom.classID} suppressHydrationWarning>
              <TableCell className="font-medium">{classroom.classID}</TableCell>
              <TableCell>{classroom.subjectName}</TableCell>
              <TableCell>{classroom.teacherName}</TableCell>
              <TableCell>
                {classroom.startDate ? (
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4 text-blue-500" />
                    {new Date(classroom.startDate).toLocaleDateString(
                      i18n.language === "vi" ? "vi-VN" : "en-US"
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">
                    {t("common.notUpdated")}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {classroom.finishDate ? (
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4 text-red-500" />
                    {new Date(classroom.finishDate).toLocaleDateString(
                      i18n.language === "vi" ? "vi-VN" : "en-US"
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">
                    {t("common.notUpdated")}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={classroom.isActive ? "default" : "secondary"}>
                  {classroom.isActive
                    ? t("classroomsPage.status.active")
                    : t("classroomsPage.status.inactive")}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="mr-2"
                  onClick={() => handleViewClassroom(classroom.classID)}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  {t("classroomsPage.actions.viewSchedule")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewFullDetails(classroom.classID)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={t("classroomsPage.header.title")}
        description={t("classroomsPage.header.description")}
      />
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>{t("classroomsPage.header.title")}</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder={t("classroomsPage.searchPlaceholder") as string}
                className="pl-8 w-full sm:w-[260px]"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!branchSelected ? (
            renderContent()
          ) : (
            <Tabs
              defaultValue="all"
              value={filterParam || "all"}
              onValueChange={handleTabChange}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="all">
                  {t("classroomsPage.filters.all")}
                </TabsTrigger>
                <TabsTrigger value="today">
                  {t("classroomsPage.filters.today")}
                </TabsTrigger>
                <TabsTrigger value="upcoming">
                  {t("classroomsPage.filters.upcoming")}
                </TabsTrigger>
                <TabsTrigger value="monday">
                  {t("classroomsPage.filters.monday")}
                </TabsTrigger>
                <TabsTrigger value="wednesday">
                  {t("classroomsPage.filters.wednesday")}
                </TabsTrigger>
                <TabsTrigger value="friday">
                  {t("classroomsPage.filters.friday")}
                </TabsTrigger>
                <TabsTrigger value="weekend">
                  {t("classroomsPage.filters.weekend")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="space-y-4">
                {renderContent()}
              </TabsContent>
              <TabsContent value="today" className="space-y-4">
                {renderContent()}
              </TabsContent>
              <TabsContent value="upcoming" className="space-y-4">
                {renderContent()}
              </TabsContent>
              <TabsContent value="monday" className="space-y-4">
                {renderContent()}
              </TabsContent>
              <TabsContent value="wednesday" className="space-y-4">
                {renderContent()}
              </TabsContent>
              <TabsContent value="friday" className="space-y-4">
                {renderContent()}
              </TabsContent>
              <TabsContent value="weekend" className="space-y-4">
                {renderContent()}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
      {/* Dialog translation left for future extension */}
    </div>
  );
}
