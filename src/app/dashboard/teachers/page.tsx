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
import { useTranslation } from "react-i18next";

export default function TeachersPage() {
  const {t} = useTranslation();
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
        setError(t("teachersPage.errors.invalidData"));
      }
    } catch (err: any) {
      console.error("Error loading teachers:", err);
      if (err.message === "Please select a company and branch first") {
        setError(t("teachersPage.errors.selectCompanyAndBranch"));
      } else if (err.message === "Please select a company first") {
        setError(t("teachersPage.errors.selectCompany"));
      } else if (err.message === "Please select a branch first") {
        setError(t("teachersPage.errors.selectBranch"));
      } else if (err.message === "No branches found for the selected company") {
        setError(t("teachersPage.errors.noBranchFound"));
      } else if (err.message === "Invalid branch selected") {
        setError(t("teachersPage.errors.invalidBranch"));
      } else {
        setError(t("teachersPage.errors.loadFailed", { message: err.message }));
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
             {t("teachersPage.selectionPrompt.title")}
          </h3>
          <p className="text-gray-500 mb-4">
            {t("teachersPage.selectionPrompt.description")}
          </p>
          <div className="bg-yellow-50 p-4 rounded-lg inline-block">
            <p className="text-yellow-600">
              {t("teachersPage.selectionPrompt.instruction")}
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
          <p className="text-gray-500">{t("teachersPage.emptyState.noTeachers")}</p>
        </div>
      );
    }

    if (filteredTeachers.length === 0 && searchQuery) {
      return (
        <div className="py-8 text-center">
      <p className="text-gray-500">{t("teachersPage.emptyState.noSearchResults", { query: searchQuery })}</p>

        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("teachersPage.tableHeaders.teacher")}</TableHead>
            <TableHead>{t("teachersPage.tableHeaders.Id")}</TableHead>
            <TableHead>{t("teachersPage.tableHeaders.position")}</TableHead>
            <TableHead>{t("teachersPage.tableHeaders.email")}</TableHead>
            <TableHead>{t("teachersPage.tableHeaders.phone")}</TableHead>
            <TableHead>{t("teachersPage.tableHeaders.branch")}</TableHead>
            <TableHead className="text-right">{t("teachersPage.tableHeaders.actions")}</TableHead>
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
           {teacher.shortPermissionName || teacher.permission || t("teachersPage.defaultPosition")}
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
                  t("common.notAvailable")
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
                    t("common.notAvailable")
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
                  {t("teachersPage.actions.details")}
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
        title={t("teachersPage.header.title")}
        description={t("teachersPage.header.description")}
      />

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle></CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder={t("teachersPage.searchPlaceholder")}
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
