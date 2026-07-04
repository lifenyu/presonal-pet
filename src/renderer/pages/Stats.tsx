import React, { useState, useEffect, useCallback } from 'react';
import { CategoryStat, CATEGORIES, CategoryKey } from '../../shared/types';

interface Props {
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  return remainMin > 0 ? `${hours}小时${remainMin}分钟` : `${hours}小时`;
}

function getCategoryInfo(key: string) {
  return CATEGORIES.find((c) => c.key === key) || { key: 'other', label: '其他', emoji: '📦' };
}

export default function Stats({ onClose }: Props) {
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electronAPI.getTodayStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  const totalDuration = stats.reduce((sum, s) => sum + s.total_duration, 0);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-page stats-page" onClick={(e) => e.stopPropagation()}>
        <h2>📊 今日使用统计</h2>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#999' }}>加载中...</p>
        ) : stats.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999' }}>今天还没有使用记录</p>
        ) : (
          <>
            {/* 总时长 */}
            <div className="stats-total">
              总使用时长：<strong>{formatDuration(totalDuration)}</strong>
            </div>

            {/* 分类统计 */}
            <div className="stats-list">
              {stats.map((stat) => {
                const info = getCategoryInfo(stat.category);
                const percent = totalDuration > 0
                  ? Math.round((stat.total_duration / totalDuration) * 100)
                  : 0;
                return (
                  <div key={stat.category} className="stats-item">
                    <div className="stats-item-header">
                      <span className="stats-item-emoji">{info.emoji}</span>
                      <span className="stats-item-label">{info.label}</span>
                      <span className="stats-item-time">{formatDuration(stat.total_duration)}</span>
                      <span className="stats-item-percent">{percent}%</span>
                    </div>
                    <div className="stats-bar-bg">
                      <div
                        className="stats-bar-fill"
                        style={{ width: `${percent}%` }}
                        data-category={stat.category}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="settings-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
