"use client";
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FlattenedScoreRow, RawScoreItem } from '@/types/scoreSheet';
import { useTranslation } from 'react-i18next';

interface ScoreDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: FlattenedScoreRow | null;
}

export const ScoreDetailDialog: React.FC<ScoreDetailDialogProps> = ({ open, onOpenChange, row }) => {
  const { t } = useTranslation();
  const entry = row?.raw;
  const trueScore: RawScoreItem[] = entry?.score?.trueScore || [];
  const predicScore: RawScoreItem[] = entry?.score?.predicScore || [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('scoreSheet.detail.title', { name: row?.userName || '' })}</DialogTitle>
          <DialogDescription>
            {t('scoreSheet.detail.subtitle', { classID: entry?.classID, subject: entry?.subjectCode })}
          </DialogDescription>
        </DialogHeader>
        {row && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="font-medium">{t('scoreSheet.detail.student')}:</span> {row.userName} <span className="text-muted-foreground">({row.userID})</span></div>
              <div><span className="font-medium">{t('scoreSheet.detail.type')}:</span> {entry?.type === 0 ? t('scoreSheet.type.process') : t('scoreSheet.type.final')}</div>
              <div><span className="font-medium">{t('scoreSheet.detail.teacher')}:</span> {entry?.teacherName || t('common.notAvailable')}</div>
              <div><span className="font-medium">{t('scoreSheet.columns.status')}:</span> {row.approved ? t('scoreSheet.status.approved') : t('scoreSheet.status.pending')}</div>
            </div>
            <div>
              <h4 className="font-medium mb-1">{t('scoreSheet.detail.trueScore')}</h4>
              {trueScore.length ? (
                <ul className="list-disc ml-5 space-y-0.5">
                  {trueScore.map((s, i) => (
                    <li key={i}>{s.l ? `${s.l}: ` : ''}{s._d || s.d || '-'}</li>
                  ))}
                </ul>
              ) : <p className="text-muted-foreground text-xs">{t('scoreSheet.detail.noTrueScore')}</p>}
            </div>
            <div>
              <h4 className="font-medium mb-1">{t('scoreSheet.detail.predicScore')}</h4>
              {predicScore.length ? (
                <ul className="list-disc ml-5 space-y-0.5">
                  {predicScore.map((s, i) => (
                    <li key={i}>{s.l ? `${s.l}: ` : ''}{s._d || s.d || '-'}</li>
                  ))}
                </ul>
              ) : <p className="text-muted-foreground text-xs">{t('scoreSheet.detail.noPredicScore')}</p>}
            </div>
            <div className="grid gap-2">
              <div>
                <span className="font-medium">{t('scoreSheet.form.comment')}:</span>
                <p className="whitespace-pre-wrap text-sm mt-1">{entry?.comment || entry?.score?.comment || t('common.notAvailable')}</p>
              </div>
              <div>
                <span className="font-medium">{t('scoreSheet.form.solution')}:</span>
                <p className="whitespace-pre-wrap text-sm mt-1">{entry?.solution || entry?.score?.solution || t('common.notAvailable')}</p>
              </div>
            </div>
            {entry?.approve?.time && (
              <div className="text-xs text-muted-foreground">{t('scoreSheet.detail.approvedAt', { date: new Date(entry.approve.time).toLocaleString() })}</div>
            )}
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('common.close')}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
