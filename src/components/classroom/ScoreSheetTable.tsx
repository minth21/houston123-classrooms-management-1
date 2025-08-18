"use client";
import React from "react";
import { FlattenedScoreRow } from "@/types/scoreSheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";

interface ScoreSheetTableProps {
  rows: FlattenedScoreRow[];
  isLoading?: boolean;
  onSelectStudent?: (row: FlattenedScoreRow) => void;
}

export const ScoreSheetTable: React.FC<ScoreSheetTableProps> = ({ rows, isLoading, onSelectStudent }) => {
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">{t("loading")}</div>;
  }
  if (!rows.length) {
    return <div className="p-4 text-sm text-muted-foreground">{t("scoreSheet.empty")}</div>;
  }

  return (
    <ScrollArea className="h-[400px] w-full rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>{t("scoreSheet.columns.student")}</TableHead>
            <TableHead>{t("scoreSheet.columns.listening")}</TableHead>
            <TableHead>{t("scoreSheet.columns.speaking")}</TableHead>
            <TableHead>{t("scoreSheet.columns.reading")}</TableHead>
            <TableHead>{t("scoreSheet.columns.writing")}</TableHead>
            <TableHead>{t("scoreSheet.columns.average")}</TableHead>
            <TableHead>{t("scoreSheet.columns.type", 'Type')}</TableHead>
            <TableHead>{t("scoreSheet.columns.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, idx) => {
            const rowMissing = r.missing;
            return (
              <TableRow key={r.userID} className={(rowMissing ? 'bg-amber-50 dark:bg-amber-900/10 ' : '') + (onSelectStudent ? 'cursor-pointer hover:bg-muted/50' : '')} onClick={() => onSelectStudent?.(r)}>
                <TableCell className="font-medium">{idx + 1}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{r.userName}</span>
                    <span className="text-xs text-muted-foreground">{r.userID}</span>
                  </div>
                </TableCell>
                <TableCell>{r.listening ?? '-'}</TableCell>
                <TableCell>{r.speaking ?? '-'}</TableCell>
                <TableCell>{r.reading ?? '-'}</TableCell>
                <TableCell>{r.writing ?? '-'}</TableCell>
                <TableCell>{r.average ?? '-'}</TableCell>
                <TableCell>
                  {r.raw ? (
                    r.raw.type === 0 ? (
                      <Badge variant="outline">{t('scoreSheet.type.process')}</Badge>
                    ) : (
                      <Badge variant="outline">{t('scoreSheet.type.final')}</Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="opacity-50">-</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {rowMissing ? (
                    <Badge variant="destructive">{t("scoreSheet.status.incomplete")}</Badge>
                  ) : r.approved ? (
                    <Badge variant="secondary">{t("scoreSheet.status.approved")}</Badge>
                  ) : (
                    <Badge variant="outline">{t("scoreSheet.status.pending")}</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};
