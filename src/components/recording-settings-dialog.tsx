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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecordingSettings } from "@/lib/api/classroom";
import { useState } from "react";
import { useTranslation } from "react-i18next";

// --- Props Interface and Constants that don't depend on hooks ---
interface RecordingSettingsDialogProps {
  settings?: RecordingSettings;
  onSave: (settings: RecordingSettings) => void;
}

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

// --- Component Function ---
export function RecordingSettingsDialog({ settings, onSave }: RecordingSettingsDialogProps) {
  // 1. Call hooks *inside* the component function.
  const { t } = useTranslation();
  const [currentSettings, setCurrentSettings] = useState<RecordingSettings>(
    settings || defaultSettings
  );
  const [isOpen, setIsOpen] = useState(false);

  // 2. Define constants that depend on hooks *inside* the component.
  const resolutionOptions = [
    { label: t('settings_dialog.options.resolutions.full_hd'), value: "1920x1080" },
    { label: t('settings_dialog.options.resolutions.hd'), value: "1280x720" },
    { label: t('settings_dialog.options.resolutions.sd'), value: "854x480" },
    { label: t('settings_dialog.options.resolutions.low'), value: "640x360" },
  ];

  const handleSave = () => {
    onSave(currentSettings);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t('settings_dialog.trigger_button')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('settings_dialog.title')}</DialogTitle>
          <DialogDescription>{t('settings_dialog.description')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Resolution */}
          <div className="space-y-2">
            <Label>{t('settings_dialog.labels.resolution')}</Label>
            <Select
              value={currentSettings.resolution}
              onValueChange={(value) =>
                setCurrentSettings((prev) => ({ ...prev, resolution: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('settings_dialog.placeholders.resolution')} />
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

          {/* Frame Rate */}
          <div className="space-y-2">
            <Label>{t('settings_dialog.labels.fps')}</Label>
            <Select
              value={currentSettings.fps.toString()}
              onValueChange={(value) =>
                setCurrentSettings((prev) => ({ ...prev, fps: parseInt(value, 10) }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('settings_dialog.placeholders.fps')} />
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

          {/* Video Bitrate */}
          <div className="space-y-2">
            <Label>{t('settings_dialog.labels.video_bitrate')}</Label>
            <Input
              type="number"
              value={currentSettings.bitrate}
              onChange={(e) =>
                setCurrentSettings((prev) => ({
                  ...prev,
                  bitrate: parseInt(e.target.value, 10) || 0,
                }))
              }
              min={500}
              max={8000}
            />
          </div>

          {/* Video Codec */}
          <div className="space-y-2">
            <Label>{t('settings_dialog.labels.video_codec')}</Label>
            <Select
              value={currentSettings.codec}
              onValueChange={(value) =>
                setCurrentSettings((prev) => ({ ...prev, codec: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('settings_dialog.placeholders.codec')} />
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

          {/* Audio Settings */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">{t('settings_dialog.labels.audio_settings')}</h4>
            <div className="space-y-2">
              <Label>{t('settings_dialog.labels.audio_bitrate')}</Label>
              <Input
                type="number"
                value={currentSettings.audioQuality.bitrate}
                onChange={(e) =>
                  setCurrentSettings((prev) => ({
                    ...prev,
                    audioQuality: {
                      ...prev.audioQuality,
                      bitrate: parseInt(e.target.value, 10) || 0,
                    },
                  }))
                }
                min={64}
                max={320}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('settings_dialog.labels.sample_rate')}</Label>
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
                  <SelectValue placeholder={t('settings_dialog.placeholders.sample_rate')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="44100">44.1 kHz</SelectItem>
                  <SelectItem value="48000">48 kHz</SelectItem>
                  <SelectItem value="96000">96 kHz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('settings_dialog.labels.audio_channels')}</Label>
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
                  <SelectValue placeholder={t('settings_dialog.placeholders.channels')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('settings_dialog.options.channels.mono')}</SelectItem>
                  <SelectItem value="2">{t('settings_dialog.options.channels.stereo')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t('settings_dialog.buttons.cancel')}
          </Button>
          <Button onClick={handleSave}>{t('settings_dialog.buttons.save')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
