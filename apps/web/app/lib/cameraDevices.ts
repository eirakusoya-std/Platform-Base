"use client";

const VIRTUAL_CAMERA_KEYWORDS = [
  "virtual",
  "obs",
  "vcam",
  "snap camera",
  "xsplit",
  "mmhmm",
  "camo",
  "ndi",
];

export function isLikelyVirtualCamera(label: string) {
  const lower = label.toLowerCase();
  return VIRTUAL_CAMERA_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export function pickPreferredVideoDevice(devices: MediaDeviceInfo[]) {
  const virtual = devices.find((device) => isLikelyVirtualCamera(device.label));
  return virtual ?? devices[0] ?? null;
}
