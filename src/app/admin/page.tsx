"use client";

import { useState, useEffect, useCallback } from "react";
import { Video } from "@/types";
import AddVideoModal from "@/components/AddVideoModal";
import ImportFolderModal from "@/components/ImportFolderModal";
import ConfirmModal from "@/components/ConfirmModal";
import styles from "./page.module.css";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Edit Modal State
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDriveUrl, setEditDriveUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

  // Check auth
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "rehab123") {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("รหัสผ่านไม่ถูกต้อง");
    }
  };

  const fetchVideos = useCallback(async () => {
    setIsLoading(true);
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchVideos();
    }
  }, [isAuthenticated, fetchVideos]);

  // Handlers for Add/Import
  const handleAddVideo = async (title: string, driveUrl: string) => {
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, driveUrl }),
      });
      if (res.ok) {
        alert("เพิ่มวิดีโอสำเร็จ!");
        fetchVideos();
      } else {
        alert("เพิ่มวิดีโอไม่สำเร็จ");
      }
    } catch {
      alert("เพิ่มวิดีโอไม่สำเร็จ");
    }
  };

  const handleImportFolder = async (folderUrl: string) => {
    try {
      const res = await fetch("/api/videos/import-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "นำเข้าโฟลเดอร์สำเร็จ!");
        fetchVideos();
      } else {
        alert(data.error || "นำเข้าโฟลเดอร์ไม่สำเร็จ");
      }
    } catch {
      alert("นำเข้าโฟลเดอร์ไม่สำเร็จ");
    }
  };

  // Handlers for Edit
  const openEditModal = (video: Video) => {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDriveUrl(video.driveUrl);
    setIsEditing(true);
  };

  const closeEditModal = () => {
    setIsEditing(false);
    setEditingVideo(null);
  };

  const handleSaveEdit = async () => {
    if (!editingVideo) return;
    try {
      // Convert URL to embed format if needed
      let embedUrl = editDriveUrl.trim();
      const fileIdMatch = embedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch) {
        embedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
      }

      const res = await fetch(`/api/videos/${editingVideo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, driveUrl: embedUrl }),
      });
      if (res.ok) {
        alert("อัปเดตข้อมูลสำเร็จ!");
        fetchVideos();
        closeEditModal();
      } else {
        alert("อัปเดตไม่สำเร็จ");
      }
    } catch {
      alert("อัปเดตไม่สำเร็จ");
    }
  };

  const handleDelete = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "ลบวิดีโอ",
      message: "คุณแน่ใจหรือไม่ว่าต้องการลบวิดีโอนี้? ข้อมูลการให้คะแนนทั้งหมดจะถูกลบด้วย",
      onConfirm: async () => {
        closeConfirm();
        try {
          const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
          if (res.ok) {
            alert("ลบวิดีโอสำเร็จ");
            fetchVideos();
          } else {
            alert("ลบไม่สำเร็จ");
          }
        } catch {
          alert("ลบไม่สำเร็จ");
        }
      }
    });
  };

  const handleDownloadCSV = () => {
    if (videos.length === 0) {
      alert("ไม่มีข้อมูลให้ดาวน์โหลด");
      return;
    }

    const headers = ["Video ID", "Video Title", "Drive URL", "Folder", "Repetition", "Score", "Score Label"];
    const rows = [];
    
    const scoreMap: Record<number, string> = {
      0: "Incorrect",
      1: "Partial",
      2: "Correct"
    };

    for (const video of videos) {
      if (video.labels.length === 0) {
        // Include video even if no labels
        rows.push([
          video.id,
          `"${video.title.replace(/"/g, '""')}"`,
          `"${video.driveUrl}"`,
          `"${video.folderName || ""}"`,
          "",
          "",
          ""
        ]);
      } else {
        const sortedLabels = [...video.labels].sort((a, b) => a.repetitionNum - b.repetitionNum);
        for (const label of sortedLabels) {
          const scoreLabel = label.score !== null ? scoreMap[label.score] : "Unscored";
          rows.push([
            video.id,
            `"${video.title.replace(/"/g, '""')}"`,
            `"${video.driveUrl}"`,
            `"${video.folderName || ""}"`,
            label.repetitionNum,
            label.score !== null ? label.score : "",
            scoreLabel
          ]);
        }
      }
    }

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\\n");
    const blob = new Blob(["\\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" }); // Add BOM for Excel UTF-8
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `rehab-labels-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearData = () => {
    setConfirmConfig({
      isOpen: true,
      title: "⚠️ ล้างเฉพาะคะแนนทั้งหมด",
      message: "คำเตือน: คุณแน่ใจหรือไม่ว่าต้องการ 'ล้างคะแนนทั้งหมด' ในระบบ? (คะแนนจะหายหมดแต่วิดีโอยังอยู่)",
      onConfirm: async () => {
        closeConfirm();
        try {
          const res = await fetch("/api/admin/clear-data", { method: "POST" });
          if (res.ok) {
            alert("ล้างคะแนนทั้งหมดสำเร็จ");
            fetchVideos();
          } else {
            alert("ล้างข้อมูลไม่สำเร็จ");
          }
        } catch {
          alert("ล้างข้อมูลไม่สำเร็จ");
        }
      }
    });
  };

  const handleDeleteAllVideos = () => {
    setConfirmConfig({
      isOpen: true,
      title: "🚨 ลบวิดีโอทั้งหมด",
      message: "คำเตือนขั้นเด็ดขาด: คุณแน่ใจหรือไม่ว่าต้องการ 'ลบวิดีโอทั้งหมด' ออกจากระบบ? (ข้อมูลและคะแนนจะหายไปอย่างถาวร)",
      onConfirm: async () => {
        closeConfirm();
        try {
          const res = await fetch("/api/admin/clear-data", { method: "DELETE" });
          if (res.ok) {
            alert("ลบวิดีโอทั้งหมดสำเร็จ");
            fetchVideos();
          } else {
            alert("ลบวิดีโอไม่สำเร็จ");
          }
        } catch {
          alert("ลบวิดีโอไม่สำเร็จ");
        }
      }
    });
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.loginWrap}>
        <div className={styles.loginBox}>
          <h1 className={styles.loginTitle}>Admin Portal</h1>
          <p className={styles.loginSub}>กรุณาใส่รหัสผ่านเพื่อจัดการวิดีโอ</p>
          <form onSubmit={handleLogin} className={styles.inputGroup}>
            <input
              type="password"
              placeholder="รหัสผ่าน"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit" className={styles.loginBtn}>เข้าสู่ระบบ</button>
          </form>
          {authError && <div className={styles.errorText}>{authError}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>จัดการวิดีโอ (Admin)</div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleDeleteAllVideos} title="ลบวิดีโอทั้งหมด">
            🚨 ลบวิดีโอทั้งหมด
          </button>
          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleClearData} title="ล้างเฉพาะคะแนนทั้งหมด">
            🗑️ ล้างคะแนน
          </button>
          <button className={styles.btn} onClick={handleDownloadCSV}>
            📥 โหลด CSV
          </button>
          <button className={styles.btn} onClick={() => setShowImportModal(true)}>
            นำเข้าโฟลเดอร์ Google Drive
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowAddModal(true)}>
            + เพิ่มวิดีโอใหม่
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>วิดีโอ</th>
                <th>โฟลเดอร์</th>
                <th>ลิงก์ Drive</th>
                <th>จำนวนครั้งที่ให้คะแนน</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ textAlign: "center" }}>กำลังโหลด...</td></tr>
              ) : videos.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center" }}>ยังไม่มีวิดีโอ</td></tr>
              ) : (
                videos.map((video) => (
                  <tr key={video.id}>
                    <td>
                      <div className={styles.cellTitle}>{video.title}</div>
                      <div className={styles.cellId}>{video.id}</div>
                    </td>
                    <td>{video.folderName || "-"}</td>
                    <td>
                      <a href={video.driveUrl} target="_blank" rel="noreferrer" className={styles.link}>
                        เปิดดู
                      </a>
                    </td>
                    <td>
                      {video.labels.filter(l => l.score !== null).length} / {video.labels.length}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.iconBtn} onClick={() => openEditModal(video)} title="แก้ไขลิงก์">
                          ✏️
                        </button>
                        <button className={`${styles.iconBtn} ${styles.iconBtnDanger}`} onClick={() => handleDelete(video.id)} title="ลบวิดีโอ">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      <AddVideoModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddVideo} />
      <ImportFolderModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImportFolder} />

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={closeConfirm}
        isDanger={true}
      />

      {/* Edit Modal (Local) */}
      {isEditing && editingVideo && (
        <div className={styles.loginWrap} style={{ position: "fixed", inset: 0, zIndex: 100, backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className={styles.loginBox} style={{ maxWidth: "500px", textAlign: "left" }}>
            <h2 className={styles.loginTitle} style={{ marginBottom: "24px" }}>แก้ไขวิดีโอ</h2>
            <div className={styles.modalForm}>
              <div>
                <label className={styles.formLabel}>ชื่อวิดีโอ</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <label className={styles.formLabel}>ลิงก์ Google Drive (เปลี่ยนลิงก์แต่คะแนนเดิมยังอยู่)</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editDriveUrl}
                  onChange={(e) => setEditDriveUrl(e.target.value)}
                />
              </div>
              <div className={styles.modalActions}>
                <button className={styles.btn} onClick={closeEditModal}>ยกเลิก</button>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSaveEdit}>บันทึกการแก้ไข</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
