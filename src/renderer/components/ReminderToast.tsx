import React, { useState, useEffect, useCallback } from 'react';
import { ReminderData } from '../../shared/types';

interface Props {
  reminder: ReminderData;
  onDismiss: (ruleId: string, delayMinutes?: number) => void;
}

export default function ReminderToast({ reminder, onDismiss }: Props) {
  const [visible, setVisible] = useState(true);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    onDismiss(reminder.id);
  }, [reminder.id, onDismiss]);

  const handleSnooze = useCallback(() => {
    setVisible(false);
    onDismiss(reminder.id, 10); // 延迟 10 分钟
  }, [reminder.id, onDismiss]);

  if (!visible) return null;

  return (
    <div className="reminder-toast">
      <div className="reminder-emoji">{reminder.emoji}</div>
      <div className="reminder-message">{reminder.message}</div>
      <div className="reminder-actions">
        <button className="reminder-btn snooze" onClick={handleSnooze}>
          10分钟后提醒
        </button>
        <button className="reminder-btn dismiss" onClick={handleDismiss}>
          知道了
        </button>
      </div>
    </div>
  );
}
