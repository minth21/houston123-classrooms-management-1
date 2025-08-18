"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FlattenedScoreRow } from "@/types/scoreSheet";
import { classroomService } from "@/lib/api/classroom";
import { useTranslation } from "react-i18next";

interface ScoreEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: FlattenedScoreRow | null;
  classID: string;
  month: number;
  year: number;
  type: number;
  onSaved?: () => void;
}

export const ScoreEditDialog: React.FC<ScoreEditDialogProps> = ({
  open,
  onOpenChange,
  row,
  classID,
  month,
  year,
  type,
  onSaved,
}) => {
  const { t } = useTranslation();
  const [listening, setListening] = useState("");
  const [speaking, setSpeaking] = useState("");
  const [reading, setReading] = useState("");
  const [writing, setWriting] = useState("");
  const [comment, setComment] = useState("");
  const [solution, setSolution] = useState("");
  // Target (chi tiêu) scores
  const [targetListening, setTargetListening] = useState("");
  const [targetSpeaking, setTargetSpeaking] = useState("");
  const [targetReading, setTargetReading] = useState("");
  const [targetWriting, setTargetWriting] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (row?.raw) {
      const trueScore = row.raw.score?.trueScore || [];
      const getScore = (label: string) =>
        trueScore.find((s) => s.l?.toLowerCase().includes(label))?._d || "";
      setListening(String((row.listening ?? getScore("nghe")) || ""));
      setSpeaking(String((row.speaking ?? getScore("nói")) || ""));
      setReading(String((row.reading ?? getScore("đọc")) || ""));
      setWriting(String((row.writing ?? getScore("viết")) || ""));
      setComment(row.raw.comment || row.raw.score?.comment || "");
      setSolution(row.raw.solution || row.raw.score?.solution || "");
      // Populate targets if available (assuming predicted score array for targets)
      const targetScore = row.raw.score?.predicScore || [];
      const getTarget = (label: string) =>
        targetScore.find((s: any) => s.l?.toLowerCase().includes(label))?._d || "";
      setTargetListening(getTarget("nghe"));
      setTargetSpeaking(getTarget("nói"));
      setTargetReading(getTarget("đọc"));
      setTargetWriting(getTarget("viết"));
    } else if (row) {
      setListening("");
      setSpeaking("");
      setReading("");
      setWriting("");
      setComment("");
      setSolution("");
      setTargetListening("");
      setTargetSpeaking("");
      setTargetReading("");
      setTargetWriting("");
    }
  }, [row]);

  const handleSave = async () => {
    if (!row) return;
    setSubmitting(true);
    setError(null);
    try {
      await classroomService.postClassroomScore({
        classID,
        month,
        year,
        type,
        scores: [
          {
            userID: row.userID,
            listening: listening || undefined,
            speaking: speaking || undefined,
            reading: reading || undefined,
            writing: writing || undefined,
            comment: comment || undefined,
            solution: solution || undefined,
            // Attach target scores in a convention (prefix t_) so API layer can map if supported
            // Use a cast to permit extra keys without changing service signature yet
          } as any,
          {
            userID: row.userID + "__targets__",
            listening: targetListening || undefined,
            speaking: targetSpeaking || undefined,
            reading: targetReading || undefined,
            writing: targetWriting || undefined,
          },
        ],
      });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      console.error("postClassroomScore error", e);
      setError(e?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("scoreSheet.form.title")}</DialogTitle>
          <DialogDescription>
            {row?.userName} ({row?.userID})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="text-xs font-semibold opacity-70">
              {t("scoreSheet.form.actualScores", "Actual Scores")}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">
                {t("scoreSheet.columns.listening")}
              </label>
              <Input
                value={listening}
                onChange={(e) => setListening(e.target.value)}
                placeholder="-"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">
                {t("scoreSheet.columns.speaking")}
              </label>
              <Input
                value={speaking}
                onChange={(e) => setSpeaking(e.target.value)}
                placeholder="-"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">
                {t("scoreSheet.columns.reading")}
              </label>
              <Input
                value={reading}
                onChange={(e) => setReading(e.target.value)}
                placeholder="-"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">
                {t("scoreSheet.columns.writing")}
              </label>
              <Input
                value={writing}
                onChange={(e) => setWriting(e.target.value)}
                placeholder="-"
              />
            </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold opacity-70">
              {t("scoreSheet.form.targetScores", "Target Scores")}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">
                  {t("scoreSheet.columns.listening")}
                </label>
                <Input
                  value={targetListening}
                  onChange={(e) => setTargetListening(e.target.value)}
                  placeholder="-"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">
                  {t("scoreSheet.columns.speaking")}
                </label>
                <Input
                  value={targetSpeaking}
                  onChange={(e) => setTargetSpeaking(e.target.value)}
                  placeholder="-"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">
                  {t("scoreSheet.columns.reading")}
                </label>
                <Input
                  value={targetReading}
                  onChange={(e) => setTargetReading(e.target.value)}
                  placeholder="-"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">
                  {t("scoreSheet.columns.writing")}
                </label>
                <Input
                  value={targetWriting}
                  onChange={(e) => setTargetWriting(e.target.value)}
                  placeholder="-"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">
                {t("scoreSheet.form.comment")}
              </label>
              <Textarea
                value={comment}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setComment(e.target.value)
                }
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">
                {t("scoreSheet.form.solution")}
              </label>
              <Textarea
                value={solution}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setSolution(e.target.value)
                }
                rows={3}
              />
            </div>
          </div>
          {error && <div className="text-xs text-red-500">{error}</div>}
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline">{t("scoreSheet.form.cancel")}</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? t("common.submitting") : t("scoreSheet.form.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
