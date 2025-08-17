"use client";
import React from "react";
import { FlattenedScoreRow } from "@/types/scoreSheet";
import { useTranslation } from "react-i18next";

interface ScoreSummaryGraphProps {
  rows: FlattenedScoreRow[];
}

// Simple bar summary (no external chart lib for now)
export const ScoreSummaryGraph: React.FC<ScoreSummaryGraphProps> = ({ rows }) => {
  const { t } = useTranslation();
  if (!rows.length) return null;

  const agg = { listening: 0, speaking: 0, reading: 0, writing: 0, count: 0 };
  rows.forEach(r => {
    if (typeof r.listening === 'number' && typeof r.speaking === 'number' && typeof r.reading === 'number' && typeof r.writing === 'number') {
      agg.listening += r.listening;
      agg.speaking += r.speaking;
      agg.reading += r.reading;
      agg.writing += r.writing;
      agg.count++;
    }
  });
  if (!agg.count) return null;
  const avg = {
    listening: agg.listening / agg.count,
    speaking: agg.speaking / agg.count,
    reading: agg.reading / agg.count,
    writing: agg.writing / agg.count,
  };
  const max = Math.max(...Object.values(avg));

  const skills: { key: keyof typeof avg; label: string }[] = [
    { key: 'listening', label: t('scoreSheet.columns.listening') },
    { key: 'speaking', label: t('scoreSheet.columns.speaking') },
    { key: 'reading', label: t('scoreSheet.columns.reading') },
    { key: 'writing', label: t('scoreSheet.columns.writing') },
  ];

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{t('scoreSheet.summary.title')}</h4>
      <div className="grid gap-3 md:grid-cols-2">
        {skills.map(s => {
          const val = avg[s.key];
          const pct = max ? (val / max) * 100 : 0;
          return (
            <div key={s.key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{s.label}</span>
                <span>{val.toFixed(2)}</span>
              </div>
              <div className="h-2 w-full rounded bg-muted">
                <div className="h-2 rounded bg-primary transition-all" style={{ width: pct + '%' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
