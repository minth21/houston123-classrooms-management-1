import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Video } from "lucide-react";
import { toast } from "sonner";
import { RecordingModal } from "@/components/classroom/RecordingModal";

interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  author: string;
  attachments: any[];
}

interface ClassroomDiaryProps {
  diaryEntries: DiaryEntry[];
  onDiarySubmit: (content: string, files: File[]) => Promise<void>;
  classroom: {
    classID: string;
    subjectName: string;
  } | null;
  testMode?: boolean;
}

export function ClassroomDiary({
  diaryEntries,
  onDiarySubmit,
  classroom,
  testMode = false,
}: ClassroomDiaryProps) {
  const [diaryContent, setDiaryContent] = useState("");
  const [diaryFiles, setDiaryFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);

  const handleDiarySubmit = async () => {
    if (!diaryContent.trim()) {
      toast.error("Vui lòng nhập nội dung nhật ký");
      return;
    }

    try {
      setIsSubmitting(true);
      await onDiarySubmit(diaryContent, diaryFiles);
      setDiaryContent("");
      setDiaryFiles([]);
      toast.success("Đã thêm nhật ký thành công");
    } catch (error) {
      console.error("Error submitting diary:", error);
      toast.error("Có lỗi xảy ra khi thêm nhật ký");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDiaryFiles(Array.from(e.target.files));
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Thêm nhật ký
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm nhật ký mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="diary">Nội dung</Label>
                <Input
                  id="diary"
                  value={diaryContent}
                  onChange={(e) => setDiaryContent(e.target.value)}
                  placeholder="Nhập nội dung nhật ký..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="files">Tệp đính kèm</Label>
                <Input
                  id="files"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                />
              </div>{" "}
              <Button onClick={handleDiarySubmit} disabled={isSubmitting}>
                {isSubmitting ? "Đang gửi..." : "Gửi"}
              </Button>
              {classroom && (
                <Button
                  className="ml-2 "
                  onClick={() => setIsRecordingModalOpen(true)}
                  variant="outline"
                >
                  Ghi hình
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-4">
        {diaryEntries.map((entry) => (
          <div key={entry.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{entry.author}</div>
              <div className="text-sm text-muted-foreground">
                {formatDate(entry.date)}
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap">{entry.content}</p>
            {entry.attachments.length > 0 && (
              <div className="mt-2">
                <div className="text-sm font-medium">Tệp đính kèm:</div>
                <ul className="mt-1 space-y-1">
                  {entry.attachments.map((file, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}{" "}
          </div>
        ))}
      </div>

      {/* Recording Modal */}
      {classroom && (
        <RecordingModal
          isOpen={isRecordingModalOpen}
          onClose={() => setIsRecordingModalOpen(false)}
          classCode={classroom.classID}
          classroomName={`${classroom.subjectName}${testMode ? " (TEST)" : ""}`}
        />
      )}
    </div>
  );
}
