import { Classroom } from "@/lib/api/classroom";

interface DashboardStats {
  activeClasses: number;
  totalStudents: number;
  upcomingClasses: number;
  activeRate: number;
}

export function calculateStats(classrooms: Classroom[]): DashboardStats {
  const activeClasses = classrooms.filter((c) => c.isActive).length;
  const totalStudents = classrooms.reduce((sum, c) => sum + (c.studentNumber || 0), 0);
  
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const upcomingClasses = classrooms.filter((c) => {
    const startDate = new Date(c.startDate);
    return startDate >= today && startDate <= nextWeek;
  }).length;

  const activeRate = classrooms.length ? Math.round((activeClasses / classrooms.length) * 100) : 0;

  return {
    activeClasses,
    totalStudents,
    upcomingClasses,
    activeRate,
  };
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return "Just now";
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInHours < 48) return "Yesterday";
  return `${Math.floor(diffInHours / 24)} days ago`;
}
