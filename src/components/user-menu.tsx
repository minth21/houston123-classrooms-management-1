"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/auth-context";
import { useStaff } from "@/context/staff-context";
import { LogOut, Building2, Phone, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function UserMenu() {
  const { logout } = useAuth();
  const { staff, loading } = useStaff();
  const { t } = useTranslation();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            {staff?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={staff.imageUrl}
                alt={staff.displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {staff ? getInitials(staff.displayName) : "..."}
              </AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex flex-col p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium text-base">
              {loading ? t("loading") : staff?.displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {staff?.positionName}
            </p>
            <p className="text-xs text-muted-foreground">
              {staff?.shortPermissionName}
            </p>
          </div>
          <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span>
                {t("userMenu.staffId")}: {staff?.userId}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span>{staff?.email}</span>
            </div>
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>{staff?.phoneNumber}</span>
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t("userMenu.logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
