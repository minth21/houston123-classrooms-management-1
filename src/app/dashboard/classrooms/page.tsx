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
import { classroomService, Classroom } from "@/lib/api/classroom";
import DashboardHeader from "@/components/dashboard-header";
import Loader from "@/components/loader";
import {
  Search,
  Calendar,
  Clock,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [filteredClassrooms, setFilteredClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const [branchSelected, setBranchSelected] = useState(false);

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
        setError("Please select a company and branch first");
      } else {
        setError("Failed to load classrooms. Please try again.");
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
      // Filter for upcoming classes
      filtered = filtered.filter((classroom) => {
        return classroom.isActive;
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

  // Navigate to classroom details using window.location to prevent route refresh issues
  const handleViewClassroom = (classroomId: string) => {
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
            Vui lòng chọn công ty và chi nhánh
          </h3>
          <p className="text-gray-500 mb-4">
            Bạn cần chọn công ty và chi nhánh trước khi xem danh sách lớp học
          </p>
          <div className="bg-yellow-50 p-4 rounded-lg inline-block">
            <p className="text-yellow-600">
              Sử dụng menu thả xuống ở phía trên để chọn
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
            Không tìm thấy lớp học nào với bộ lọc hiện tại.
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          {" "}
          <TableRow>
            <TableHead>Mã lớp</TableHead>
            <TableHead>Tên môn học</TableHead>
            <TableHead>Giáo viên</TableHead>
            <TableHead>Lương GV</TableHead>
            <TableHead>Tình trạng</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClassrooms.map((classroom) => (
            <TableRow key={classroom.classID} suppressHydrationWarning>
              <TableCell className="font-medium">{classroom.classID}</TableCell>{" "}
              <TableCell>{classroom.subjectName}</TableCell>
              <TableCell>{classroom.teacherName}</TableCell>
              <TableCell>
                {classroom.salary ? (
                  <span className="text-green-600 font-medium">
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(classroom.salary.__v || 0)}
                  </span>
                ) : (
                  <span className="text-gray-400">Chưa cập nhật</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={classroom.isActive ? "default" : "secondary"}>
                  {classroom.isActive ? "Đang hoạt động" : "Không hoạt động"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewClassroom(classroom.classID)}
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
        title="Classrooms"
        description="Xem và quản lý tất cả lớp học của bạn"
        onBranchSelect={handleBranchSelect}
      />
      {/* Tabs and Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Danh sách lớp học</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Tìm kiếm lớp học..."
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
                <TabsTrigger value="all">Tất cả lớp</TabsTrigger>
                <TabsTrigger value="today">Lớp học hôm nay</TabsTrigger>
                <TabsTrigger value="upcoming">Sắp tới</TabsTrigger>
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
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
