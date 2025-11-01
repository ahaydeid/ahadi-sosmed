// src/lib/device.ts
export function getDeviceId(): string {
  if (typeof window === "undefined") return "unknown_device";

  let id = localStorage.getItem("rage_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("rage_device_id", id);
  }

  return id;
}
