"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import UserMenu from "@/components/user-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Menu,
  X,
  Home,
  BookOpen,
  List,
  Users,
  Calendar,
  Settings,
  Bell,
  ChevronRight,
  Building2,
  MapPin,
  Video, // Thêm biểu tượng Video
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { companyService, Company, Branch } from "@/lib/api/company";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Define navigation items with support for nested items and icons
interface NavItem {
  name: string;
  path?: string;
  icon?: React.ReactNode;
  children?: NavItem[];
  badge?: string;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isAuthenticated, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { name: string; path: string }[]
  >([]);

  // Company and branch state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(
    companyService.getSelectedCompany()
  );
  const [selectedBranch, setSelectedBranch] = useState<string | null>(
    companyService.getSelectedBranch()
  );
  const [isCompanyLoading, setIsCompanyLoading] = useState(true);
  const [needsReload, setNeedsReload] = useState(false);

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setIsCompanyLoading(true);
        const data = await companyService.getCompanies();
        setCompanies(data);

        // If there's a selectedCompany, load its branches
        if (selectedCompany) {
          loadBranches(selectedCompany);
        } else if (data.length > 0) {
          // Auto-select the first company if none is selected
          handleCompanySelect(data[0]._id);
        }
      } catch (err) {
        console.error("Failed to load companies", err);
      } finally {
        setIsCompanyLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchCompanies();
    }
  }, [isAuthenticated]);

  // Load branches for a selected company
  const loadBranches = async (companyId: string) => {
    try {
      const data = await companyService.getBranches(companyId);
      setBranches(data);

      // If there's a stored selected branch and it belongs to this company, keep it selected
      const storedBranch = companyService.getSelectedBranch();
      const branchExists = data.some((branch) => branch.code === storedBranch);

      if (storedBranch && branchExists) {
        setSelectedBranch(storedBranch);
      } else if (data.length > 0) {
        // Auto-select the first branch if none is selected or current one doesn't belong to this company
        handleBranchSelect(data[0].code);
      } else {
        setSelectedBranch(null);
      }
    } catch (err) {
      console.error("Failed to load branches", err);
    }
  };

  // Handle company selection
  const handleCompanySelect = (companyId: string) => {
    if (companyId === selectedCompany) return;

    setSelectedCompany(companyId);
    companyService.setSelectedCompany(companyId);
    loadBranches(companyId);
    setNeedsReload(true);
  };

  // Handle branch selection
  const handleBranchSelect = (branchCode: string) => {
    if (branchCode === selectedBranch) return;

    setSelectedBranch(branchCode);
    companyService.setSelectedBranch(branchCode);
    setNeedsReload(true);
  };

  // Trigger page reload when branch or company changes
  useEffect(() => {
    if (needsReload) {
      // Reset the flag
      setNeedsReload(false);

      // For a SPA experience, we can use router.refresh()
      router.refresh();

      // If we need a stronger reset, use window.location.reload()
      // if (typeof window !== 'undefined') {
      //   window.location.reload();
      // }
    }
  }, [needsReload, router]);

  // Generate breadcrumbs based on current path
  useEffect(() => {
    const pathSegments = pathname.split("/").filter(Boolean);
    const breadcrumbItems = [];

    let currentPath = "";
    for (let i = 0; i < pathSegments.length; i++) {
      currentPath += `/${pathSegments[i]}`;

      // Find the name from navItems or use capitalized segment
      let name =
        pathSegments[i].charAt(0).toUpperCase() + pathSegments[i].slice(1);

      // For dashboard, use Dashboard instead of the segment
      if (pathSegments[i] === "dashboard" && i === 0) {
        name = "Dashboard";
      }

      breadcrumbItems.push({
        name,
        path: currentPath,
      });
    }

    setBreadcrumbs(breadcrumbItems);
  }, [pathname]);

  // Check authentication
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle logout
  const handleLogout = () => {
    logout();
  };

  // If still loading or not authenticated, show loading screen
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 rounded-full border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Navigation items with icons and dropdown structure
  const navItems: NavItem[] = [
    {
      name: "Tổng quan",
      path: "/dashboard",
      icon: <Home className="h-5 w-5" />,
    },
    {
      name: "Lớp học",
      icon: <BookOpen className="h-5 w-5" />,
      children: [
        {
          name: "Danh sách lớp",
          path: "/dashboard/classrooms",
          icon: <List className="h-4 w-4" />,
        },
        {
          name: "Lịch học",
          path: "/dashboard/schedule",
          icon: <Calendar className="h-4 w-4" />,
        },
        {
          name: "Ghi hình",
          path: "/dashboard/recordings",
          icon: <Video className="h-4 w-4" />,
        },
      ],
      badge: "New",
    },
    {
      name: "Học viên",
      path: "/dashboard/students",
      icon: <Users className="h-5 w-5" />,
    },
    {
      name: "Cài đặt",
      path: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  // Helper function to render sidebar nav items
  const renderNavItem = (item: NavItem) => {
    // Check if this item or any of its children is active
    const isItemActive = pathname === item.path;
    const isChildActive = item.children?.some(
      (child) => pathname === child.path
    );
    const isActive = isItemActive || isChildActive;

    // If item has children, render as collapsible section
    if (item.children) {
      return (
        <div key={item.name} className="mb-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`${isActive ? "text-blue-600" : "text-gray-500"}`}
                >
                  {item.icon}
                </div>
                {!isSidebarCollapsed && <span>{item.name}</span>}
                {!isSidebarCollapsed && item.badge && (
                  <Badge className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs">
                    {item.badge}
                  </Badge>
                )}
              </div>
              {!isSidebarCollapsed && <ChevronDown className="h-4 w-4" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-52">
              {item.children.map((child) => (
                <DropdownMenuItem key={child.path} asChild>
                  <Link
                    href={child.path || "#"}
                    className={`w-full flex items-center space-x-2 ${
                      pathname === child.path
                        ? "text-blue-700"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                  >
                    {child.icon}
                    <span>{child.name}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    // Otherwise render as regular link
    return (
      <Link
        key={item.path}
        href={item.path || "#"}
        className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium mb-1 transition-colors ${
          pathname === item.path
            ? "bg-blue-50 text-blue-700"
            : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
        }`}
      >
        <div
          className={`${
            pathname === item.path ? "text-blue-600" : "text-gray-500"
          }`}
        >
          {item.icon}
        </div>
        {!isSidebarCollapsed && <span>{item.name}</span>}
        {!isSidebarCollapsed && item.badge && (
          <Badge className="ml-auto px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs">
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  // Helper function to render mobile nav items
  const renderMobileNavItem = (item: NavItem) => {
    // If item has children, render with nested items
    if (item.children) {
      return (
        <div key={item.name} className="space-y-1">
          <div className="px-3 py-2 text-sm font-medium text-gray-800 flex items-center space-x-2">
            {item.icon}
            <span>{item.name}</span>
            {item.badge && (
              <Badge className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs">
                {item.badge}
              </Badge>
            )}
          </div>
          <div className="pl-8 space-y-1 border-l-2 border-gray-200">
            {item.children.map((child) => (
              <Link
                key={child.path}
                href={child.path || "#"}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === child.path
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {child.icon}
                <span>{child.name}</span>
              </Link>
            ))}
          </div>
        </div>
      );
    }

    // Otherwise render as regular link
    return (
      <Link
        key={item.path}
        href={item.path || "#"}
        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
          pathname === item.path
            ? "bg-blue-50 text-blue-700"
            : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        {item.icon}
        <span>{item.name}</span>
        {item.badge && (
          <Badge className="ml-auto px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs">
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              className="md:hidden text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>

            {/* Desktop sidebar toggle */}
            <button
              className="hidden md:flex text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/houston123-logo.png"
                alt="Houston123 Logo"
                width={140}
                height={40}
                className="h-8 w-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/next.svg";
                }}
              />
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative p-1 text-gray-500 hover:text-blue-600 focus:outline-none">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
            </button>

            {/* User menu */}
            <UserMenu />
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar - Desktop */}
        <aside
          className={`hidden md:block bg-white border-r shadow-sm transition-all ${
            isSidebarCollapsed ? "w-16" : "w-64"
          }`}
        >
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <div className="p-3">
              <nav className="flex flex-col space-y-1">
                {navItems.map(renderNavItem)}
              </nav>

              {/* Company and Branch Selection */}
              {!isSidebarCollapsed ? (
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-xs uppercase font-semibold text-gray-500 mb-3 px-3">
                    Vị trí hiện tại
                  </h3>

                  <div className="space-y-3 px-1">
                    {/* Company Select */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 px-2 text-xs text-gray-600">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>Công ty</span>
                      </div>
                      <Select
                        disabled={isCompanyLoading || companies.length === 0}
                        value={selectedCompany || ""}
                        onValueChange={handleCompanySelect}
                      >
                        <SelectTrigger className="w-full text-xs h-8">
                          <SelectValue placeholder="Chọn công ty" />
                        </SelectTrigger>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company._id} value={company._id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Branch Select */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 px-2 text-xs text-gray-600">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>Chi nhánh</span>
                      </div>
                      <Select
                        disabled={
                          isCompanyLoading ||
                          !selectedCompany ||
                          branches.length === 0
                        }
                        value={selectedBranch || ""}
                        onValueChange={handleBranchSelect}
                      >
                        <SelectTrigger className="w-full text-xs h-8">
                          <SelectValue placeholder="Chọn chi nhánh" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch._id} value={branch.code}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 border-t pt-4 px-3">
                  <div className="flex justify-center">
                    <Building2 className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="flex justify-center mt-4">
                    <MapPin className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Mobile sidebar overlay */}
        {isMobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-20 bg-black bg-opacity-50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <aside
          className={`md:hidden fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Image
              src="/houston123-logo.png"
              alt="Houston123 Logo"
              width={120}
              height={35}
              className="h-7 w-auto"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/next.svg";
              }}
            />
            <button onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <ScrollArea className="h-[calc(100vh-4rem)]">
            <div className="p-3">
              <nav className="flex flex-col space-y-1">
                {navItems.map(renderMobileNavItem)}
              </nav>

              {/* Company and Branch Selection for Mobile */}
              <div className="mt-6 border-t pt-4">
                <h3 className="text-xs uppercase font-semibold text-gray-500 mb-3 px-3">
                  Vị trí hiện tại
                </h3>

                <div className="space-y-3 px-1">
                  {/* Company Select */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 px-2 text-xs text-gray-600">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>Công ty</span>
                    </div>
                    <Select
                      disabled={isCompanyLoading || companies.length === 0}
                      value={selectedCompany || ""}
                      onValueChange={handleCompanySelect}
                    >
                      <SelectTrigger className="w-full text-xs h-8">
                        <SelectValue placeholder="Chọn công ty" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company._id} value={company._id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Branch Select */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 px-2 text-xs text-gray-600">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Chi nhánh</span>
                    </div>
                    <Select
                      disabled={
                        isCompanyLoading ||
                        !selectedCompany ||
                        branches.length === 0
                      }
                      value={selectedBranch || ""}
                      onValueChange={handleBranchSelect}
                    >
                      <SelectTrigger className="w-full text-xs h-8">
                        <SelectValue placeholder="Chọn chi nhánh" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch._id} value={branch.code}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <hr className="my-4 border-gray-200" />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-center mt-2"
              >
                Đăng xuất
              </Button>
            </div>
          </ScrollArea>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {/* Breadcrumbs */}
          <div className="bg-white p-4 border-b">
            <div className="container mx-auto">
              <div className="flex items-center text-sm text-gray-500">
                {breadcrumbs.map((item, index) => (
                  <div key={item.path} className="flex items-center">
                    {index > 0 && (
                      <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
                    )}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="font-medium text-blue-600">
                        {item.name}
                      </span>
                    ) : (
                      <Link href={item.path} className="hover:text-blue-600">
                        {item.name}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="container mx-auto px-4 py-6">{children}</div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white py-4">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Houston123 Education. All rights
          reserved.
        </div>
      </footer>
    </div>
  );
}
