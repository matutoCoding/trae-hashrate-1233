import type { Rectification, ReminderRecord } from '@/types';

const STORAGE_KEY = 'cloud_disk_audit_rectifications_v1';
const SCREENSHOTS_KEY = 'cloud_disk_audit_screenshots_v1';
const REMINDERS_KEY = 'cloud_disk_audit_reminders_v1';

export function loadRectifications(): Rectification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Rectification[];
    }
  } catch (e) {
    console.error('Failed to load rectifications from localStorage', e);
  }
  return [];
}

export function saveRectifications(data: Rectification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save rectifications to localStorage', e);
  }
}

export function saveScreenshot(fileName: string, base64Data: string): void {
  try {
    const screenshots = loadScreenshots();
    screenshots[fileName] = base64Data;
    localStorage.setItem(SCREENSHOTS_KEY, JSON.stringify(screenshots));
  } catch (e) {
    console.error('Failed to save screenshot to localStorage', e);
  }
}

export function loadScreenshots(): Record<string, string> {
  try {
    const stored = localStorage.getItem(SCREENSHOTS_KEY);
    if (stored) {
      return JSON.parse(stored) as Record<string, string>;
    }
  } catch (e) {
    console.error('Failed to load screenshots from localStorage', e);
  }
  return {};
}

export function getScreenshot(fileName: string): string | undefined {
  const screenshots = loadScreenshots();
  return screenshots[fileName];
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function generateFileName(prefix: string, originalName: string): string {
  const ext = originalName.split('.').pop() || 'png';
  const timestamp = Date.now();
  return `${prefix}_${timestamp}.${ext}`;
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SCREENSHOTS_KEY);
  localStorage.removeItem(REMINDERS_KEY);
}

export function loadReminders(): ReminderRecord[] {
  try {
    const stored = localStorage.getItem(REMINDERS_KEY);
    if (stored) {
      return JSON.parse(stored) as ReminderRecord[];
    }
  } catch (e) {
    console.error('Failed to load reminders from localStorage', e);
  }
  return [];
}

export function saveReminders(data: ReminderRecord[]): void {
  try {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save reminders to localStorage', e);
  }
}
