import React, { useState, useEffect, useCallback } from 'react';

const GREETINGS = [
  '你好呀~ 🎀',
  '今天也要加油哦！💪',
  '记得喝水哦~ 💧',
  '休息一下吧 ☕',
  '学习辛苦啦 📚',
  '喵~ 🐱',
  '有什么我能帮忙的吗？',
];

interface Props {
  onOpenSettings: () => void;
  onOpenStats: () => void;
}

export default function PetWindow({ onOpenSettings, onOpenStats }: Props) {
  const [bubble, setBubble] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const showRandomGreeting = useCallback(() => {
    const msg = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    setBubble(msg);
    setTimeout(() => setBubble(null), 3000);
  }, []);

  const handlePetClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    showRandomGreeting();
  }, [showRandomGreeting]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleSettings = useCallback(() => {
    setContextMenu(null);
    onOpenSettings();
  }, [onOpenSettings]);

  const handleStats = useCallback(() => {
    setContextMenu(null);
    onOpenStats();
  }, [onOpenStats]);

  const handleQuit = useCallback(() => {
    window.electronAPI.quitApp();
  }, []);

  return (
    <div className="pet-window" onContextMenu={handleContextMenu}>
      {bubble && <div className="pet-bubble">{bubble}</div>}

      <div className="pet-avatar" onClick={handlePetClick}>
        🐱
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="context-menu-item" onClick={showRandomGreeting}>
            摸摸头 🤚
          </div>
          <div className="context-menu-item" onClick={handleStats}>
            使用统计 📊
          </div>
          <div className="context-menu-item" onClick={handleSettings}>
            设置 ⚙️
          </div>
          <div className="context-menu-separator" />
          <div className="context-menu-item" onClick={handleQuit}>
            退出 👋
          </div>
        </div>
      )}
    </div>
  );
}
