"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import DashboardHeader from "@/components/dashboard-header";
import Loader from "@/components/loader";
import {
  Search,
  Calendar,
  Clock,
  ChevronRight,
  ExternalLink,
  Users,
} from "lucide-react";

export default function ClassroomsPage() {
  const { t, i18n} = useTranslation();
  const router = useRouter();
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

  // Load classrooms based on the selected branch
  const loadClassrooms = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await classroomService.getClassrooms();
      setClassrooms(data);
      setFilteredClassrooms(data);
      if (data.length > 0) {
        applyFilters(data, searchQuery, filterParam || "all");
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

  // Check authentication and branch selection only once on mount
  useEffect(() => {
    const checkBranchAndLoad = () => {
      const branch = localStorage.getItem("selectedBranch");
      const company = localStorage.getItem("selectedCompany");
      if (branch && company) {
        setBranchSelected(true);
        loadClassrooms();
      }
    };
    checkBranchAndLoad();
  }, []);

  // Handle branch selection
  const handleBranchSelect = () => {
    setBranchSelected(true);
    loadClassrooms();
  };

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
      // Filter for upcoming classes (starting within the next 7 days)
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      filtered = filtered.filter((classroom) => {
        if (!classroom.startDate) return false;
        const start = new Date(classroom.startDate);
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
             {t("classroomsPage.selectionPrompt.instruction")}
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
          {" "}
          <TableRow>
              <TableHead>{t("classroomsPage.tableHeaders.classId")}</TableHead>
            <TableHead>{t("classroomsPage.tableHeaders.subject")}</TableHead>
            <TableHead>{t("classroomsPage.tableHeaders.teacher")}</TableHead>
            <TableHead>{t("classroomsPage.tableHeaders.startDate")}</TableHead>
            <TableHead>{t("classroomsPage.tableHeaders.endDate")}</TableHead>
            <TableHead>{t("classroomsPage.tableHeaders.status")}</TableHead>
            <TableHead className="text-right">{t("classroomsPage.tableHeaders.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
              {filteredClassrooms.map((classroom) => (
            <TableRow key={classroom.classID} suppressHydrationWarning>
              {" "}
              <TableCell className="font-medium">
                {classroom.classID}
              </TableCell>{" "}
              <TableCell>{classroom.subjectName}</TableCell>
              <TableCell>{classroom.teacherName}</TableCell>
              <TableCell>
                {classroom.startDate ? (
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4 text-blue-500" />
                    {/* Giả sử bạn có i18n từ useTranslation() để định dạng ngày tự động */}
                    {new Date(classroom.startDate).toLocaleDateString(i18n.language)}
                  </div>
                ) : (
                  <span className="text-gray-400">{t("common.notUpdated")}</span>
                )}
              </TableCell>
              <TableCell>
                {classroom.finishDate ? (
                  <div className="flex items-center">
                    <Calendar className="mr-1 h-4 w-4 text-red-500" />
                    {new Date(classroom.finishDate).toLocaleDateString(i18n.language)}
                  </div>
                ) : (
                  <span className="text-gray-400">{t("common.notUpdated")}</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={classroom.isActive ? "default" : "secondary"}>
                  {classroom.isActive 
                    ? t("classroomsPage.status.active") 
                    : t("classroomsPage.status.inactive")}
                </Badge>
              </TableCell>{" "}
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
      {/* Tabs and Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle></CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder={t("classroomsPage.searchPlaceholder")}
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
              {" "}
              <TabsList className="mb-4">
                <TabsTrigger value="all">{t("classroomsPage.filters.all")}</TabsTrigger>
                <TabsTrigger value="today">{t("classroomsPage.filters.today")}</TabsTrigger>
                <TabsTrigger value="upcoming">{t("classroomsPage.filters.upcoming")}</TabsTrigger>
                <TabsTrigger value="monday">{t("classroomsPage.filters.monday")}</TabsTrigger>
                <TabsTrigger value="wednesday">{t("classroomsPage.filters.wednesday")}</TabsTrigger>
                <TabsTrigger value="friday">{t("classroomsPage.filters.friday")}</TabsTrigger>
                <TabsTrigger value="weekend">{t("classroomsPage.filters.weekend")}</TabsTrigger>
              </TabsList>{" "}
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
          )}{" "}
        </CardContent>
      </Card>

      {/* Dialog for classroom schedule */}
      <Dialog open={isTimeDialogOpen} onOpenChange={setIsTimeDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-blue-500" />
              {/* highlight-next-line */}
              {t("classroomsPage.dialog.title", { classId: selectedClassroom?.classID })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic class info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  {/* highlight-next-line */}
                  {t("classroomsPage.tableHeaders.subject")}
                </h3>
                <p className="text-base">{selectedClassroom?.subjectName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  {/* highlight-next-line */}
                  {t("classroomsPage.tableHeaders.teacher")}
                </h3>
                <p className="text-base">{selectedClassroom?.teacherName}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  {/* highlight-next-line */}
                  {t("classroomsPage.tableHeaders.startDate")}
                </h3>
                <p className="text-base flex items-center">
                  <Calendar className="mr-1 h-4 w-4 text-blue-500" />
                  {selectedClassroom?.startDate
                    // highlight-start
                    ? new Date(selectedClassroom.startDate).toLocaleDateString(i18n.language)
                    : t("common.notUpdated")
                    // highlight-end
                  }
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  {/* highlight-next-line */}
                  {t("classroomsPage.tableHeaders.endDate")}
                </h3>
                <p className="text-base flex items-center">
                  <Calendar className="mr-1 h-4 w-4 text-red-500" />
                  {selectedClassroom?.finishDate
                    // highlight-start
                    ? new Date(selectedClassroom.finishDate).toLocaleDateString(i18n.language)
                    : t("common.notUpdated")
                    // highlight-end
                  }
                </p>
              </div>
            </div>{" "}
    {/* Study time table */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="mr-1 h-4 w-4" />
                {t("classroomsPage.dialog.scheduleTitle")}
              </span>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto"
                onClick={() => {
                  setIsTimeDialogOpen(false);
                  router.push("/dashboard/class-schedule");
                }}
              >
                {t("classroomsPage.dialog.viewAllSchedulesButton")}
              </Button>
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("classroomsPage.dialog.tableHeaders.day")}</TableHead>
                  <TableHead>{t("classroomsPage.dialog.tableHeaders.start")}</TableHead>
                  <TableHead>{t("classroomsPage.dialog.tableHeaders.end")}</TableHead>
                  <TableHead>{t("classroomsPage.dialog.tableHeaders.room")}</TableHead>
                </TableRow>
              </TableHeader>
            </Table>
          </div>
            {/* Student attendance */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
              <Users className="mr-1 h-4 w-4" />
              {/* highlight-next-line */}
              {t("classroomsPage.dialog.studentCount", { count: selectedClassroom?.member?.length || 0 })}
            </h3>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() =>
                handleViewFullDetails(selectedClassroom?.classID || "")
              }
              className="mr-2"
            >
              {/* highlight-next-line */}
              {t("classroomsPage.actions.details")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsTimeDialogOpen(false)}
            >
              {/* highlight-next-line */}
              {t("common.close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
);
}
