import React, { useState, useCallback, useEffect } from 'react';
import PetWindow from './components/PetWindow';
import ReminderToast from './components/ReminderToast';
import Settings from './pages/Settings';
import Stats from './pages/Stats';
import { ViewType, ReminderData } from '../shared/types';

export default function App() {
  const [view, setView] = useState<ViewType>('pet');
  const [reminder, setReminder] = useState<ReminderData | null>(null);

  // 监听提醒事件
  useEffect(() => {
    const cleanup = window.electronAPI.onReminderShow((data) => {
      setReminder(data);
    });
    return cleanup;
  }, []);

  const handleOpenSettings = useCallback(() => {
    setView('settings');
    window.electronAPI.toggleSettings(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setView('pet');
    window.electronAPI.toggleSettings(false);
  }, []);

  const handleOpenStats = useCallback(() => {
    setView('stats');
    window.electronAPI.toggleSettings(true); // 扩大窗口
  }, []);

  const handleCloseStats = useCallback(() => {
    setView('pet');
    window.electronAPI.toggleSettings(false);
  }, []);

  const handleDismissReminder = useCallback((ruleId: string, delayMinutes?: number) => {
    window.electronAPI.dismissReminder(ruleId, delayMinutes);
    setReminder(null);
  }, []);

  return (
    <>
      <PetWindow
        onOpenSettings={handleOpenSettings}
        onOpenStats={handleOpenStats}
      />
      {view === 'settings' && <Settings onClose={handleCloseSettings} />}
      {view === 'stats' && <Stats onClose={handleCloseStats} />}
      {reminder && (
        <ReminderToast
          reminder={reminder}
          onDismiss={handleDismissReminder}
        />
      )}
    </>
  );
}
