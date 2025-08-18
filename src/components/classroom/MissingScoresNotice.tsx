"use client";
import React from "react";
import { FlattenedScoreRow } from "@/types/scoreSheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "react-i18next";

interface MissingScoresNoticeProps {
  rows: FlattenedScoreRow[];
}

export const MissingScoresNotice: React.FC<MissingScoresNoticeProps> = ({ rows }) => {
  const { t } = useTranslation();
  const missing = rows.filter(r => r.missing);
  if (!missing.length) return null;
  return (
    <Alert>
      <AlertDescription>
        {t('scoreSheet.missingNotice', { count: missing.length })}
      </AlertDescription>
    </Alert>
  );
};
