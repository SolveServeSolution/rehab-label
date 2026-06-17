import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

// -------------------------------------------------------
// TF.js initialization
// -------------------------------------------------------
let tfReady = false;
export const initTF = async () => {
  if (tfReady) return;
  await tf.ready();
  try { await tf.setBackend('webgl'); }
  catch { await tf.setBackend('cpu'); }
  tfReady = true;
};

// -------------------------------------------------------
// Public types
// -------------------------------------------------------
export interface TimeInterval {
  startTime: number;
  endTime: number;
  confidence: number;
}

// -------------------------------------------------------
// Constants
// -------------------------------------------------------
const PLAYBACK_RATE   = 4.0;   // Play at 4× speed to save time while capturing
const CAPTURE_FPS     = 5;     // Target capture FPS (at realtime, gives 5 samples/sec)
const MIN_CONFIDENCE  = 0.15;  // Lowered: keypoint confidence threshold
const MIN_REP_DUR     = 0.6;   // Minimum rep duration in seconds
const MAX_REP_DUR     = 20.0;  // Maximum rep duration in seconds
const SMOOTH_WINDOW   = 4;     // Gaussian smooth half-window
const GAP_MERGE       = 1.5;   // Merge gaps shorter than this (seconds)

// Body keypoints only (skip face 0-4)
const BODY_KPS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

// Joint angle definitions [A, vertex B, C]
const JOINTS: [number, number, number][] = [
  [5, 7, 9],    // L_Elbow
  [6, 8, 10],   // R_Elbow
  [7, 5, 11],   // L_Shoulder
  [8, 6, 12],   // R_Shoulder
  [11, 13, 15], // L_Knee
  [12, 14, 16], // R_Knee
  [5, 11, 13],  // L_Hip
  [6, 12, 14],  // R_Hip
];

// -------------------------------------------------------
// Math helpers
// -------------------------------------------------------
function calcAngle(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number
): number {
  const bax = ax - bx, bay = ay - by;
  const bcx = cx - bx, bcy = cy - by;
  const dot = bax * bcx + bay * bcy;
  const mag = Math.sqrt((bax ** 2 + bay ** 2) * (bcx ** 2 + bcy ** 2));
  if (mag < 1e-6) return NaN;
  return Math.acos(Math.max(-1, Math.min(1, dot / mag))) * (180 / Math.PI);
}

function gaussianSmooth(signal: number[], half: number): number[] {
  if (signal.length === 0) return [];
  const sigma = Math.max(half / 2, 0.5);
  const kernel: number[] = [];
  let ksum = 0;
  for (let i = -half; i <= half; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(v);
    ksum += v;
  }
  const k = kernel.map(v => v / ksum);
  return signal.map((_, i) => {
    let s = 0, w = 0;
    for (let j = -half; j <= half; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < signal.length) {
        s += signal[idx] * k[j + half];
        w += k[j + half];
      }
    }
    return w > 0 ? s / w : 0;
  });
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(p * sorted.length)));
  return sorted[idx];
}

// -------------------------------------------------------
// Frame capture via realtime playback (no seeking)
// -------------------------------------------------------
interface Frame {
  time: number;
  angles: (number | null)[];
  rawPositions: { x: number; y: number }[];  // Raw keypoint positions for fallback
  poseConf: number;
  hasData: boolean;
}

/**
 * Capture frames by playing video at high speed and running pose detection
 * on each animation frame. This guarantees real decoded frames — no black frames.
 */
