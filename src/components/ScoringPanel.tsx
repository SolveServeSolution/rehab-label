"use client";

import { LabelFormData } from "@/types";
import styles from "./ScoringPanel.module.css";

interface ScoringPanelProps {
  labels: LabelFormData[];
  onUpdateScore: (repNum: number, score: number | null) => void;
  onRemoveLabel: (repNum: number) => void;
  onSaveAll: () => void;
  isSaving: boolean;
  videoSelected: boolean;
  onAddRepetition?: () => void;
}

const SCORE_LABELS: Record<number, string> = {
  0: "ไม่ถูกต้อง",
  1: "ถูกบางส่วน",
  2: "ถูกต้อง",
};

const SCORE_COLORS: Record<number, string> = {
  0: "var(--error)",
  1: "var(--warning)",
  2: "var(--success)",
};

const SCORE_EN: Record<number, string> = {
  0: "Incorrect",
  1: "Partial",
  2: "Correct",
};

export default function ScoringPanel({
  labels,
  onUpdateScore,
  onRemoveLabel,
  onSaveAll,
  isSaving,
  videoSelected,
  onAddRepetition,
}: ScoringPanelProps) {
  if (!videoSelected) {
    return (
      <aside className={styles.panel}>
        <div className={styles.emptyState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.25">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <p>เลือกวิดีโอก่อน<br />เพื่อเริ่มให้คะแนน</p>
        </div>
      </aside>
    );
  }

  const sortedLabels = [...labels].sort((a, b) => a.repetitionNum - b.repetitionNum);
  const scoredCount = sortedLabels.filter((l) => l.score !== null).length;
  const totalLabels = sortedLabels.length;
  const progressPct = totalLabels > 0 ? (scoredCount / totalLabels) * 100 : 0;

  return (
    <aside className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>การให้คะแนน</h3>
          <p className={styles.subtitle}>ให้คะแนนแต่ละครั้งของการออกกำลังกาย</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.progress}>{scoredCount}/{totalLabels}</span>
        </div>
      </div>

      {/* Progress bar */}
      {totalLabels > 0 && (
        <div className={styles.progressBarWrap}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
          <span className={styles.progressLabel}>{Math.round(progressPct)}%</span>
        </div>
      )}

      {/* Add Rep Button — big prominent */}
      <button className={styles.addRepBtn} onClick={onAddRepetition}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        เพิ่มครั้ง (Rep {totalLabels + 1})
      </button>

      {/* Scoring cards */}
      <div className={styles.scoringList}>
        {sortedLabels.length === 0 && (
          <div className={styles.emptyCards}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.2">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            <p>กด "เพิ่มครั้ง" เพื่อเริ่มให้คะแนน</p>
          </div>
        )}

        {sortedLabels.map((label) => {
          const repNum = label.repetitionNum;
          const score = label.score;

          return (
            <div
              key={repNum}
              className={`${styles.scoreCard} ${score !== null ? styles.scoreCardDone : ""}`}
            >
              {/* Card top row */}
              <div className={styles.cardTop}>
                <div className={styles.repBadge}>
                  <span className={styles.repNum}>{repNum}</span>
                  <span className={styles.repText}>ครั้งที่</span>
                </div>

                {score !== null && (
                  <span className={styles.scoreTag} style={{ background: SCORE_COLORS[score] }}>
                    {SCORE_LABELS[score]}
                  </span>
                )}

                <button
                  className={styles.deleteRepBtn}
                  onClick={() => onRemoveLabel(repNum)}
                  title="ลบครั้งนี้"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>

              {/* Score buttons */}
              <div className={styles.scoreButtons}>
                {[0, 1, 2].map((s) => (
                  <button
                    key={s}
                    className={`${styles.scoreBtn} ${score === s ? styles.scoreBtnActive : ""}`}
                    style={score === s ? { background: SCORE_COLORS[s], borderColor: SCORE_COLORS[s] } : {}}
                    onClick={() => onUpdateScore(repNum, score === s ? null : s)}
                  >
                    <span className={styles.scoreBtnNum}>{s}</span>
                    <span className={styles.scoreBtnTh}>{SCORE_LABELS[s]}</span>
                    <span className={styles.scoreBtnEn}>{SCORE_EN[s]}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <button
        className={styles.saveBtn}
        onClick={onSaveAll}
        disabled={isSaving || labels.length === 0}
      >
        {isSaving ? (
          <>
            <div className={styles.spinner} />
            กำลังบันทึก...
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            บันทึกคะแนนทั้งหมด
          </>
        )}
      </button>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendTitle}>คำอธิบายคะแนน</span>
        <div className={styles.legendItems}>
          {[0, 1, 2].map(s => (
            <div key={s} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: SCORE_COLORS[s] }} />
              <span><strong>{s}</strong> = {SCORE_LABELS[s]}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
