"use client";

import React from "react";
import { ClassroomMember } from "@/types/classroomMember";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";

interface ClassroomMembersTableProps {
  members: ClassroomMember[];
  isLoading?: boolean;
}

export const ClassroomMembersTable: React.FC<ClassroomMembersTableProps> = ({ members, isLoading }) => {
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">{t("loading")}</div>;
  }

  if (!members.length) {
    return <div className="p-4 text-sm text-muted-foreground">{t("classroomDetailPage.classroom.members.empty")}</div>;
  }

  return (
    <ScrollArea className="h-[400px] w-full rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("classroomDetailPage.classroom.members.columns.index")}</TableHead>
            <TableHead>{t("classroomDetailPage.classroom.members.columns.userID")}</TableHead>
            <TableHead>{t("classroomDetailPage.classroom.members.columns.name")}</TableHead>
            <TableHead>{t("classroomDetailPage.classroom.members.columns.grade")}</TableHead>
            <TableHead>{t("classroomDetailPage.classroom.members.columns.school")}</TableHead>
            <TableHead>{t("classroomDetailPage.classroom.members.columns.phone")}</TableHead>
            <TableHead>{t("classroomDetailPage.classroom.members.columns.status")}</TableHead>
            <TableHead>{t("classroomDetailPage.classroom.members.columns.official")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m, idx) => (
            <TableRow key={m.id}>
              <TableCell className="font-medium">{idx + 1}</TableCell>
              <TableCell>{m.userID || m.userId}</TableCell>
              <TableCell>{m.name}</TableCell>
              <TableCell>{m.grade}</TableCell>
              <TableCell>{m.schoolName}</TableCell>
              <TableCell>
                <a href={`tel:${m.phoneNumber}`} className="hover:underline">{m.phoneNumber}</a>
              </TableCell>
              <TableCell>
                {m.status === 0 ? (
                  <Badge variant="secondary">{t("classroomDetailPage.classroom.members.status.active")}</Badge>
                ) : (
                  <Badge variant="outline">{m.status}</Badge>
                )}
              </TableCell>
              <TableCell>
                {m.isOfficial === 1 ? (
                  <Badge variant="default">{t("classroomDetailPage.classroom.members.official.yes")}</Badge>
                ) : (
                  <Badge variant="outline">{t("classroomDetailPage.classroom.members.official.no")}</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};
