import { useState, useCallback } from 'react';

export interface UserSettings {
  instancesAutoRefresh: boolean;
}

const SETTINGS_KEY = 'user-settings';

const defaultSettings: UserSettings = {
  instancesAutoRefresh: true,
};

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    settings,
    updateSettings,
  };
} 