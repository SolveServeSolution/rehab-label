"use client";

import { useState } from "react";
import { Video } from "@/types";
import styles from "./VideoSidebar.module.css";

interface VideoSidebarProps {
  videos: Video[];
  selectedVideoId: string | null;
  onSelectVideo: (video: Video) => void;
}

type TabType = "pending" | "completed";

export default function VideoSidebar({
  videos,
  selectedVideoId,
  onSelectVideo,
}: VideoSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>("pending");

  const getLabelProgress = (video: Video) => {
    const scored = video.labels.filter((l) => l.score !== null).length;
    const total = video.labels.length;
    return { scored, total };
  };

  const pendingVideos = videos.filter((v) => {
    const { scored, total } = getLabelProgress(v);
    return total === 0 || scored < total;
  });
  const completedVideos = videos.filter((v) => {
    const { scored, total } = getLabelProgress(v);
    return total > 0 && scored === total;
  });

  const displayedVideos = activeTab === "pending" ? pendingVideos : completedVideos;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.titleIcon}>🎬</span>
          Video Clips
        </h2>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${activeTab === "pending" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          รอให้คะแนน <span className={styles.tabBadge}>{pendingVideos.length}</span>
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "completed" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          เสร็จแล้ว <span className={styles.tabBadge}>{completedVideos.length}</span>
        </button>
      </div>

      <div className={styles.list}>
        {displayedVideos.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📁</div>
            <p>ไม่มีวิดีโอในหมวดหมู่นี้</p>
          </div>
        )}

        {displayedVideos.map((video, index) => {
          const { scored, total } = getLabelProgress(video);
          const isSelected = video.id === selectedVideoId;
          const progressPct = total > 0 ? (scored / total) * 100 : 0;

          return (
            <button
              key={video.id}
              className={`${styles.card} ${isSelected ? styles.cardActive : ""}`}
              onClick={() => onSelectVideo(video)}
            >
              <div className={styles.cardIndex}>#{index + 1}</div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{video.title}</h3>
                <div className={styles.cardMeta}>
                  {video.folderName && (
                    <span className={styles.folderBadge}>📁 {video.folderName}</span>
                  )}
                  <span className={styles.labelBadge}>
                    {total === 0 ? "ยังไม่เริ่ม" : `ให้คะแนนแล้ว ${scored}/${total}`}
                  </span>
                  {total > 0 && (
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              {isSelected && <div className={styles.activeIndicator} />}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
