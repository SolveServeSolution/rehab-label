"use client";

import { useState } from "react";
import styles from "./AddVideoModal.module.css"; // Reuse AddVideoModal styles

interface ImportFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (folderUrl: string) => Promise<void>;
}

export default function ImportFolderModal({ isOpen, onClose, onImport }: ImportFolderModalProps) {
  const [folderUrl, setFolderUrl] = useState("");
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!folderUrl.trim()) {
      setError("Please enter a Google Drive Folder URL");
      return;
    }

    setIsImporting(true);
    try {
      await onImport(folderUrl.trim());
      setFolderUrl("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to import folder");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Import from Folder</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={isImporting}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Google Drive Folder URL</label>
            <input
              type="text"
              value={folderUrl}
              onChange={(e) => setFolderUrl(e.target.value)}
              className={styles.input}
              placeholder="https://drive.google.com/drive/folders/.../"
              disabled={isImporting}
              autoFocus
            />
            <p className={styles.hint}>
              Paste the folder link. Ensure the folder is set to &quot;Anyone with the link&quot;. The system will recursively find all videos.
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
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isImporting}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isImporting}>
              {isImporting ? (
                <>Importing...</>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Import Folder
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
