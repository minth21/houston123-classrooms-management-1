import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Video, StopCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { RecordingSettings } from "@/lib/api/classroom";

interface Recording {
  id: string;
  stream: MediaStream;
  recorder: MediaRecorder;
  isRecording: boolean;
  blob?: Blob;
  classCode?: string;
}

interface RecordingControlsProps {
  onUpload: (recording: Recording) => Promise<void>;
  recordingSettings?: RecordingSettings;
}

export function RecordingControls({ onUpload, recordingSettings }: RecordingControlsProps) {
  const [recording, setRecording] = useState<Recording | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const options = {
        mimeType: "video/webm",
        videoBitsPerSecond: recordingSettings?.bitrate || 2500000,
        audioBitsPerSecond: recordingSettings?.audioQuality?.bitrate || 128000,
      };

      const recorder = new MediaRecorder(stream, options);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setRecording((prev) => (prev ? { ...prev, blob } : null));

        // Stop all tracks after recording is stopped
        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording
      recorder.start(1000);

      setRecording({
        id: Date.now().toString(),
        stream,
        recorder,
        isRecording: true,
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      setRecordingError("Không thể bắt đầu ghi hình. Vui lòng thử lại.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      if (recording.recorder.state === "recording") {
        recording.recorder.stop();
      }
      setRecording((prev) => (prev ? { ...prev, isRecording: false } : null));
    } catch (error) {
      console.error("Error stopping recording:", error);
      setRecordingError("Không thể dừng ghi hình. Vui lòng thử lại.");
    }
  };

  const handleUpload = async () => {
    if (!recording || !recording.blob) {
      toast.error("Không có video để tải lên");
      return;
    }

    try {
      await onUpload(recording);
      setRecording(null);
      toast.success("Video đã được tải lên thành công");
    } catch (error) {
      console.error("Error uploading recording:", error);
      setRecordingError("Không thể tải video lên máy chủ. Vui lòng thử lại.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        {!recording?.isRecording ? (
          <Button onClick={startRecording}>
            <Video className="mr-2 h-4 w-4" />
            Bắt đầu ghi hình
          </Button>
        ) : (
          <Button onClick={stopRecording} variant="destructive">
            <StopCircle className="mr-2 h-4 w-4" />
            Dừng ghi hình
          </Button>
        )}

        {recording?.blob && !recording.isRecording && (
          <Button onClick={handleUpload}>
            Tải video lên
          </Button>
        )}
      </div>

      {recordingError && (
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{recordingError}</span>
        </div>
      )}

      {recording?.stream && (
        <video
          src={recording.stream ? URL.createObjectURL(recording.blob || new Blob()) : undefined}
          className="w-full rounded-lg"
          controls
        />
      )}
    </div>
  );
} 