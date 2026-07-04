import React, { useState, useCallback } from 'react';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('');

  const handleSave = useCallback(() => {
    // TODO: 保存设置到数据库
    onClose();
  }, [onClose]);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-page" onClick={(e) => e.stopPropagation()}>
        <h2>⚙️ 设置</h2>

        <div className="settings-section">
          <h3>AI 配置</h3>
          <div className="settings-field">
            <label>API Base URL</label>
            <input
              type="text"
              placeholder="https://api.openai.com/v1"
              value={aiBaseUrl}
              onChange={(e) => setAiBaseUrl(e.target.value)}
            />
          </div>
          <div className="settings-field">
            <label>API Key</label>
            <input
              type="password"
              placeholder="sk-..."
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
            />
          </div>
          <div className="settings-field">
            <label>模型</label>
            <input
              type="text"
              placeholder="gpt-4o-mini"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
            />
          </div>
        </div>

        <div className="settings-section">
          <h3>提醒设置</h3>
          <p style={{ fontSize: 13, color: '#999' }}>即将在 V2 版本开放...</p>
        </div>

        <div className="settings-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            保存
          </button>
        </div>

        <div className="settings-about">
          桌宠学习陪伴 v1.0.0
        </div>
      </div>
    </div>
  );
}
