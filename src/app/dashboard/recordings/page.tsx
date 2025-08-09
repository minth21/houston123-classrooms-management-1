"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, Video, AlertCircle, StopCircle, PlayCircle, Monitor, Camera } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RecordingSettingsDialog } from "@/components/recording-settings-dialog";
import DashboardHeader from "@/components/dashboard-header";
import { RecordingSettings } from "@/lib/api/classroom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTranslation } from "react-i18next";

interface Recording {
  id: string;
  stream: MediaStream;
recorder: MediaRecorder;
  isRecording: boolean;
  videoURL: string | null;
  type: "webcam" | "screen"; // Thêm type để phân biệt loại ghi hình
}

// Wrapper component to ensure we only render the recording UI on the client side
const RecordingComponent = () => {
const { t } = useTranslation();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recordingsRef = useRef<Recording[]>([]);
  const [recordingType, setRecordingType] = useState<"webcam" | "screen">("webcam");
  const [recordingSettings, setRecordingSettings] = useState<RecordingSettings>({
    resolution: "1280x720",
    bitrate: 2500,
    fps: 30,
    codec: "vp8",
    audioQuality: {
      bitrate: 128,
      sampleRate: 44100,
      channels: 2,
    },
  });

  const handleSaveSettings = (newSettings: RecordingSettings) => {
    setRecordingSettings(newSettings);
    // Lưu cài đặt vào localStorage để dùng cho lần sau
    localStorage.setItem("recordingSettings", JSON.stringify(newSettings));
  };

  // Load saved settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("recordingSettings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setRecordingSettings(parsed);
      } catch (e) {
        console.error("Error loading saved recording settings:", e);
      }
    }
  }, []);

  useEffect(() => {
    // Kiểm tra xem mã có đang chạy trong trình duyệt hay không
    if (typeof window === "undefined") {
      return; // Thoát ngay khi không phải môi trường browser
    }

    const isSecureContext = window.isSecureContext;
    const hostname = window.location.hostname;
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

    // Kiểm tra context bảo mật
    if (!isSecureContext && !isLocal) {
      setErrorMessage(
       t('recording.error.https_required')
      );
      return;
    }

    // Kiểm tra sự tồn tại của API
    if (!navigator.mediaDevices) {
      console.warn(t('recording.error.api_unavailable_warning'));

      // Thử lại sau một khoảng thời gian ngắn (đôi khi API cần thời gian để khởi tạo)
      setTimeout(() => {
        if (navigator.mediaDevices) {
          // API đã khả dụng, thử lại kiểm tra
          checkPermissionsAndDevices();
        } else {
          setErrorMessage(
          t('recording.error.api_unavailable_error')
          );
        }
      }, 500);
      return;
    }

    // Hàm kiểm tra quyền và thiết bị
    const checkPermissionsAndDevices = async () => {
      try {
        // Kiểm tra quyền camera nếu API permissions khả dụng
        if (navigator.permissions && navigator.permissions.query) {
          try {
            const cameraPermission = await navigator.permissions.query({
              name: "camera" as PermissionName,
            });

            if (cameraPermission.state === "denied") {
              setErrorMessage(
                         t('recording.error.permission_denied')            
                );
              return;
            }

            // Nếu quyền đang ở trạng thái "prompt", hãy yêu cầu quyền truy cập
            if (cameraPermission.state === "prompt") {
              try {
                // Thử yêu cầu stream để kích hoạt hộp thoại cấp quyền
                const tempStream = await navigator.mediaDevices.getUserMedia({
                  video: true,
                });
                // Dừng stream ngay sau khi nhận được (chỉ để kích hoạt hộp thoại cấp quyền)
                tempStream.getTracks().forEach((track) => track.stop());
              } catch (err) {
                console.warn(
                  t('recording.error.permission_prompt_failed_warning'),
                  err
                );
              }
            }
          } catch (permError) {
            console.warn(
              t('recording.error.permissions_api_unsupported_warning'),
              permError
            );
            // API permissions không khả dụng, nhưng chúng ta vẫn có thể thử enumerateDevices
          }
        }

        // Liệt kê thiết bị media
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(
            (device) => device.kind === "videoinput"
          );
          setAvailableDevices(videoDevices);

          if (videoDevices.length === 0) {
            setErrorMessage(
              t('recording.error.no_camera_found')
            );
          }
        } catch (enumError) {
          console.error(t('recording.error.enumerate_devices_error'), enumError);
          setErrorMessage(
            t('recording.error.device_list_inaccessible')
          );
        }
      } catch (error) {
        console.error(t('recording.error.check_permissions_error'), error);
        setErrorMessage(t('recording.error.check_permissions_error'));
      }
    };

    // Thực hiện kiểm tra
    checkPermissionsAndDevices();
  }, [t]);
  const startNewRecording = async () => {
    // Bảo vệ chống lại server-side rendering
    if (typeof window === "undefined") {
      return;
    }

    // Xóa thông báo lỗi trước đó (nếu có)
    setErrorMessage(null);

    // Kiểm tra API có khả dụng không
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage(
        t('recording.error.api_unavailable_error')
      );
      return;
    }

    try {
      // Kiểm tra tính khả dụng của MediaRecorder
      if (typeof MediaRecorder === "undefined") {
        setErrorMessage(
          t('recording.error.recorder_unsupported')
        );
        return;
      }      // Thiết lập điều kiện sử dụng media từ cài đặt người dùng
      const [width, height] = recordingSettings.resolution.split("x").map(Number);
      const mediaConstraints = {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: recordingSettings.fps }
        },
        audio: {
          sampleRate: recordingSettings.audioQuality.sampleRate,
          channelCount: recordingSettings.audioQuality.channels
        },
      };

      // Yêu cầu truy cập media với xử lý lỗi chi tiết
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      } catch (err: any) {
        console.error(t('recording.error.media_access_error_log'), err);

        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          setErrorMessage(
           t('recording.error.permission_denied_camera_mic')
          );
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          setErrorMessage(
            t(t('recording.error.device_not_found'))
          );
        } else if (
          err.name === "NotReadableError" ||
          err.name === "TrackStartError"
        ) {
          setErrorMessage(
            t('recording.error.device_in_use')
          );
        } else if (err.name === "OverconstrainedError") {
          // Thử lại với ràng buộc ít hơn
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (retryErr) {
            setErrorMessage(
             t('recording.error.overconstrained_error')      
      );
            return;
          }
        } else {
          setErrorMessage(
 t('recording.error.camera_access_failed', { 
              message: err.message || t('recording.error.unknown_error') 
            } )         );
        }

        if (!stream) return;
      }      // Chọn định dạng video dựa trên cài đặt
      let options: MediaRecorderOptions = {};
      const codecMap: { [key: string]: string } = {
        'vp9': 'video/webm;codecs=vp9,opus',
        'vp8': 'video/webm;codecs=vp8,opus',
        'h264': 'video/mp4;codecs=h264,aac'
      };

      if (MediaRecorder.isTypeSupported) {
        // Thử sử dụng codec đã chọn
        const preferredType = codecMap[recordingSettings.codec];
        if (preferredType && MediaRecorder.isTypeSupported(preferredType)) {
          options.mimeType = preferredType;
        } else {
          // Fallback to supported formats if preferred codec is not available
          const supportedTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4'
          ];

          for (const type of supportedTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
              options.mimeType = type;
              break;
            }
          }
        }
      }

      // Áp dụng bitrate từ cài đặt
      options.videoBitsPerSecond = recordingSettings.bitrate * 1000; // Convert to bps
      options.audioBitsPerSecond = recordingSettings.audioQuality.bitrate * 1000;

      // Thiết lập khoảng thời gian lấy dữ liệu cho đáng tin cậy hơn
      // (đặc biệt là trên Chrome khi chạy local)
      options.audioBitsPerSecond = 128000; // 128 Kbps cho âm thanh
      options.videoBitsPerSecond = 2500000; // 2.5 Mbps cho video

      // Tạo recorder với xử lý lỗi
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (recorderErr: any) {
        console.error(t('recording.error.create_recorder_error_log'), recorderErr);
        stream.getTracks().forEach((track) => track.stop());
        setErrorMessage(
 t('recording.error.create_recorder_failed', { 
          message: recorderErr.message || t('recording.error.unknown_error')
        })        );
        return;
      }

      const chunks: BlobPart[] = [];

      // Lưu dữ liệu với khoảng thời gian ngắn hơn để tránh mất dữ liệu
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      // Xử lý khi dừng ghi
      recorder.onstop = () => {
        try {
          // Kết hợp các chunk lại thành một blob
          const mimeType = options.mimeType || "video/webm";
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);

          // Cập nhật state recording
          const recordingIndex = recordingsRef.current.findIndex(
            (r) => r.recorder === recorder
          );

          if (recordingIndex !== -1) {
            const updatedRecordings = [...recordingsRef.current];
            updatedRecordings[recordingIndex] = {
              ...updatedRecordings[recordingIndex],
              videoURL: url,
              isRecording: false,
            };
            recordingsRef.current = updatedRecordings;
            setRecordings(updatedRecordings);
          }
        } catch (blobErr) {
        console.error(t('recording.error.create_blob_error_log'), blobErr);
        setErrorMessage(t('recording.error.blob_creation_failed'));
        }
      };

      // Xử lý sự kiện lỗi từ recorder
      recorder.onerror = (event: any) => {
        console.error(t('recording.error.recording_error_log'), event);
      setErrorMessage(t('recording.error.recording_error'));
      };

      // Tạo đối tượng recording mới
      const newRecording: Recording = {
        id: Date.now().toString(),
        stream,
        recorder,
        isRecording: true,
        videoURL: null,
        type: "webcam"
      };

      // Bắt đầu ghi với timeslice để đảm bảo dữ liệu được lưu thường xuyên
      recorder.start(1000); // Lấy dữ liệu mỗi 1 giây

      // Cập nhật state
      const updatedRecordings = [...recordings, newRecording];
      recordingsRef.current = updatedRecordings;
      setRecordings(updatedRecordings);
    } catch (error: any) {
      console.error(t('recording.error.start_recording_unknown_error_log'), error);
      setErrorMessage(
        error.message || t('recording.error.start_recording_unknown_error')
      );
    }
  };
  const startScreenRecording = async () => {
    if (typeof window === "undefined") return;

    setErrorMessage(null);

    if (!navigator.mediaDevices || !(navigator.mediaDevices as any).getDisplayMedia) {
      setErrorMessage(t('recording.error.screen_unsupported'));
      return;
    }

    try {
      let screenStream: MediaStream;
      try {
        screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
          video: {
            cursor: "always",
            width: { ideal: recordingSettings.resolution.split("x")[0] },
            height: { ideal: recordingSettings.resolution.split("x")[1] },
            frameRate: { ideal: recordingSettings.fps }
          },
          audio: true // Cho phép ghi âm hệ thống nếu được hỗ trợ
        });
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setErrorMessage(t('recording.error.screen_permission_denied'));
        } else {
              t('recording.error.screen_access_failed', {
              message: err.message || t('recording.error.unknown_error')
            });
        }
        return;
      }

      let options: MediaRecorderOptions = {};
      const codecMap: { [key: string]: string } = {
        'vp9': 'video/webm;codecs=vp9,opus',
        'vp8': 'video/webm;codecs=vp8,opus',
        'h264': 'video/mp4;codecs=h264,aac'
      };

      if (MediaRecorder.isTypeSupported) {
        const preferredType = codecMap[recordingSettings.codec];
        if (preferredType && MediaRecorder.isTypeSupported(preferredType)) {
          options.mimeType = preferredType;
        } else {
          const supportedTypes = Object.values(codecMap);
          for (const type of supportedTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
              options.mimeType = type;
              break;
            }
          }
        }
      }

      options.videoBitsPerSecond = recordingSettings.bitrate * 1000;
      options.audioBitsPerSecond = recordingSettings.audioQuality.bitrate * 1000;

      const recorder = new MediaRecorder(screenStream, options);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        try {
          const blob = new Blob(chunks, { type: options.mimeType || "video/webm" });
          const url = URL.createObjectURL(blob);

          const recordingIndex = recordingsRef.current.findIndex(
            (r) => r.recorder === recorder
          );

          if (recordingIndex !== -1) {
            const updatedRecordings = [...recordingsRef.current];
            updatedRecordings[recordingIndex] = {
              ...updatedRecordings[recordingIndex],
              videoURL: url,
              isRecording: false,
            };
            recordingsRef.current = updatedRecordings;
            setRecordings(updatedRecordings);
          }
        } catch (blobErr) {
           // Reusing key from previous step
          console.error(t('recording.error.create_blob_error_log'), blobErr);
          setErrorMessage(t('recording.error.blob_creation_failed'));
        }
      };

      screenStream.getVideoTracks()[0].onended = () => {
        if (recorder.state === "recording") {
          recorder.stop();
          const tracks = screenStream.getTracks();
          tracks.forEach(track => track.stop());
        }
      };

      const newRecording: Recording = {
        id: Date.now().toString(),
        stream: screenStream,
        recorder,
        isRecording: true,
        videoURL: null,
        type: "screen"
      };

      recorder.start(1000);
      const updatedRecordings = [...recordings, newRecording];
      recordingsRef.current = updatedRecordings;
      setRecordings(updatedRecordings);

    } catch (error: any) {
      console.error(t('recording.log.start_screen_recording_error'), error);
      setErrorMessage(error.message || t('recording.error.start_screen_recording_failed'));
    }
  }; 
   const stopRecording = (recordingId: string) => {
    try {
      const recording = recordings.find((r) => r.id === recordingId);
      if (!recording) {
        console.warn(t('recording.log.recording_not_found_warning'), recordingId);
        return;
      }

      // Kiểm tra trạng thái recorder trước khi dừng
      if (recording.recorder.state === "recording") {
        try {
          recording.recorder.stop();
        } catch (stopError) {
          console.error(t('recording.log.stop_recorder_error'), stopError);
        }
      }

      // Luôn dừng tất cả các track, ngay cả khi có lỗi ở trên
      try {
        if (recording.stream) {
          // Dừng tất cả các track (video và audio)
          recording.stream.getTracks().forEach((track) => {
            try {
              track.stop();
              console.log(t('recording.log.track_stopped', { kind: track.kind }));
            } catch (trackError) {
              console.warn(t('recording.log.stop_track_error', { kind: track.kind }), trackError);
            }
          });

          // Đối với ghi màn hình, cần đảm bảo rằng tất cả các track đều được dừng
          if (recording.type === "screen") {
            // Dừng video track của màn hình
            const videoTracks = recording.stream.getVideoTracks();
            videoTracks.forEach(track => {
              track.onended = null; // Xóa event handler
              track.stop();
            });

            // Dừng audio track nếu có
            const audioTracks = recording.stream.getAudioTracks();
            audioTracks.forEach(track => {
              track.stop();
            });
          }
        }

        // Cập nhật state để hiển thị trạng thái đã dừng
        const updatedRecordings = recordings.map(r =>
          r.id === recordingId
            ? { ...r, isRecording: false }
            : r
        );
        setRecordings(updatedRecordings);
        recordingsRef.current = updatedRecordings;

      } catch (tracksError) {
        console.error(t('recording.log.stop_stream_tracks_error'), tracksError);
      }
    } catch (error) {
      console.error(t('recording.log.stop_recording_unknown_error'), error);
      setErrorMessage(t('recording.error.stop_recording_failed')
      );
    }
  };

  const downloadRecording = (recordingId: string) => {
    try {
      const recording = recordings.find((r) => r.id === recordingId);
       if (recording && recording.videoURL) {
        // Create filename from translation key
        const filename = t("recording.download_filename", {
          date: new Date().toISOString().slice(0, 10),
          id: recordingId
        });

        const a = document.createElement("a");
        a.href = recording.videoURL;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();

        // Dọn dẹp
        setTimeout(() => {
          document.body.removeChild(a);
        }, 100);
      }
    } catch (error) {
      console.error(t("recording.log.download_error"), error);
      setErrorMessage(t("recording.error.download_failed"));
    }
  };
  return (
    <div className="space-y-6">
      <DashboardHeader
        title={t("recording.page_title")}
        description={t("recording.page_description")}
      />

       {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Hướng dẫn quyền truy cập */}
        <Alert className="mb-4 bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-blue-700">
          <p>
            <strong>{t('recording.instructions.title')}</strong>
          </p>
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>{t('recording.instructions.step1')}</li>
            <li>{t('recording.instructions.step2')}</li>
            <li>{t('recording.instructions.step3')}</li>
            <li>{t('recording.instructions.step4')}</li>
            <li>{t('recording.instructions.step5')}</li>
            <li>{t('recording.instructions.step6')}</li>
            <li>{t('recording.instructions.step7')}</li>
          </ol>
          <p className="mt-2">
            <strong>{t('recording.instructions.note_title')}</strong>
            <br/>
            - {t('recording.instructions.note_1')}
            <br/>
            - {t('recording.instructions.note_2')}
          </p>
        </AlertDescription>
      </Alert>

      {availableDevices.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium mb-1">
            {t('recording.available_devices', { count: availableDevices.length })}     
      </p>
          <ul className="text-sm text-gray-600">
            {availableDevices.map((device, index) => (
              <li key={device.deviceId || index} className="truncate">
                {device.label || t('recording.camera_label', { index: index + 1 })}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">           
             <CardTitle>{t('recording.list_title')}</CardTitle>            <div className="flex items-center gap-4">
              <ToggleGroup type="single" value={recordingType} onValueChange={(value: "webcam" | "screen") => setRecordingType(value)} className="border rounded-lg">
                <ToggleGroupItem value="webcam" className="px-4">
                  <Camera className="h-4 w-4 mr-2" />
                  {t('recording.webcam')}
                </ToggleGroupItem>
                <ToggleGroupItem value="screen" className="px-4">
                  <Monitor className="h-4 w-4 mr-2" />
                  {t('recording.screen')}
                </ToggleGroupItem>
              </ToggleGroup>

              <Button onClick={recordingType === "webcam" ? startNewRecording : startScreenRecording} disabled={!!errorMessage}>
          <Video className="mr-2 h-4 w-4" />
          {recordingType === "webcam" ? t('recording.start_webcam') : t('recording.start_screen')}
        </Button>
              <RecordingSettingsDialog
                settings={recordingSettings}
                onSave={handleSaveSettings}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recordings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
                      {t('recording.no_recordings')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className="relative rounded-lg border overflow-hidden"
                >
                  <div className="relative">
                    <video
                      ref={(video) => {
                        if (
                          video &&
                          !video.srcObject &&
                          recording.isRecording
                        ) {
                          video.srcObject = recording.stream;
                          video
                            .play()
                            .catch((err) =>
                              console.warn(t('recording.video_playback_warning'), err)
                            );
                        }
                      }}
                      className="w-full h-48 object-cover bg-gray-100"
                      src={recording.videoURL || undefined}
                      controls={!recording.isRecording}
                      playsInline
                    />
                    {recording.isRecording && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                        <span className="inline-block w-2 h-2 bg-white rounded-full"></span>
                         {t('recording.status.recording_badge')}
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex justify-between items-center">
                    <div className="text-sm">
                {recording.isRecording ? t('recording.status.recording') : t('recording.status.completed')}
                    </div>
                    <div className="flex gap-2">
                      {recording.isRecording ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => stopRecording(recording.id)}
                        >
                          <StopCircle className="h-4 w-4 mr-1" />
                           {t('recording.stop_button')}
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => downloadRecording(recording.id)}
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          {t('recording.download_button')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Trang chính sẽ chỉ render component của chúng ta ở phía client
export default function RecordingsPage() {
  return <RecordingComponent />;
}
