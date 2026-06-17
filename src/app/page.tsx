"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import VideoSidebar from "@/components/VideoSidebar";
import VideoPlayer, { VideoPlayerHandle } from "@/components/VideoPlayer";
import ScoringPanel from "@/components/ScoringPanel";
import { Video, LabelFormData } from "@/types";
import styles from "./page.module.css";

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [labels, setLabels] = useState<LabelFormData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const videoPlayerRef = useRef<VideoPlayerHandle>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch("/api/videos");
      if (res.ok) {
        const data = await res.json();
        setVideos(data);
      }
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const handleSelectVideo = useCallback((video: Video) => {
    setSelectedVideo(video);
    if (video.labels.length === 0) {
      // Default to 10 reps if no labels exist yet
      const defaultLabels: LabelFormData[] = Array.from({ length: 10 }, (_, i) => ({
        repetitionNum: i + 1,
        startTime: 0,
        endTime: 0,
        score: null,
      }));
      setLabels(defaultLabels);
    } else {
      const formLabels: LabelFormData[] = video.labels.map((l) => ({
        repetitionNum: l.repetitionNum,
        startTime: l.startTime,
        endTime: l.endTime,
        score: l.score,
      }));
      setLabels(formLabels);
    }
  }, []);

  const handleRemoveLabel = useCallback((repNum: number) => {
    setLabels((prev) => {
      const filtered = prev.filter((l) => l.repetitionNum !== repNum);
      // Renumber remaining labels to keep consecutive
      return filtered.map((l, i) => ({ ...l, repetitionNum: i + 1 }));
    });
  }, []);

  const handleUpdateScore = useCallback((repNum: number, score: number | null) => {
    setLabels((prev) => prev.map((l) => l.repetitionNum === repNum ? { ...l, score } : l));
  }, []);

  const handleSaveAll = useCallback(async () => {
    if (!selectedVideo) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/videos/${selectedVideo.id}/labels`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels }),
      });
      if (res.ok) {
        showToast("บันทึกคะแนนสำเร็จ!");
        fetchVideos();
        const updatedLabels = await res.json();
        setSelectedVideo((prev) => prev ? { ...prev, labels: updatedLabels } : prev);
      } else {
        showToast("บันทึกไม่สำเร็จ", "error");
      }
    } catch { showToast("บันทึกไม่สำเร็จ", "error"); }
    finally { setIsSaving(false); }
  }, [selectedVideo, labels, fetchVideos, showToast]);

  const handleAddRepetition = useCallback(() => {
    const nextRep = labels.length > 0 ? Math.max(...labels.map(l => l.repetitionNum)) + 1 : 1;
    setLabels((prev) => [...prev, { repetitionNum: nextRep, startTime: 0, endTime: 0, score: null }]);
  }, [labels]);

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <h1 className={styles.headerTitle}>ระบบให้คะแนนผู้ป่วยกายภาพบำบัด</h1>
            <p className={styles.headerSub}>Rehabilitation Data Labelling Platform</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.headerBadge}>{videos.length} วิดีโอ</span>
        </div>
      </header>

      {/* Main Layout */}
      <div className={styles.main}>
        {/* Left: Video Sidebar */}
        <VideoSidebar
          videos={videos}
          selectedVideoId={selectedVideo?.id ?? null}
          onSelectVideo={handleSelectVideo}
        />

        {/* Center: Video Player */}
        <main className={styles.center}>
          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.loadingSpinner} />
              <p>กำลังโหลดวิดีโอ...</p>
            </div>
          ) : (
            <>
              {selectedVideo && (
                <div className={styles.videoTitle}>
                  <h2>{selectedVideo.title}</h2>
                </div>
              )}
              <VideoPlayer ref={videoPlayerRef} video={selectedVideo} />
            </>
          )}
        </main>

        {/* Right: Scoring Panel */}
        <ScoringPanel
          labels={labels}
          onUpdateScore={handleUpdateScore}
          onRemoveLabel={handleRemoveLabel}
          onSaveAll={handleSaveAll}
          isSaving={isSaving}
          videoSelected={!!selectedVideo}
          onAddRepetition={handleAddRepetition}
        />
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
}
