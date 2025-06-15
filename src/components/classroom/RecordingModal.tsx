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
  classCode: string;
  classroomName: string;
}

export function RecordingModal({
  isOpen,
  onClose,
  classCode,
  classroomName,
}: RecordingModalProps) {
  const [currentTab, setCurrentTab] = useState("settings");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [estimatedFileSize, setEstimatedFileSize] = useState(0); // MB
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [settings, setSettings] = useState<RecordingSettings>({
    source: "camera",
    resolution: "854x480", // Giảm từ 1280x720 để tiết kiệm RAM
    frameRate: 25, // Giảm từ 30fps
    videoBitrate: 1500, // Giảm từ 2500 để tiết kiệm băng thông
    audioBitrate: 96, // Giảm từ 128
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
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
  }, [isOpen]); // Start preview when settings change
  useEffect(() => {
    if (isOpen && (currentTab === "preview" || currentTab === "recording")) {
      startPreview();
    }
    return () => {
      // Only stop preview if modal is closing or going back to settings
      if (!isOpen || currentTab === "settings") {
        stopPreview();
      }
    };
  }, [isOpen, currentTab, settings]); // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopPreview();
      stopAudioAnalyzer();
      setCurrentTab("settings");
      setRecordedBlob(null);
      setRecordingTime(0);
      setShowVideoPreview(false);
      // Cleanup video object URL
      if (videoObjectUrl) {
        URL.revokeObjectURL(videoObjectUrl);
        setVideoObjectUrl(null);
      }
    }
  }, [isOpen]);
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopPreview();
      stopAudioAnalyzer();
      // Cleanup video object URL
      if (videoObjectUrl) {
        URL.revokeObjectURL(videoObjectUrl);
      }
    };
  }, [videoObjectUrl]);

  // Force preview start when entering recording tab
  useEffect(() => {
    if (
      isOpen &&
      currentTab === "recording" &&
      hasPermission &&
      !streamRef.current
    ) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startPreview().catch((error) => {
          console.error(
            "Failed to auto-start preview in recording tab:",
            error
          );
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, currentTab, hasPermission]);
  // Quản lý object URL để tránh memory leak
  useEffect(() => {
    if (recordedBlob) {
      // Cleanup URL cũ trước khi tạo mới
      if (videoObjectUrl) {
        URL.revokeObjectURL(videoObjectUrl);
      }

      // Tạo URL mới
      const newUrl = URL.createObjectURL(recordedBlob);
      setVideoObjectUrl(newUrl);

      // Cleanup khi component unmount hoặc blob thay đổi
      return () => {
        URL.revokeObjectURL(newUrl);
      };
    } else {
      // Cleanup khi không còn blob
      if (videoObjectUrl) {
        URL.revokeObjectURL(videoObjectUrl);
        setVideoObjectUrl(null);
      }
    }
  }, [recordedBlob]);

  const startPreview = async () => {
    try {
      // Clear any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

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
        // Force play to ensure video starts
        try {
          await videoPreviewRef.current.play();
        } catch (playError) {
          console.warn("Auto-play was prevented, but video should still work");
        }
      }

      // Setup audio analyzer if stream has audio tracks
      if (stream.getAudioTracks().length > 0) {
        setupAudioAnalyzer(stream);
      }

      console.log("Preview started successfully", {
        hasStream: !!stream,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
      });
    } catch (error) {
      console.error("Error starting preview:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Lỗi không xác định";
      toast.error(`Không thể khởi động preview: ${errorMessage}`);

      // Reset stream reference on error
      streamRef.current = null;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }
      throw error; // Re-throw để startRecording có thể handle
    }
  };

  // Setup audio analyzer for real-time audio level monitoring
  const setupAudioAnalyzer = (stream: MediaStream) => {
    try {
      // Cleanup existing audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start monitoring audio levels
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const normalizedLevel = Math.min(100, (average / 255) * 100);

        setAudioLevel(normalizedLevel);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    } catch (error) {
      console.error("Error setting up audio analyzer:", error);
      setAudioLevel(0);
    }
  };

  const stopAudioAnalyzer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  };
  const stopPreview = () => {
    stopAudioAnalyzer();
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

        // Double check after starting preview
        if (!streamRef.current) {
          throw new Error(
            "Không thể khởi động stream sau khi khởi động preview"
          );
        }
      }

      // Verify stream has active tracks
      const videoTracks = streamRef.current.getVideoTracks();
      const audioTracks = streamRef.current.getAudioTracks();

      if (videoTracks.length === 0) {
        throw new Error("Không có video track sẵn dùng");
      }

      console.log("Starting recording with stream:", {
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        videoTrackState: videoTracks[0]?.readyState,
        audioTrackState: audioTracks[0]?.readyState,
      });

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
      };
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        setRecordedBlob(blob);

        // Kiểm tra kích thước file
        const fileSizeMB = blob.size / (1024 * 1024);
        console.log(`Video size: ${fileSizeMB.toFixed(2)} MB`);

        // Tự động upload sau khi dừng ghi hình
        try {
          // Cảnh báo nếu file quá lớn
          if (fileSizeMB > 30) {
            toast.warning(
              `File khá lớn (${fileSizeMB.toFixed(
                1
              )} MB), upload có thể mất nhiều thời gian...`
            );
          }
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const fileName = `recording-${classroomName}-${timestamp}.webm`;
          const file = new File([blob], fileName, { type: "video/webm" });

          await uploadToDiary(
            file,
            `Video bài học được ghi lại - ${classroomName} - ${new Date().toLocaleString(
              "vi-VN"
            )}`
          );
          toast.success("Ghi hình và upload thành công!");
          onClose(); // Đóng modal sau khi upload thành công
        } catch (error) {
          console.error("Upload error:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Lỗi không xác định";

          // Kiểm tra nếu lỗi do file quá lớn
          if (
            errorMessage.includes("Body exceeded") ||
            errorMessage.includes("413") ||
            fileSizeMB > 40
          ) {
            toast.error(
              `File quá lớn (${fileSizeMB.toFixed(
                1
              )} MB). Hãy ghi video ngắn hơn hoặc giảm chất lượng.`
            );
          } else {
            toast.error("Ghi hình thành công nhưng upload thất bại");
          }
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
      setRecordingTime(0); // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          // Ước tính kích thước file dựa trên bitrate và thời gian
          const totalBitrate = settings.videoBitrate + settings.audioBitrate; // kbps
          const estimatedSizeMB = (totalBitrate * newTime) / (8 * 1024); // Convert to MB
          setEstimatedFileSize(estimatedSizeMB);
          return newTime;
        });
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
      } // Reset estimated file size
      setEstimatedFileSize(0);

      // Dọn dẹp stream để tiết kiệm RAM
      setTimeout(() => {
        if (streamRef.current && !isRecording) {
          console.log("Cleaning up stream to save RAM");
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = null;
          }
        }
      }, 2000); // Đợi 2 giây để MediaRecorder hoàn thành việc xử lý

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
    { value: "1920x1080", label: "Full HD (1920x1080) - Chất lượng cao" },
    { value: "1280x720", label: "HD (1280x720) - Cân bằng" },
    { value: "854x480", label: "SD (854x480) - Tiết kiệm RAM ⭐" },
    { value: "640x360", label: "Low (640x360) - Tiết kiệm tối đa" },
  ];

  const frameRateOptions = [
    { value: 60, label: "60 FPS - Siêu mượt" },
    { value: 30, label: "30 FPS - Chuẩn" },
    { value: 25, label: "25 FPS - Tiết kiệm ⭐" },
    { value: 24, label: "24 FPS - Điện ảnh" },
    { value: 15, label: "15 FPS - Tiết kiệm tối đa" },
  ];

  // Upload video to diary API
  const uploadToDiary = async (
    file: File,
    content: string = "Video bài học được ghi lại"
  ) => {
    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("file1", file); // Use numbered file naming pattern like the API expects      // Get company and branch from localStorage for headers
      const selectedCompany = localStorage.getItem("selectedCompany");
      const selectedBranch = localStorage.getItem("selectedBranch");
      const cachedBranches = JSON.parse(
        localStorage.getItem("cached_branches") || "[]"
      );

      const headers: Record<string, string> = {};
      if (selectedCompany) {
        headers["x-company"] = selectedCompany;
      }
      if (selectedBranch) {
        // Find the branch ID from cached branches using the branch code
        const branchId = cachedBranches?.find(
          (b: { code: string; id: string }) => b.code === selectedBranch
        )?.id;
        if (branchId) {
          headers["x-branch"] = branchId;
        }
      }

      const response = await fetch(`/api/classroom/${classCode}/diary/post`, {
        method: "POST",
        body: formData,
        credentials: "include", // Include cookies for authentication
        headers,
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText} - ${errorData}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Diary upload error:", error);
      throw error;
    }
  };

  // Retry upload function
  const retryUpload = async () => {
    if (!recordedBlob) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `recording-${classroomName}-${timestamp}.webm`;
      const file = new File([recordedBlob], fileName, { type: "video/webm" });

      toast.info("Đang thử upload lại...");
      await uploadToDiary(
        file,
        `Video bài học được ghi lại - ${classroomName} - ${new Date().toLocaleString(
          "vi-VN"
        )}`
      );
      toast.success("Upload thành công!");
      onClose();
    } catch (error) {
      console.error("Retry upload error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Lỗi không xác định";
      toast.error(`Upload thất bại: ${errorMessage}`);
    }
  };

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
                              </SelectTrigger>{" "}
                              <SelectContent>
                                <SelectItem value="800">
                                  800 kbps - Tiết kiệm tối đa
                                </SelectItem>
                                <SelectItem value="1500">
                                  1500 kbps - Tiết kiệm ⭐
                                </SelectItem>
                                <SelectItem value="2500">
                                  2500 kbps - Cân bằng
                                </SelectItem>
                                <SelectItem value="5000">
                                  5000 kbps - Chất lượng cao
                                </SelectItem>
                                <SelectItem value="8000">
                                  8000 kbps - Chất lượng tối đa
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
                              </SelectTrigger>{" "}
                              <SelectContent>
                                <SelectItem value="64">
                                  64 kbps - Tiết kiệm
                                </SelectItem>
                                <SelectItem value="96">
                                  96 kbps - Tiết kiệm ⭐
                                </SelectItem>
                                <SelectItem value="128">
                                  128 kbps - Cân bằng
                                </SelectItem>
                                <SelectItem value="192">
                                  192 kbps - Chất lượng cao
                                </SelectItem>
                                <SelectItem value="320">
                                  320 kbps - Chất lượng tối đa
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>

                        {/* RAM optimization tips */}
                        <div className="px-6 pb-6">
                          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start gap-3">
                              <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                                💡
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                                  Tối ưu hóa RAM
                                </h4>
                                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                  <li>
                                    • Dùng độ phân giải 854x480 hoặc thấp hơn
                                  </li>
                                  <li>• Chọn 25 FPS thay vì 30 FPS</li>
                                  <li>
                                    • Bitrate 1500 kbps thường đủ cho học online
                                  </li>
                                  <li>
                                    • Tắt preview video sau khi ghi để tiết kiệm
                                    RAM
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
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
                              )}{" "}
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
                          </div>{" "}
                          {/* Audio level indicator */}
                          {streamRef.current && (
                            <div className="mt-4 p-4 bg-muted rounded-lg">
                              <div className="flex items-center gap-3 text-sm">
                                <Mic className="h-5 w-5 text-primary" />
                                <span className="font-medium">Âm thanh:</span>
                                <div className="flex-1 h-3 bg-background rounded-full overflow-hidden relative">
                                  <div
                                    className="h-full transition-all duration-100 ease-out rounded-full"
                                    style={{
                                      width: `${Math.max(2, audioLevel)}%`,
                                      backgroundColor:
                                        audioLevel > 70
                                          ? "#ef4444"
                                          : audioLevel > 30
                                          ? "#22c55e"
                                          : "#6b7280",
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm text-muted-foreground font-medium min-w-[40px] text-right">
                                  {audioLevel > 0
                                    ? `${Math.round(audioLevel)}%`
                                    : "Silent"}
                                </span>
                              </div>
                              {audioLevel > 80 && (
                                <p className="text-xs text-orange-600 mt-2">
                                  ⚠️ Âm thanh hơi to, có thể gây tiếng vọng
                                </p>
                              )}
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
                  </TabsContent>{" "}
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
                        <div className="relative">
                          <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6 border-2 border-border">
                            <video
                              ref={videoPreviewRef}
                              autoPlay
                              muted
                              playsInline
                              className="w-full h-full object-contain"
                            />

                            {/* Recording overlay */}
                            {isRecording && (
                              <div className="absolute top-3 left-3">
                                <Badge
                                  variant="destructive"
                                  className="animate-pulse text-sm backdrop-blur-sm bg-red-600/90 text-white"
                                >
                                  ● REC {formatTime(recordingTime)}
                                </Badge>
                              </div>
                            )}

                            {/* No stream message */}
                            {!streamRef.current && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center text-white/70">
                                  <Video className="h-16 w-16 mx-auto mb-3 opacity-50" />
                                  <p className="text-base font-medium">
                                    Đang khởi động camera...
                                  </p>
                                  <p className="text-sm mt-1">
                                    Vui lòng chờ một chút
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Stream ready indicator */}
                            {streamRef.current && !isRecording && (
                              <div className="absolute top-3 left-3">
                                <Badge
                                  variant="default"
                                  className="text-sm backdrop-blur-sm bg-green-600/90 text-white"
                                >
                                  ● READY
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-center gap-4">
                          {!isRecording ? (
                            <Button
                              onClick={startRecording}
                              size="lg"
                              className="bg-red-600 hover:bg-red-700 px-8 py-3 text-base"
                              disabled={!streamRef.current}
                            >
                              <Video className="h-5 w-5 mr-2" />
                              {streamRef.current
                                ? "Bắt đầu ghi"
                                : "Đang khởi động..."}
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
                        {/* Status info */}
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  streamRef.current
                                    ? "bg-green-500"
                                    : "bg-yellow-500 animate-pulse"
                                }`}
                              ></div>
                              <span className="font-medium">
                                {streamRef.current
                                  ? "Camera sẵn sàng"
                                  : "Đang khởi động camera"}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {settings.resolution} | {settings.frameRate}fps
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {settings.source === "camera"
                                ? "📹 Camera"
                                : "🖥️ Màn hình"}
                            </Badge>
                            {isRecording && estimatedFileSize > 0 && (
                              <Badge
                                variant={
                                  estimatedFileSize > 30
                                    ? "destructive"
                                    : estimatedFileSize > 10
                                    ? "secondary"
                                    : "default"
                                }
                                className="text-xs"
                              >
                                ~{estimatedFileSize.toFixed(1)} MB
                              </Badge>
                            )}
                          </div>
                          {isRecording && estimatedFileSize > 30 && (
                            <p className="text-xs text-orange-600 mt-2">
                              ⚠️ File đang trở nên khá lớn. Hãy cân nhắc dừng
                              ghi hoặc giảm chất lượng.
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>{" "}
                  <TabsContent value="result" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Video đã ghi</CardTitle>
                        <DialogDescription>
                          Video đã được tự động upload lên hệ thống sau khi ghi
                          hình hoàn tất
                        </DialogDescription>
                      </CardHeader>{" "}
                      <CardContent className="space-y-6">
                        {recordedBlob && (
                          <div className="space-y-4">
                            {/* Video size info */}
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant="default"
                                  className="bg-green-600"
                                >
                                  ✓ Video đã ghi thành công
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  Kích thước:{" "}
                                  {(recordedBlob.size / (1024 * 1024)).toFixed(
                                    1
                                  )}{" "}
                                  MB
                                </span>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setShowVideoPreview(!showVideoPreview)
                                }
                              >
                                {showVideoPreview ? "Ẩn video" : "Xem video"}
                              </Button>
                            </div>

                            {/* Video preview - chỉ render khi cần thiết */}
                            {showVideoPreview && videoObjectUrl && (
                              <div className="aspect-video bg-black rounded-lg overflow-hidden border-2 border-border">
                                <video
                                  src={videoObjectUrl}
                                  controls
                                  preload="metadata" // Chỉ load metadata thay vì toàn bộ video
                                  className="w-full h-full object-contain"
                                  onLoadStart={() => {
                                    console.log("Video started loading");
                                  }}
                                  onError={(e) => {
                                    console.error("Video load error:", e);
                                    toast.error("Không thể load video preview");
                                  }}
                                />
                              </div>
                            )}

                            {!showVideoPreview && (
                              <div className="aspect-video bg-muted rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                                <div className="text-center text-muted-foreground">
                                  <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">
                                    Nhấn "Xem video" để preview
                                  </p>
                                  <p className="text-xs mt-1">
                                    Tiết kiệm RAM khi không xem
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}{" "}
                        <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t">
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              onClick={downloadRecording}
                              size="lg"
                              className="px-6"
                              disabled={!recordedBlob}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Tải xuống
                            </Button>

                            <Button
                              variant="default"
                              onClick={retryUpload}
                              size="lg"
                              className="px-6"
                              disabled={!recordedBlob}
                            >
                              🔄 Upload lại
                            </Button>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="default" className="bg-blue-600">
                              📝 Đã lưu vào diary
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