async function captureFramesRealtime(
  video: HTMLVideoElement,
  detector: poseDetection.PoseDetector,
  onProgress?: (p: number) => void
): Promise<Frame[]> {
  const duration = video.duration;
  const frames: Frame[] = [];
  let lastCaptureTime = -1;
  const captureInterval = 1 / CAPTURE_FPS; // seconds between captures

  return new Promise((resolve, reject) => {
    let rafId: number;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      cancelAnimationFrame(rafId);
      console.warn('Frame capture timed out — resolving with partial data');
      resolve(frames);
    }, 120_000); // 2 min max

    const captureFrame = async () => {
      if (timedOut) return;

      const t = video.currentTime;

      // Capture at the configured FPS rate (accounting for playback speed)
      if (t - lastCaptureTime >= captureInterval) {
        lastCaptureTime = t;

        if (onProgress && duration > 0) {
          onProgress(Math.min(55, 5 + Math.round((t / duration) * 50)));
        }

        try {
          const poses = await detector.estimatePoses(video);

          if (poses.length > 0) {
            const kps = poses[0].keypoints;

            // Average body keypoint confidence
            let confSum = 0, confCount = 0;
            for (const i of BODY_KPS) {
              if (kps[i]?.score != null) {
                confSum += kps[i].score!;
                confCount++;
              }
            }
            const poseConf = confCount > 0 ? confSum / confCount : 0;

            // Compute joint angles
            const angles = JOINTS.map(([a, b, c]) => {
              const kA = kps[a], kB = kps[b], kC = kps[c];
              if (
                (kA?.score ?? 0) < MIN_CONFIDENCE ||
                (kB?.score ?? 0) < MIN_CONFIDENCE ||
                (kC?.score ?? 0) < MIN_CONFIDENCE
              ) return null;
              const angle = calcAngle(kA.x, kA.y, kB.x, kB.y, kC.x, kC.y);
              return isNaN(angle) ? null : angle;
            });

            // Raw positions for all body keypoints (fallback motion signal)
            const rawPositions = BODY_KPS.map(i => ({
              x: (kps[i]?.score ?? 0) >= MIN_CONFIDENCE ? kps[i].x : -1,
              y: (kps[i]?.score ?? 0) >= MIN_CONFIDENCE ? kps[i].y : -1,
            }));

            frames.push({ time: t, angles, rawPositions, poseConf, hasData: poseConf > 0.05 });
          } else {
            frames.push({
              time: t,
              angles: JOINTS.map(() => null),
              rawPositions: BODY_KPS.map(() => ({ x: -1, y: -1 })),
              poseConf: 0,
              hasData: false,
            });
          }
        } catch (err) {
          console.warn('Pose estimation error at', t.toFixed(2), err);
        }
      }

      // Continue or finish
      if (video.ended || t >= duration - 0.1) {
        clearTimeout(timeout);
        video.pause();
        resolve(frames);
        return;
      }

      rafId = requestAnimationFrame(captureFrame);
    };

    // Start playback
    video.currentTime = 0;
    video.playbackRate = PLAYBACK_RATE;

    video.addEventListener('ended', () => {
      clearTimeout(timeout);
      resolve(frames);
    }, { once: true });

    video.play().then(() => {
      rafId = requestAnimationFrame(captureFrame);
    }).catch(err => {
      clearTimeout(timeout);
      reject(new Error(`Cannot play video: ${err}`));
    });
  });
}

// -------------------------------------------------------
// Build motion signal from captured frames
// -------------------------------------------------------
function buildMotionSignal(frames: Frame[]): { signal: number[]; hasAngleData: boolean } {
  const n = frames.length;
  if (n === 0) return { signal: [], hasAngleData: false };

  // --- Try angle-based signal first ---
  // Compute per-joint total activity
  const jointActivity = JOINTS.map((_, j) => {
    let total = 0;
    for (let i = 1; i < n; i++) {
      const prev = frames[i - 1].angles[j];
      const curr = frames[i].angles[j];
      if (prev !== null && curr !== null) total += Math.abs(curr - prev);
    }
    return total;
  });

  const topJoints = JOINTS.map((_, j) => j)
    .sort((a, b) => jointActivity[b] - jointActivity[a])
    .slice(0, 4);

  const maxActivity = Math.max(...topJoints.map(j => jointActivity[j]));

  console.log(`Joint activities: ${jointActivity.map((a, i) => `J${i}=${a.toFixed(1)}`).join(' ')}`);
  console.log(`Top joints: ${topJoints.join(', ')}, max activity: ${maxActivity.toFixed(1)}`);

  const hasAngleData = maxActivity > 1.0; // At least 1° of total movement

  if (hasAngleData) {
    // Build signal from top joints angle velocity
    const angleSignal: number[] = [0];
    for (let i = 1; i < n; i++) {
      let sum = 0, count = 0;
      for (const j of topJoints) {
        const prev = frames[i - 1].angles[j];
        const curr = frames[i].angles[j];
        if (prev !== null && curr !== null) {
          sum += Math.abs(curr - prev);
          count++;
        }
      }
      angleSignal.push(count > 0 ? sum / count : 0);
    }
    const maxVal = Math.max(...angleSignal) || 1;
    return { signal: angleSignal.map(v => v / maxVal), hasAngleData: true };
  }

  // --- Fallback: raw keypoint position displacement ---
  console.log('Angle data insufficient, using raw keypoint displacement as signal');
  const vWidth  = frames[0].rawPositions.length > 0 ? 640 : 640; // assume normalized
  const vHeight = 480;

  const posSignal: number[] = [0];
  for (let i = 1; i < n; i++) {
    let sum = 0, count = 0;
    for (let k = 0; k < BODY_KPS.length; k++) {
      const prev = frames[i - 1].rawPositions[k];
      const curr = frames[i].rawPositions[k];
      if (prev.x >= 0 && curr.x >= 0) {
        const dx = (curr.x - prev.x) / vWidth;
        const dy = (curr.y - prev.y) / vHeight;
        sum += Math.sqrt(dx * dx + dy * dy);
        count++;
      }
    }
    posSignal.push(count > 0 ? sum / count : 0);
  }
  const maxPos = Math.max(...posSignal) || 1;
  return { signal: posSignal.map(v => v / maxPos), hasAngleData: false };
}

