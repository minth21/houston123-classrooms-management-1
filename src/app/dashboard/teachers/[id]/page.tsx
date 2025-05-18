"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { teacherService, Teacher } from "@/lib/api/teacher";
import DashboardHeader from "@/components/dashboard-header";
import Loader from "@/components/loader";
import {
  Clock,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  ChevronLeft,
  School,
  Building2,
} from "lucide-react";

export default function TeacherDetailPage() {
  const params = useParams();
  const teacherId = params.id as string;

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch teacher data
  const fetchTeacherData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await teacherService.getTeacherById(teacherId);
      if (data) {
        setTeacher(data);
      } else {
        setError("Không tìm thấy thông tin giáo viên");
      }
    } catch (err: any) {
      console.error("Error fetching teacher:", err);
      setError(
        err.message ||
          "Có lỗi xảy ra khi tải thông tin giáo viên. Vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (teacherId) {
      fetchTeacherData();
    }
  }, [teacherId]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  // Get teacher's initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
        {error || "Không tìm thấy thông tin giáo viên"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Link
          href="/dashboard/teachers"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Quay lại danh sách giáo viên
        </Link>
      </div>

      <DashboardHeader
        title={teacher.name}
        description={`Mã GV: ${teacher.staffId}`}
      />

      {/* Basic Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start space-x-6">
            <Avatar className="h-24 w-24">
              {teacher.imageUrl && (
                <AvatarImage src={teacher.imageUrl} alt={teacher.name} />
              )}
              <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">
                {getInitials(teacher.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-blue-100 p-3 text-blue-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Chức vụ</p>
                    <p className="text-sm text-gray-500">
                      {teacher.positionName ||
                        teacher.shortPermissionName ||
                        "Teacher"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-purple-100 p-3 text-purple-600">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Trình độ học vấn</p>
                    <p className="text-sm text-gray-500">
                      {teacher.educationBackground || "Chưa cập nhật"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-amber-100 p-3 text-amber-600">
                    <School className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Chi nhánh</p>
                    <p className="text-sm text-gray-500">
                      {teacher.branch?.join(", ") || "Chưa cập nhật"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacher.email && (
                  <Link
                    href={`mailto:${teacher.email}`}
                    className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Mail className="h-4 w-4" />
                    <span>{teacher.email}</span>
                  </Link>
                )}

                {teacher.phoneNumber && (
                  <Link
                    href={`tel:${teacher.phoneNumber}`}
                    className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Phone className="h-4 w-4" />
                    <span>{teacher.phoneNumber}</span>
                  </Link>
                )}

                {teacher.address && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{teacher.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Schedule and Other Info */}
      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule">Lịch dạy</TabsTrigger>
          <TabsTrigger value="info">Thông tin thêm</TabsTrigger>
        </TabsList>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lịch dạy trong tuần</CardTitle>
            </CardHeader>
            <CardContent>
              {teacher.schedule && teacher.schedule.length > 0 ? (
                <div className="space-y-4">
                  {teacher.schedule.map((slot) => (
                    <div
                      key={slot._id}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="rounded-full bg-blue-100 p-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{slot.classId}</p>
                          <p className="text-sm text-gray-500">
                            {`Thứ ${slot.day + 1}, ${slot.startTime} - ${
                              slot.endTime
                            }`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{slot.roomId}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  Chưa có lịch dạy
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Additional Info Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin chi tiết</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teacher.personalId && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        CMND/CCCD
                      </p>
                      <p>{teacher.personalId}</p>
                    </div>
                  )}
                  {teacher.birthday && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Ngày sinh
                      </p>
                      <p>{formatDate(teacher.birthday)}</p>
                    </div>
                  )}
                </div>

                {teacher.baseSalary && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">
                      Thông tin lương
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Lương theo giờ</p>
                        <p className="font-medium">
                          {teacher.baseSalary.hour.toLocaleString("vi-VN")} VNĐ
                        </p>
                      </div>
                      {teacher.baseSalary.shift > 0 && (
                        <div>
                          <p className="text-xs text-gray-500">Lương ca</p>
                          <p className="font-medium">
                            {teacher.baseSalary.shift.toLocaleString("vi-VN")}{" "}
                            VNĐ
                          </p>
                        </div>
                      )}
                      {teacher.baseSalary.month > 0 && (
                        <div>
                          <p className="text-xs text-gray-500">Lương tháng</p>
                          <p className="font-medium">
                            {teacher.baseSalary.month.toLocaleString("vi-VN")}{" "}
                            VNĐ
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
