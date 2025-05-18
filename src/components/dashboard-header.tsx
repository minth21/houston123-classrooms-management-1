"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export default function DashboardHeader({
  title,
  description,
  className = "",
}: DashboardHeaderProps) {
  const router = useRouter();

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
  }, [router]);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-gray-500 mt-1">{description}</p>}
        </div>
      </div>
    </div>
  );
}
