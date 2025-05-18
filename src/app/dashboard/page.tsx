"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { classroomService, Classroom } from "@/lib/api/classroom";
import ClassScheduleCalendar from "@/components/classroom-schedule-calendar";
import DashboardHeader from "@/components/dashboard-header";
import Loader from "@/components/loader";
import { Search, Calendar, Clock, Users, BookOpen } from "lucide-react";

// Define a calendar view type
type CalendarView = "day" | "week" | "month" | "list";

export default function SchedulePage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarView, setCalendarView] = useState<CalendarView>("month"); // Default to month view
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  // Load user preferences
  useEffect(() => {
    try {
      // Load saved view preference
      const savedView = localStorage.getItem("calendarView");
      if (savedView && ["day", "week", "month", "list"].includes(savedView)) {
        setCalendarView(savedView as CalendarView);
      }

      // Load saved date preference
      const savedDate = localStorage.getItem("calendarDate");
      if (savedDate) {
        const parsedDate = new Date(savedDate);
        if (!isNaN(parsedDate.getTime())) {
          setCalendarDate(parsedDate);
        }
      }
    } catch (error) {
      console.error("Error loading calendar preferences:", error);
    }
  }, []);

  // Save user preferences when they change
  useEffect(() => {
    try {
      localStorage.setItem("calendarView", calendarView);
      localStorage.setItem("calendarDate", calendarDate.toISOString());
    } catch (error) {
      console.error("Error saving calendar preferences:", error);
    }
  }, [calendarView, calendarDate]);

  // Load classrooms
  const loadClassrooms = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await classroomService.getClassrooms();

      // Filter out classrooms with no schedule data to avoid empty entries
      const filteredData = data.filter(
        (classroom) => classroom.schedule && classroom.schedule.length > 0
      );

      setClassrooms(filteredData);
      setFilteredClassrooms(filteredData);

      if (searchQuery) {
        handleSearch(searchQuery);
      }
    } catch (err: any) {
      setError("Failed to load classrooms. Please try again.");
      console.error("Error loading classrooms:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load classrooms on mount
  useEffect(() => {
    loadClassrooms();
  }, []);

  // Handle search input
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      const filtered = classrooms.filter(
        (classroom) =>
          classroom.classID.toLowerCase().includes(query.toLowerCase()) ||
          classroom.subjectName.toLowerCase().includes(query.toLowerCase()) ||
          (classroom.teacherName &&
            classroom.teacherName.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredClassrooms(filtered);
    } else {
      setFilteredClassrooms(classrooms);
    }
  };

  // Handle view change
  const handleViewChange = (view: CalendarView) => {
    setCalendarView(view);
  };

  // Handle date change
  const handleDateChange = (date: Date) => {
    setCalendarDate(date);
  };

  // Render content based on loading and error states
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="py-8 text-center">
          <Loader size="md" />
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
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">
            {searchQuery
              ? "Không tìm thấy lớp học nào phù hợp với từ khóa tìm kiếm."
              : "Không có lịch học nào. Vui lòng thêm lịch cho các lớp học."}
          </p>
        </div>
      );
    }

    return (
      <ClassScheduleCalendar
        classrooms={filteredClassrooms}
        initialView={calendarView}
        initialDate={calendarDate}
        onViewChange={handleViewChange}
        onDateChange={handleDateChange}
      />
    );
  };

  const getActiveClassCount = () => {
    return classrooms.filter((c) => c.isActive).length;
  };

  const getTodayClassCount = () => {
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    return classrooms.filter((classroom) => {
      if (!classroom.schedule) return false;
      return classroom.schedule.some((s) => s.dayOfWeek === today);
    }).length;
  };

  const getTotalStudentsCount = () => {
    return classrooms.reduce(
      (sum, classroom) => sum + (classroom.studentNumber || 0),
      0
    );
  };

  const getTeachersCount = () => {
    // Get unique teachers
    const teachers = new Set();
    classrooms.forEach((classroom) => {
      if (classroom.teacherName) teachers.add(classroom.teacherName);
    });
    return teachers.size;
  };

  return (
    <div className="space-y-6">
      {" "}
      <DashboardHeader
        title="Lịch học"
        description="Xem và quản lý lịch học của tất cả lớp"
      />
      {!isLoading && !error && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-blue-100 p-3 text-blue-600">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Lớp đang hoạt động
                  </p>
                  <h3 className="text-2xl font-bold">
                    {getActiveClassCount()}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-amber-100 p-3 text-amber-600">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Lớp học hôm nay
                  </p>
                  <h3 className="text-2xl font-bold">{getTodayClassCount()}</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-green-100 p-3 text-green-600">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Tổng số học sinh
                  </p>
                  <h3 className="text-2xl font-bold">
                    {getTotalStudentsCount()}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-purple-100 p-3 text-purple-600">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Giáo viên
                  </p>
                  <h3 className="text-2xl font-bold">{getTeachersCount()}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Search bar */}
      {!isLoading && !error && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="relative w-full max-w-md mx-auto">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Tìm kiếm lớp học, giáo viên, phòng học..."
                className="pl-10 w-full"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1.5 h-7 px-2"
                  onClick={() => handleSearch("")}
                >
                  Xóa
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <div className="space-y-4">{renderContent()}</div>
    </div>
  );
}
