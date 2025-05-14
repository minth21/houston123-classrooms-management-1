"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BookOpen, Users, Calendar, BarChart } from "lucide-react";
import DashboardHeader from "@/components/dashboard-header";
import { classroomService, Classroom } from "@/lib/api/classroom";
import Loader from "@/components/loader";
import { QuickStatCard } from "../../components/ui/quick-stat-card";
import { ActivityItem } from "../../components/ui/activity-item";
import { calculateStats, formatRelativeTime } from "./utils";

interface ActivityData {
  title: string;
  description: string;
  time: string;
}

export default function DashboardPage() {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await classroomService.getClassrooms();
        setClassrooms(data);

        const attendancePromises = data
          .filter((classroom) => classroom.isActive)
          .slice(0, 5)
          .map((classroom) => classroomService.getClassroomAttendance(classroom.classID));

        const attendanceResults = await Promise.all(attendancePromises);

        const activities = attendanceResults
          .flat()
          .filter((attendance) => attendance.isAttended)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3)
          .map((attendance) => ({
            title: "Class attendance updated",
            description: attendance.subjectName,
            time: formatRelativeTime(new Date(attendance.date)),
          }));

        setRecentActivity(activities);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedBranch]);

  const handleBranchSelect = (branchCode: string) => {
    setSelectedBranch(branchCode);
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-500">
        {error}
      </div>
    );
  }

  const stats = calculateStats(classrooms);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Dashboard"
        description="Welcome to Houston123 Classroom Management System"
        onBranchSelect={handleBranchSelect}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <QuickStatCard
          title="Total Classes"
          value={stats.activeClasses.toString()}
          description="Active classes"
          icon={<BookOpen className="h-6 w-6" />}
          color="bg-blue-50 text-blue-700"
        />
        <QuickStatCard
          title="Students"
          value={stats.totalStudents.toString()}
          description="Across all branches"
          icon={<Users className="h-6 w-6" />}
          color="bg-green-50 text-green-700"
        />
        <QuickStatCard
          title="This Week"
          value={stats.upcomingClasses.toString()}
          description="Upcoming classes"
          icon={<Calendar className="h-6 w-6" />}
          color="bg-purple-50 text-purple-700"
        />
        <QuickStatCard
          title="Active Classes"
          value={`${stats.activeRate}%`}
          description="Activity rate"
          icon={<BarChart className="h-6 w-6" />}
          color="bg-amber-50 text-amber-700"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Link href="/dashboard/classrooms">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="mr-2 h-4 w-4" />
                  View All Classes
                </Button>
              </Link>
              <Link href="/dashboard/classrooms?filter=today">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Today's Classes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Recent activity across your classes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  No recent activity
                </div>
              ) : (
                recentActivity.map((activity, index) => (
                  <ActivityItem key={index} {...activity} />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
