"use client";

import { useState } from "react";
import styles from "./AddVideoModal.module.css";

interface AddVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (title: string, driveUrl: string) => void;
}

export default function AddVideoModal({ isOpen, onClose, onAdd }: AddVideoModalProps) {
  const [title, setTitle] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }
    if (!driveUrl.trim()) {
      setError("Please enter a Google Drive URL");
      return;
    }

    // Convert share URL to embed URL if needed
    let embedUrl = driveUrl.trim();
    
    // Handle various Google Drive URL formats
    const fileIdMatch = embedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) {
      embedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    } else if (!embedUrl.includes("/preview")) {
      setError("Invalid Google Drive URL. Use a share link like: https://drive.google.com/file/d/FILE_ID/view");
      return;
    }

    onAdd(title.trim(), embedUrl);
    setTitle("");
    setDriveUrl("");
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Add New Video</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Video Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
              placeholder="e.g. Patient A - Shoulder Flexion"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Google Drive URL</label>
            <input
              type="text"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              className={styles.input}
              placeholder="https://drive.google.com/file/d/.../"
            />
            <p className={styles.hint}>
              Paste the share link. Make sure the video is set to &quot;Anyone with the link&quot;.
            </p>
          </div>

          {error && (
            <div className={styles.error}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Video
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
