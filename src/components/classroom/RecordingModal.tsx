"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Video,
  Square,
  Monitor,
  Camera,
  Mic,
  Settings,
  Download,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "sonner";

interface RecordingSettings {
  source: "camera" | "screen";
  resolution: string;
  frameRate: number;
  videoBitrate: number;
  audioBitrate: number;
  videoDeviceId?: string;
  audioDeviceId?: string;
}

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  classroomName: string;
}

export function RecordingModal({
  isOpen,
  onClose,
  onUpload,
  classroomName,
}: RecordingModalProps) {
  const [currentTab, setCurrentTab] = useState("settings");  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);

  const [settings, setSettings] = useState<RecordingSettings>({
    source: "camera",
    resolution: "1280x720",
    frameRate: 30,
    videoBitrate: 2500,
    audioBitrate: 128,
  });

  const [devices, setDevices] = useState<{
    videoDevices: MediaDeviceInfo[];
    audioDevices: MediaDeviceInfo[];
  }>({
    videoDevices: [],
    audioDevices: [],
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Load available devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const deviceList = await navigator.mediaDevices.enumerateDevices();

        setDevices({
          videoDevices: deviceList.filter(
            (device) => device.kind === "videoinput"
          ),
          audioDevices: deviceList.filter(
            (device) => device.kind === "audioinput"
          ),
        });
        setHasPermission(true);
      } catch (error) {
        console.error("Error loading devices:", error);
        toast.error("Không thể truy cập thiết bị ghi hình");
        setHasPermission(false);
      }
    };

    if (isOpen) {
      loadDevices();
    } else {
      setHasPermission(false);
    }
  }, [isOpen]);
  // Start preview when settings change
  useEffect(() => {
    if (isOpen && currentTab === "preview") {
      startPreview();
    }
    return () => {
      stopPreview();
    };
  }, [isOpen, currentTab, settings]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopPreview();
      setCurrentTab("settings");
      setRecordedBlob(null);
      setRecordingTime(0);
    }
  }, [isOpen]);
  const startPreview = async () => {
    try {
      let stream: MediaStream;

      if (settings.source === "screen") {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: parseInt(settings.resolution.split("x")[0]) },
            height: { ideal: parseInt(settings.resolution.split("x")[1]) },
            frameRate: { ideal: settings.frameRate },
          },
          audio: true,
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: settings.videoDeviceId
              ? { exact: settings.videoDeviceId }
              : undefined,
            width: { ideal: parseInt(settings.resolution.split("x")[0]) },
            height: { ideal: parseInt(settings.resolution.split("x")[1]) },
            frameRate: { ideal: settings.frameRate },
          },
          audio: {
            deviceId: settings.audioDeviceId
              ? { exact: settings.audioDeviceId }
              : undefined,
          },
        });
      }

      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error starting preview:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Lỗi không xác định";
      toast.error(`Không thể khởi động preview: ${errorMessage}`);
      throw error; // Re-throw để startRecording có thể handle
    }
  };

  const stopPreview = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };
  const startRecording = async () => {
    try {
      // Nếu chưa có stream, khởi động preview trước
      if (!streamRef.current) {
        toast.info("Đang khởi động camera/microphone...");
        await startPreview();
      }

      if (!streamRef.current) {
        throw new Error("Không thể khởi động stream");
      }

      // Kiểm tra xem browser có hỗ trợ MediaRecorder không
      if (!MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
        if (!MediaRecorder.isTypeSupported("video/webm")) {
          throw new Error("Trình duyệt không hỗ trợ ghi video");
        }
      }

      const mimeType = MediaRecorder.isTypeSupported(
        "video/webm;codecs=vp9,opus"
      )
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: settings.videoBitrate * 1000,
        audioBitsPerSecond: settings.audioBitrate * 1000,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        setRecordedBlob(blob);

        // Tự động upload sau khi dừng ghi hình
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const fileName = `recording-${classroomName}-${timestamp}.webm`;
          const file = new File([blob], fileName, { type: "video/webm" });

          await onUpload(file);
          toast.success("Ghi hình và upload thành công!");
          onClose(); // Đóng modal sau khi upload thành công
        } catch (error) {   
          console.error("Upload error:", error);
          toast.error("Ghi hình thành công nhưng upload thất bại");
          setCurrentTab("result"); // Chuyển đến tab result để có thể thử lại
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        toast.error("Lỗi khi ghi hình");
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Record in 1-second intervals
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      toast.success("Đã bắt đầu ghi hình");
    } catch (error) {
      console.error("Error starting recording:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Lỗi không xác định";
      toast.error(`Không thể bắt đầu ghi hình: ${errorMessage}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      toast.success("Đã dừng ghi hình");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };
  const downloadRecording = () => {
    if (!recordedBlob) return;

    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recording-${classroomName}-${new Date().toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resolutionOptions = [
    { value: "1920x1080", label: "Full HD (1920x1080)" },
    { value: "1280x720", label: "HD (1280x720)" },
    { value: "854x480", label: "SD (854x480)" },
    { value: "640x360", label: "Low (640x360)" },
  ];

  const frameRateOptions = [
    { value: 60, label: "60 FPS" },
    { value: 30, label: "30 FPS" },
    { value: 24, label: "24 FPS" },
    { value: 15, label: "15 FPS" },
  ];

  return (
    <>
      <Toaster />{" "}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[150vw] w-full max-h-[90vh] overflow-hidden p-0 sm:max-w-[120vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[75vw]">
          <div className="flex flex-col h-full max-h-[90vh]">
            <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 sticky top-0 bg-background/95 backdrop-blur-sm border-b z-10 shrink-0">
              {" "}
              <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl lg:text-2xl font-semibold">
                <Video className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-primary" />
                <span className="truncate">
                  Ghi hình buổi học - {classroomName}
                </span>
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground mt-1">
                Cấu hình và ghi hình buổi học của bạn
              </DialogDescription>{" "}
              {/* Status Bar */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 sm:mt-4 pt-2 sm:pt-3 border-t">
                {" "}
                <Badge
                  variant={hasPermission ? "default" : "secondary"}
                  className="text-xs sm:text-sm px-2 sm:px-3 py-1"
                >
                  {hasPermission
                    ? "✓ Sẵn sàng ghi hình"
                    : "◯ Chưa có quyền truy cập"}
                </Badge>
                {currentTab === "preview" && (
                  <Badge
                    variant={streamRef.current ? "default" : "outline"}
                    className="text-xs sm:text-sm px-2 sm:px-3 py-1"
                  >
                    {streamRef.current
                      ? "✓ Preview đang hoạt động"
                      : "◯ Đang khởi động preview"}
                  </Badge>
                )}{" "}
                {isRecording && (
                  <Badge
                    variant="destructive"
                    className="text-xs sm:text-sm animate-pulse px-2 sm:px-3 py-1"
                  >
                    ● ĐANG GHI ({Math.floor(recordingTime / 60)}:
                    {(recordingTime % 60).toString().padStart(2, "0")})
                  </Badge>
                )}
                {recordedBlob && (
                  <Badge
                    variant="outline"
                    className="text-xs sm:text-sm px-2 sm:px-3 py-1"
                  >
                    ✓ Đã ghi xong (
                    {(recordedBlob.size / (1024 * 1024)).toFixed(1)} MB)
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm px-2 sm:px-3 py-1"
                >
                  {settings.source === "camera" ? "📹 Camera" : "🖥️ Màn hình"} |{" "}
                  {settings.resolution} | {settings.frameRate}fps
                </Badge>
              </div>
            </DialogHeader>{" "}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-6">
                <Tabs value={currentTab} onValueChange={setCurrentTab}>
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4 sm:mb-6 h-10 sm:h-12">
                    {" "}
                    <TabsTrigger
                      value="settings"
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium h-8 sm:h-10"
                    >
                      <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Cài đặt</span>
                      <span className="sm:hidden">Settings</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="preview"
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium h-8 sm:h-10"
                    >
                      <Monitor className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Preview</span>
                      <span className="sm:hidden">Preview</span>
                    </TabsTrigger>{" "}
                    <TabsTrigger
                      value="recording"
                      disabled={!hasPermission}
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium h-8 sm:h-10"
                    >
                      <Video className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Ghi hình</span>
                      <span className="sm:hidden">Record</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="result"
                      disabled={!recordedBlob}
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium h-8 sm:h-10"
                    >
                      <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Kết quả</span>
                      <span className="sm:hidden">Result</span>
                    </TabsTrigger>
                  </TabsList>{" "}
                  <TabsContent value="settings" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
                      <Card className="h-fit">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Video className="h-5 w-5" />
                            Nguồn ghi hình
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant={
                                settings.source === "camera"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  source: "camera",
                                }))
                              }
                              className="flex items-center gap-3 h-14 text-sm"
                              size="lg"
                            >
                              <Camera className="h-5 w-5" />
                              <span>Camera</span>
                            </Button>
                            <Button
                              variant={
                                settings.source === "screen"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                setSettings((prev) => ({
                                  ...prev,
                                  source: "screen",
                                }))
                              }
                              className="flex items-center gap-3 h-14 text-sm"
                              size="lg"
                            >
                              <Monitor className="h-5 w-5" />
                              <span>Màn hình</span>
                            </Button>
                          </div>

                          {settings.source === "camera" && (
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">
                                📹 Camera
                              </Label>
                              <Select
                                value={settings.videoDeviceId}
                                onValueChange={(value) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    videoDeviceId: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="h-11">
                                  <SelectValue placeholder="Chọn camera" />
                                </SelectTrigger>
                                <SelectContent>
                                  {devices.videoDevices.map((device) => (
                                    <SelectItem
                                      key={device.deviceId}
                                      value={device.deviceId}
                                    >
                                      {device.label ||
                                        `Camera ${device.deviceId.slice(0, 8)}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-3">
                            <Label className="text-sm font-medium">
                              🎤 Microphone
                            </Label>
                            <Select
                              value={settings.audioDeviceId}
                              onValueChange={(value) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  audioDeviceId: value,
                                }))
                              }
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Chọn microphone" />
                              </SelectTrigger>
                              <SelectContent>
                                {devices.audioDevices.map((device) => (
                                  <SelectItem
                                    key={device.deviceId}
                                    value={device.deviceId}
                                  >
                                    {device.label ||
                                      `Microphone ${device.deviceId.slice(
                                        0,
                                        8
                                      )}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="h-fit">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Chất lượng ghi hình
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-3">
                            <Label className="text-sm font-medium">
                              Độ phân giải
                            </Label>
                            <Select
                              value={settings.resolution}
                              onValueChange={(value) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  resolution: value,
                                }))
                              }
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {resolutionOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-sm font-medium">
                              Frame Rate
                            </Label>
                            <Select
                              value={settings.frameRate.toString()}
                              onValueChange={(value) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  frameRate: parseInt(value),
                                }))
                              }
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {frameRateOptions.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value.toString()}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-sm font-medium">
                              Video Bitrate (kbps)
                            </Label>
                            <Select
                              value={settings.videoBitrate.toString()}
                              onValueChange={(value) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  videoBitrate: parseInt(value),
                                }))
                              }
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1000">
                                  1000 kbps (Low)
                                </SelectItem>
                                <SelectItem value="2500">
                                  2500 kbps (Medium)
                                </SelectItem>
                                <SelectItem value="5000">
                                  5000 kbps (High)
                                </SelectItem>
                                <SelectItem value="8000">
                                  8000 kbps (Very High)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-sm font-medium">
                              Audio Bitrate (kbps)
                            </Label>
                            <Select
                              value={settings.audioBitrate.toString()}
                              onValueChange={(value) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  audioBitrate: parseInt(value),
                                }))
                              }
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="64">64 kbps</SelectItem>
                                <SelectItem value="128">128 kbps</SelectItem>
                                <SelectItem value="192">192 kbps</SelectItem>
                                <SelectItem value="320">320 kbps</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                      <Button
                        onClick={() => setCurrentTab("preview")}
                        size="lg"
                        className="px-8"
                      >
                        Tiếp tục đến Preview
                      </Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="preview" className="space-y-6">
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-3">
                          <Monitor className="h-5 w-5" />
                          Preview -{" "}
                          {settings.source === "camera"
                            ? "📹 Camera"
                            : "🖥️ Chia sẻ màn hình"}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {settings.resolution}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {settings.frameRate} FPS
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Video: {settings.videoBitrate}kbps
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Audio: {settings.audioBitrate}kbps
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="relative">
                          <div className="aspect-video bg-black rounded-lg overflow-hidden border-2 border-border">
                            <video
                              ref={videoPreviewRef}
                              autoPlay
                              muted
                              className="w-full h-full object-contain"
                            />

                            {/* Preview overlay info */}
                            <div className="absolute top-3 left-3 flex flex-col gap-2">
                              <Badge
                                variant="secondary"
                                className="text-xs backdrop-blur-sm bg-black/50 text-white"
                              >
                                ● LIVE PREVIEW
                              </Badge>
                              {streamRef.current && (
                                <Badge
                                  variant="outline"
                                  className="text-xs backdrop-blur-sm bg-black/50 text-white border-white/30"
                                >
                                  {streamRef.current.getVideoTracks()[0]
                                    ?.label || "Video track"}
                                </Badge>
                              )}
                            </div>

                            {/* No preview message */}
                            {!streamRef.current && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center text-white/70">
                                  <Monitor className="h-16 w-16 mx-auto mb-3 opacity-50" />
                                  <p className="text-base font-medium">
                                    Đang khởi động preview...
                                  </p>
                                  <p className="text-sm mt-1">
                                    Cho phép quyền truy cập camera/microphone
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Audio level indicator */}
                          {streamRef.current && (
                            <div className="mt-4 p-4 bg-muted rounded-lg">
                              <div className="flex items-center gap-3 text-sm">
                                <Mic className="h-5 w-5 text-primary" />
                                <span className="font-medium">Âm thanh:</span>
                                <div className="flex-1 h-3 bg-background rounded-full overflow-hidden">
                                  <div className="h-full bg-green-500 w-1/3 animate-pulse"></div>
                                </div>
                                <span className="text-sm text-muted-foreground font-medium">
                                  OK
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t">
                          <Button
                            variant="outline"
                            onClick={() => setCurrentTab("settings")}
                            className="flex-1"
                            size="lg"
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Quay lại cài đặt
                          </Button>{" "}
                          <Button
                            onClick={() => setCurrentTab("recording")}
                            disabled={!hasPermission}
                            className="flex-1"
                            size="lg"
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Bắt đầu ghi hình
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  <TabsContent value="recording" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-lg">
                          <span>Ghi hình</span>
                          {isRecording && (
                            <Badge
                              variant="destructive"
                              className="animate-pulse text-sm px-3 py-1"
                            >
                              REC {formatTime(recordingTime)}
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
                          <video
                            ref={videoPreviewRef}
                            autoPlay
                            muted
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="flex justify-center gap-4">
                          {!isRecording ? (
                            <Button
                              onClick={startRecording}
                              size="lg"
                              className="bg-red-600 hover:bg-red-700 px-8 py-3 text-base"
                            >
                              <Video className="h-5 w-5 mr-2" />
                              Bắt đầu ghi
                            </Button>
                          ) : (
                            <Button
                              onClick={stopRecording}
                              size="lg"
                              variant="destructive"
                              className="px-8 py-3 text-base"
                            >
                              <Square className="h-5 w-5 mr-2" />
                              Dừng ghi ({formatTime(recordingTime)})
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>                  <TabsContent value="result" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Video đã ghi</CardTitle>
                        <DialogDescription>
                          Video đã được tự động upload lên hệ thống sau khi ghi hình hoàn tất
                        </DialogDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {recordedBlob && (
                          <div className="aspect-video bg-black rounded-lg overflow-hidden">
                            <video
                              src={URL.createObjectURL(recordedBlob)}
                              controls
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t">
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              onClick={downloadRecording}
                              size="lg"
                              className="px-6"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Tải xuống
                            </Button>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="default" className="bg-green-600">
                              ✓ Đã upload thành công
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
