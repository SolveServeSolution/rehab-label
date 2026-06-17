"use client";

import { forwardRef, useRef, useImperativeHandle, useEffect, useState } from "react";
import { Video } from "@/types";
import styles from "./VideoPlayer.module.css";

export interface VideoPlayerHandle {
  getVideoElement: () => HTMLVideoElement | null;
  seekTo: (time: number) => void;
  getDuration: () => number;
  getCurrentTime: () => number;
}

interface VideoPlayerProps {
  video: Video | null;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ video }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [proxyUrl, setProxyUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      getVideoElement: () => videoRef.current,
      seekTo: (time: number) => {
        if (videoRef.current && videoRef.current.readyState >= 1) {
          videoRef.current.currentTime = time;
        }
      },
      getDuration: () => videoRef.current?.duration || 0,
      getCurrentTime: () => videoRef.current?.currentTime || 0,
    }));

    // Build proxy URL when video changes
    useEffect(() => {
      if (!video) {
        setProxyUrl(null);
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      const url = `/api/videos/proxy?url=${encodeURIComponent(video.driveUrl)}`;
      setProxyUrl(url);
    }, [video]);

    const handleLoadedData = () => setIsLoading(false);
    const handleError = () => {
      setIsLoading(false);
      setError("Failed to load video. The file may not be publicly accessible.");
    };

    if (!video) {
      return (
        <div className={styles.placeholder}>
          <div className={styles.placeholderContent}>
            <div className={styles.placeholderIcon}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <h3>Select a video to start labelling</h3>
            <p>Choose a clip from the sidebar to begin</p>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.player}>
        <div className={styles.videoContainer}>
          {isLoading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
              <span>Loading video...</span>
            </div>
          )}
          {error ? (
            <div className={styles.errorOverlay}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{error}</p>
              <a href={video.driveUrl} target="_blank" rel="noopener noreferrer" className={styles.fallbackLink}>
                Open in Google Drive ↗
              </a>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={proxyUrl || undefined}
              className={styles.videoElement}
              controls
              controlsList="nodownload"
              onLoadedData={handleLoadedData}
              onError={handleError}
              preload="auto"
            />
          )}
        </div>
      </div>
    );
  }
);

export default VideoPlayer;