// -------------------------------------------------------
// Detect repetitions from motion signal
// -------------------------------------------------------
function detectReps(signal: number[], frames: Frame[]): TimeInterval[] {
  if (signal.length < 3) return [];

  // Smooth the signal
  const smoothed = gaussianSmooth(signal, SMOOTH_WINDOW);

  console.log(`Signal stats: min=${Math.min(...smoothed).toFixed(3)}, max=${Math.max(...smoothed).toFixed(3)}, mean=${(smoothed.reduce((a,b)=>a+b,0)/smoothed.length).toFixed(3)}`);
  console.log(`First 20 values: ${smoothed.slice(0, 20).map(v => v.toFixed(2)).join(' ')}`);

  const nonZero = smoothed.filter(v => v > 0.01);
  if (nonZero.length < 3) {
    console.warn('Signal is essentially flat — no motion detected');
    return [];
  }

  // Adaptive thresholds
  const p35 = percentile(nonZero, 0.35);
  const p70 = percentile(nonZero, 0.70);

  const highThresh = p70 * 0.80;
  const lowThresh  = p35 * 0.50;

  console.log(`Thresholds: high=${highThresh.toFixed(3)}, low=${lowThresh.toFixed(3)}`);

  // Hysteresis state machine
  const intervals: TimeInterval[] = [];
  let active = false;
  let startFrame = 0;

  for (let i = 0; i < smoothed.length; i++) {
    if (!active && smoothed[i] >= highThresh) {
      active = true;
      startFrame = Math.max(0, i - 1);
    } else if (active && smoothed[i] < lowThresh) {
      active = false;
      const endFrame = Math.min(smoothed.length - 1, i + 1);
      const dur = frames[endFrame].time - frames[startFrame].time;
      if (dur >= MIN_REP_DUR && dur <= MAX_REP_DUR) {
        const slice = smoothed.slice(startFrame, endFrame + 1);
        const peakVal = Math.max(...slice);
        const avgConf = frames.slice(startFrame, endFrame + 1)
          .reduce((s, f) => s + f.poseConf, 0) / Math.max(endFrame - startFrame + 1, 1);

        intervals.push({
          startTime: frames[startFrame].time,
          endTime: frames[endFrame].time,
          confidence: Math.min(1, (peakVal + avgConf) / 2),
        });
      }
    }
  }

  // Close any open interval
  if (active) {
    const endFrame = smoothed.length - 1;
    const dur = frames[endFrame].time - frames[startFrame].time;
    if (dur >= MIN_REP_DUR && dur <= MAX_REP_DUR) {
      const slice = smoothed.slice(startFrame);
      const peakVal = Math.max(...slice);
      intervals.push({
        startTime: frames[startFrame].time,
        endTime: frames[endFrame].time,
        confidence: Math.min(1, peakVal),
      });
    }
  }

  // Merge close intervals
  const merged: TimeInterval[] = [];
  for (const iv of intervals) {
    if (merged.length === 0) { merged.push({ ...iv }); continue; }
    const last = merged[merged.length - 1];
    if (iv.startTime - last.endTime <= GAP_MERGE) {
      last.endTime = iv.endTime;
      last.confidence = Math.max(last.confidence, iv.confidence);
    } else {
      merged.push({ ...iv });
    }
  }

  console.log(`Detected ${merged.length} reps (merged from ${intervals.length})`);
  merged.forEach((r, i) =>
    console.log(`  Rep ${i + 1}: ${r.startTime.toFixed(2)}s – ${r.endTime.toFixed(2)}s  conf=${r.confidence.toFixed(2)}`)
  );

  return merged;
}

// -------------------------------------------------------
// Main exported function
// -------------------------------------------------------
export async function detectExercisesInVideo(
  videoElement: HTMLVideoElement,
  onProgress?: (progress: number) => void
): Promise<TimeInterval[]> {
  await initTF();

  const duration = videoElement.duration;
  if (!duration || duration < 0.5) {
    console.warn('Video too short or duration unknown:', duration);
    return [];
  }

  console.log(`Starting detection: duration=${duration.toFixed(1)}s`);
  onProgress?.(5);

  // Create detector
  const detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
  );

  onProgress?.(8);

  let frames: Frame[] = [];
  try {
    frames = await captureFramesRealtime(videoElement, detector, onProgress);
  } finally {
    detector.dispose();
  }

  onProgress?.(60);

  const dataFrames = frames.filter(f => f.hasData);
  console.log(`Captured ${frames.length} frames, ${dataFrames.length} with pose data (${Math.round(dataFrames.length / frames.length * 100)}%)`);

  if (dataFrames.length < 3) {
    console.warn('Too few frames with pose data');
    onProgress?.(100);
    return [];
  }

  // Build motion signal
  const { signal, hasAngleData } = buildMotionSignal(frames);
  console.log(`Motion signal built (angle-based: ${hasAngleData}), ${signal.length} data points`);
  onProgress?.(75);

  // Detect repetitions
  const intervals = detectReps(signal, frames);
  onProgress?.(100);

  return intervals;
}
