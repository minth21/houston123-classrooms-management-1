"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { teacherService, Teacher } from "@/lib/api/teacher";
import DashboardHeader from "@/components/dashboard-header";
import Loader from "@/components/loader";
import { Search, Mail, Phone, School } from "lucide-react";
import Link from "next/link";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(" ");
  const [branchSelected, setBranchSelected] = useState(false);
  const loadTeachers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setTeachers([]);
      setFilteredTeachers([]);

      console.log("Loading teachers...");
      const teachersList = await teacherService.getTeachers();
      console.log("Teachers data received:", teachersList);

      if (Array.isArray(teachersList)) {
        setTeachers(teachersList);
        setFilteredTeachers(teachersList);
        console.log(`Loaded ${teachersList.length} teachers`);
      } else {
        console.error("Invalid data format received");
        setError("Dữ liệu không hợp lệ");
      }
    } catch (err: any) {
      console.error("Error loading teachers:", err);
      if (err.message === "Please select a company and branch first") {
        setError("Vui lòng chọn công ty và chi nhánh trước");
      } else if (err.message === "Please select a company first") {
        setError("Vui lòng chọn công ty trước");
      } else if (err.message === "Please select a branch first") {
        setError("Vui lòng chọn chi nhánh trước");
      } else if (err.message === "No branches found for the selected company") {
        setError("Không tìm thấy chi nhánh nào cho công ty đã chọn");
      } else if (err.message === "Invalid branch selected") {
        setError("Chi nhánh đã chọn không hợp lệ");
      } else {
        setError("Không thể tải danh sách giáo viên: " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect to handle branch/company changes
  useEffect(() => {
    const checkAndLoad = async () => {
      const branch = localStorage.getItem("selectedBranch");
      const company = localStorage.getItem("selectedCompany");
      console.log("Current selection - Branch:", branch, "Company:", company);

      if (branch && company) {
        console.log("Loading teachers for", branch);
        setBranchSelected(true);
        await loadTeachers();
      } else {
        setBranchSelected(false);
        setTeachers([]);
        setFilteredTeachers([]);
      }
    };

    checkAndLoad();

    const handleStorageChange = () => {
      checkAndLoad();
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [loadTeachers]);

  const handleSearch = useCallback(
    (query: string) => {
      console.log("Searching for:", query, "in", teachers.length, "teachers");
      setSearchQuery(query);
      const trimmedQuery = query.trim().toLowerCase();

      if (!trimmedQuery) {
        console.log("Empty query, showing all teachers");
        setFilteredTeachers(teachers);
        return;
      }

      const filtered = teachers.filter(
        (teacher) =>
          teacher.name.toLowerCase().includes(trimmedQuery) ||
          teacher.staffId.toLowerCase().includes(trimmedQuery) ||
          (teacher.email &&
            teacher.email.toLowerCase().includes(trimmedQuery)) ||
          (teacher.phoneNumber &&
            teacher.phoneNumber.toLowerCase().includes(trimmedQuery))
      );

      console.log(`Found ${filtered.length} teachers matching "${query}"`);
      setFilteredTeachers(filtered);
    },
    [teachers]
  );

  // View teacher details
  const handleViewTeacher = (teacherId: string) => {
    window.location.href = `/dashboard/teachers/${teacherId}`;
  };

  // Get teacher's initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
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

    if (!branchSelected) {
      return (
        <div className="py-12 text-center">
          <h3 className="text-xl font-semibold mb-2">
            Vui lòng chọn công ty và chi nhánh
          </h3>
          <p className="text-gray-500 mb-4">
            Bạn cần chọn công ty và chi nhánh trước khi xem danh sách giáo viên
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
    if (teachers.length == 0) {
      return (
        <div className="py-8 text-center">
          <p className="text-gray-500">Chưa có giáo viên nào trong hệ thống.</p>
        </div>
      );
    }

    if (filteredTeachers.length === 0 && searchQuery) {
      return (
        <div className="py-8 text-center">
          <p className="text-gray-500">
            Không tìm thấy giáo viên nào phù hợp với từ khóa "{searchQuery}"
          </p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Giáo viên</TableHead>
            <TableHead>Mã GV</TableHead>
            <TableHead>Chức vụ</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Số điện thoại</TableHead>
            <TableHead>Chi nhánh</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(filteredTeachers || teachers).map((teacher) => (
            <TableRow key={teacher._id}>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {getInitials(teacher.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{teacher.name}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{teacher.staffId}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {teacher.shortPermissionName ||
                    teacher.permission ||
                    "Teacher"}
                </Badge>
              </TableCell>
              <TableCell>
                {teacher.email ? (
                  <Link
                    href={`mailto:${teacher.email}`}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    {teacher.email}
                  </Link>
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell>
                {teacher.phoneNumber ? (
                  <Link
                    href={`tel:${teacher.phoneNumber}`}
                    className="flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    {teacher.phoneNumber}
                  </Link>
                ) : (
                  "N/A"
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-1">
                  <School className="h-4 w-4 text-gray-500" />
                  <span>{teacher.branch?.join(", ")}</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewTeacher(teacher.staffId)}
                >
                  Chi tiết
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
        title="Giáo viên"
        description="Quản lý danh sách giáo viên của trung tâm"
      />

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Danh sách giáo viên</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Tìm kiếm giáo viên..."
                className="pl-8 w-full sm:w-[300px]"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
    </div>
  );
}
