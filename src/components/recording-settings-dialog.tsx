"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecordingSettings } from "@/lib/api/classroom";
import { useState } from "react";

interface RecordingSettingsDialogProps {
  settings?: RecordingSettings;
  onSave: (settings: RecordingSettings) => void;
}

const resolutionOptions = [
  { label: "Full HD (1920x1080)", value: "1920x1080" },
  { label: "HD (1280x720)", value: "1280x720" },
  { label: "SD (854x480)", value: "854x480" },
  { label: "Low (640x360)", value: "640x360" },
];

const fpsOptions = [
  { label: "60 FPS", value: "60" },
  { label: "30 FPS", value: "30" },
  { label: "24 FPS", value: "24" },
  { label: "15 FPS", value: "15" },
];

const codecOptions = [
  { label: "H.264", value: "h264" },
  { label: "VP8", value: "vp8" },
  { label: "VP9", value: "vp9" },
];

const defaultSettings: RecordingSettings = {
  resolution: "1280x720",
  bitrate: 2000,
  fps: 30,
  codec: "h264",
  audioQuality: {
    bitrate: 128,
    sampleRate: 44100,
    channels: 2,
  },
};

export function RecordingSettingsDialog({
  settings,
  onSave,
}: RecordingSettingsDialogProps) {
  const [currentSettings, setCurrentSettings] = useState<RecordingSettings>(
    settings || defaultSettings
  );
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = () => {
    onSave(currentSettings);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Cấu hình ghi hình</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Cấu hình ghi hình</DialogTitle>
          <DialogDescription>
            Điều chỉnh các thông số chất lượng video và âm thanh cho buổi học
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Độ phân giải</Label>
            <Select
              value={currentSettings.resolution}
              onValueChange={(value) =>
                setCurrentSettings((prev) => ({ ...prev, resolution: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn độ phân giải" />
              </SelectTrigger>
              <SelectContent>
                {resolutionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tốc độ khung hình</Label>
            <Select
              value={currentSettings.fps.toString()}
              onValueChange={(value) =>
                setCurrentSettings((prev) => ({
                  ...prev,
                  fps: parseInt(value, 10),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn FPS" />
              </SelectTrigger>
              <SelectContent>
                {fpsOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bitrate video (kbps)</Label>
            <Input
              type="number"
              value={currentSettings.bitrate}
              onChange={(e) =>
                setCurrentSettings((prev) => ({
                  ...prev,
                  bitrate: parseInt(e.target.value, 10),
                }))
              }
              min={500}
              max={8000}
            />
          </div>

          <div className="space-y-2">
            <Label>Codec video</Label>
            <Select
              value={currentSettings.codec}
              onValueChange={(value) =>
                setCurrentSettings((prev) => ({ ...prev, codec: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn codec" />
              </SelectTrigger>
              <SelectContent>
                {codecOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Cấu hình âm thanh</h4>
            <div className="space-y-2">
              <Label>Bitrate âm thanh (kbps)</Label>
              <Input
                type="number"
                value={currentSettings.audioQuality.bitrate}
                onChange={(e) =>
                  setCurrentSettings((prev) => ({
                    ...prev,
                    audioQuality: {
                      ...prev.audioQuality,
                      bitrate: parseInt(e.target.value, 10),
                    },
                  }))
                }
                min={64}
                max={320}
              />
            </div>

            <div className="space-y-2">
              <Label>Tần số lấy mẫu (Hz)</Label>
              <Select
                value={currentSettings.audioQuality.sampleRate.toString()}
                onValueChange={(value) =>
                  setCurrentSettings((prev) => ({
                    ...prev,
                    audioQuality: {
                      ...prev.audioQuality,
                      sampleRate: parseInt(value, 10),
                    },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tần số lấy mẫu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="44100">44.1 kHz</SelectItem>
                  <SelectItem value="48000">48 kHz</SelectItem>
                  <SelectItem value="96000">96 kHz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kênh âm thanh</Label>
              <Select
                value={currentSettings.audioQuality.channels.toString()}
                onValueChange={(value) =>
                  setCurrentSettings((prev) => ({
                    ...prev,
                    audioQuality: {
                      ...prev.audioQuality,
                      channels: parseInt(value, 10),
                    },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn số kênh" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Mono (1 kênh)</SelectItem>
                  <SelectItem value="2">Stereo (2 kênh)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Hủy
          </Button>
          <Button onClick={handleSave}>Lưu cấu hình</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
