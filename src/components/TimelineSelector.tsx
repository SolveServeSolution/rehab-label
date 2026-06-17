"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { LabelFormData } from "@/types";
import { VideoPlayerHandle } from "./VideoPlayer";
import styles from "./TimelineSelector.module.css";

interface TimelineSelectorProps {
  labels: LabelFormData[];
  videoUrl?: string;
  videoPlayerRef: React.RefObject<VideoPlayerHandle | null>;
  onAddLabel: (label: LabelFormData) => void;
  onRemoveLabel: (repNum: number) => void;
  onUpdateLabel: (label: LabelFormData) => void;
  hoveredRep: number | null;
  onHoverRep: (repNum: number | null) => void;
  selectedRep: number | null;
  onSelectRep: (repNum: number | null) => void;
}

// Rep colors — each rep gets a distinct color for easy identification
const REP_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#a855f7", // purple
];

function secsToTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function timeToSecs(time: string): number {
  const parts = time.split(":");
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  return 0;
}

export default function TimelineSelector({
  labels,
  videoUrl,
  videoPlayerRef,
  onAddLabel,
  onRemoveLabel,
  onUpdateLabel,
  hoveredRep,
  onHoverRep,
  selectedRep,
  onSelectRep,
}: TimelineSelectorProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<"seek" | "move" | "resize-start" | "resize-end" | null>(null);
  const [dragRepNum, setDragRepNum] = useState<number | null>(null);
  const dragStartX = useRef(0);
  const dragOriginal = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // Detection states - removed for now
  // const [isDetecting, setIsDetecting] = useState(false);
  // const [detectProgress, setDetectProgress] = useState(0);

  // Sync with video element
  useEffect(() => {
    const syncLoop = () => {
      const vp = videoPlayerRef.current;
      if (vp) {
        const el = vp.getVideoElement();
        if (el) {
          setCurrentTime(el.currentTime);
          setDuration(el.duration || 0);
          setIsPlaying(!el.paused);
        }
      }
      animRef.current = requestAnimationFrame(syncLoop);
    };
    animRef.current = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, [videoPlayerRef]);

  // --- Track position helpers ---
  const getTimeFromX = useCallback(
    (clientX: number) => {
      if (!trackRef.current || duration <= 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  // --- Click on track to seek ---
  const handleTrackMouseDown = (e: React.MouseEvent) => {
    // Only react to clicks directly on the track (not on segments)
    if ((e.target as HTMLElement).dataset.segment) return;
    const time = getTimeFromX(e.clientX);
    videoPlayerRef.current?.seekTo(time);
    setIsDragging(true);
    setDragType("seek");
  };

  // --- Segment interactions ---
  const handleSegmentMouseDown = (e: React.MouseEvent, repNum: number, type: "move" | "resize-start" | "resize-end") => {
    e.stopPropagation();
    e.preventDefault();
    const label = labels.find((l) => l.repetitionNum === repNum);
    if (!label) return;
    onSelectRep(repNum);
    videoPlayerRef.current?.seekTo(label.startTime);

    setIsDragging(true);
    setDragType(type);
    setDragRepNum(repNum);
    dragStartX.current = e.clientX;
    dragOriginal.current = { start: label.startTime, end: label.endTime };
  };

  // --- Global drag handlers ---
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragType === "seek") {
        const time = getTimeFromX(e.clientX);
        videoPlayerRef.current?.seekTo(time);
        return;
      }

      if (!trackRef.current || !dragRepNum) return;
      const rect = trackRef.current.getBoundingClientRect();
      const dx = e.clientX - dragStartX.current;
      const dTime = (dx / rect.width) * duration;

      const label = labels.find((l) => l.repetitionNum === dragRepNum);
      if (!label) return;

      if (dragType === "move") {
        const newStart = Math.max(0, Math.min(duration - (dragOriginal.current.end - dragOriginal.current.start), dragOriginal.current.start + dTime));
        const segDuration = dragOriginal.current.end - dragOriginal.current.start;
        onUpdateLabel({ ...label, startTime: newStart, endTime: newStart + segDuration });
      } else if (dragType === "resize-start") {
        const newStart = Math.max(0, Math.min(dragOriginal.current.end - 0.3, dragOriginal.current.start + dTime));
        onUpdateLabel({ ...label, startTime: newStart });
      } else if (dragType === "resize-end") {
        const newEnd = Math.max(dragOriginal.current.start + 0.3, Math.min(duration, dragOriginal.current.end + dTime));
        onUpdateLabel({ ...label, endTime: newEnd });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragType(null);
      setDragRepNum(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragType, dragRepNum, duration, labels, getTimeFromX, videoPlayerRef, onUpdateLabel]);

  // --- Next Rep Calculation (unlimited) ---
  const nextRep = labels.length > 0 ? Math.max(...labels.map(l => l.repetitionNum)) + 1 : 1;


  // --- Time markers for the ruler ---
  const getTimeMarkers = () => {
    if (duration <= 0) return [];
    const markers: { time: number; label: string }[] = [];
    let step = 5;
    if (duration > 120) step = 30;
    else if (duration > 60) step = 15;
    else if (duration > 30) step = 10;

    for (let t = 0; t <= duration; t += step) {
      markers.push({ time: t, label: secsToTime(t) });
    }
    return markers;
  };

  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const sortedLabels = [...labels].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className={styles.container}>
      {/* Timeline ruler + track */}
      <div className={styles.timelineArea}>
        {/* Time ruler */}
        <div className={styles.ruler}>
          {getTimeMarkers().map((m) => (
            <span
              key={m.time}
              className={styles.rulerMark}
              style={{ left: `${(m.time / duration) * 100}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* Main track */}
        <div
          ref={trackRef}
          className={styles.track}
          onMouseDown={handleTrackMouseDown}
          style={{ cursor: isDragging && dragType === "seek" ? "grabbing" : "crosshair" }}
        >
          {/* Segments */}
          {sortedLabels.map((label) => {
            const left = (label.startTime / duration) * 100;
            const width = ((label.endTime - label.startTime) / duration) * 100;
            const color = REP_COLORS[(label.repetitionNum - 1) % REP_COLORS.length];
            const isSelected = selectedRep === label.repetitionNum;
            const isHovered = hoveredRep === label.repetitionNum;

            return (
              <div
                key={label.repetitionNum}
                data-segment="true"
                className={`${styles.segment} ${isSelected ? styles.segmentSelected : ""} ${isHovered ? styles.segmentHovered : ""}`}
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 0.5)}%`,
                  backgroundColor: color,
                  borderColor: isSelected ? "#fff" : color,
                  opacity: isSelected || isHovered ? 1 : 0.75,
                }}
                onMouseDown={(e) => handleSegmentMouseDown(e, label.repetitionNum, "move")}
                onMouseEnter={() => onHoverRep(label.repetitionNum)}
                onMouseLeave={() => onHoverRep(null)}
              >
                {/* Resize handles */}
                <div
                  className={styles.resizeHandle}
                  style={{ left: 0 }}
                  onMouseDown={(e) => handleSegmentMouseDown(e, label.repetitionNum, "resize-start")}
                />
                <span className={styles.segmentLabel}>{label.repetitionNum}</span>
                <div
                  className={styles.resizeHandle}
                  style={{ right: 0 }}
                  onMouseDown={(e) => handleSegmentMouseDown(e, label.repetitionNum, "resize-end")}
                />
              </div>
            );
          })}

          {/* Playhead */}
          <div className={styles.playhead} style={{ left: `${playheadPct}%` }}>
            <div className={styles.playheadHead} />
            <div className={styles.playheadLine} />
          </div>
        </div>

        {/* Current time display */}
        <div className={styles.timeDisplay}>
          <span className={styles.currentTime}>{secsToTime(currentTime)}</span>
          <span className={styles.timeSep}>/</span>
          <span className={styles.totalTime}>{secsToTime(duration)}</span>
        </div>
      </div>

      <div className={styles.controls}>

        {/* Segment list — compact chips */}
        <div className={styles.segmentChips}>
          {sortedLabels.map((label) => {
            const color = REP_COLORS[(label.repetitionNum - 1) % REP_COLORS.length];
            const isSelected = selectedRep === label.repetitionNum;
            return (
              <div
                key={label.repetitionNum}
                className={`${styles.chip} ${isSelected ? styles.chipSelected : ""}`}
                style={{
                  borderColor: color,
                  backgroundColor: isSelected ? color : "transparent",
                }}
                onClick={() => {
                  onSelectRep(label.repetitionNum);
                  videoPlayerRef.current?.seekTo(label.startTime);
                }}
                onMouseEnter={() => onHoverRep(label.repetitionNum)}
                onMouseLeave={() => onHoverRep(null)}
              >
                <span style={{ color: isSelected ? "#fff" : color }}>
                  {label.repetitionNum}
                </span>
                <span className={styles.chipTime}>
                  {secsToTime(label.startTime)}–{secsToTime(label.endTime)}
                </span>
                <button
                  className={styles.chipDelete}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveLabel(label.repetitionNum);
                    if (selectedRep === label.repetitionNum) onSelectRep(null);
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            );
          })}
          {labels.length === 0 && (
            <span className={styles.noSegments}>No segments — add manually</span>
          )}
        </div>

        {nextRep && (
          <ManualAddControl
            nextRep={nextRep}
            onAddLabel={onAddLabel}
            duration={duration}
          />
        )}
      </div>
    </div>
  );
}

// --- Manual Add sub-component ---
function ManualAddControl({
  nextRep,
  onAddLabel,
  duration,
}: {
  nextRep: number;
  onAddLabel: (label: LabelFormData) => void;
  duration: number;
}) {
  const [startInput, setStartInput] = useState("00:00");
  const [endInput, setEndInput] = useState("00:00");

  const handleAdd = () => {
    const start = timeToSecs(startInput);
    const end = timeToSecs(endInput);
    if (end <= start) return;
    onAddLabel({ repetitionNum: nextRep, startTime: start, endTime: end, score: null });
    setStartInput("00:00");
    setEndInput("00:00");
  };

  return (
    <div className={styles.addControl}>
      <span className={styles.addLabel}>Rep {nextRep}:</span>
      <input
        type="text"
        value={startInput}
        onChange={(e) => setStartInput(e.target.value)}
        className={styles.timeInput}
        placeholder="00:00"
      />
      <span className={styles.addSep}>→</span>
      <input
        type="text"
        value={endInput}
        onChange={(e) => setEndInput(e.target.value)}
        className={styles.timeInput}
        placeholder="00:00"
      />
      <button className={styles.addBtn} onClick={handleAdd}>
        +
      </button>
    </div>
  );
}
