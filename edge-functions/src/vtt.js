/**
 * Parses WebVTT caption files into timed cues.
 */

const TIMESTAMP_RE = /(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})/;

/**
 * Converts a VTT timestamp to seconds.
 *
 * @param {string} value Timestamp such as `00:01.200` or `01:00:01.200`
 * @returns {number}
 */
export function parseTimestamp(value) {
  const match = String(value || '').trim().match(TIMESTAMP_RE);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millis = Number(match[4]);
  return (hours * 3600) + (minutes * 60) + seconds + (millis / 1000);
}

/**
 * Whether a VTT line is metadata rather than cue text.
 *
 * @param {string} line One line from a cue block
 * @returns {boolean}
 */
function isCueMetaLine(line) {
  const trimmed = line.trim();
  return trimmed === ''
    || trimmed === 'WEBVTT'
    || /^\d+$/.test(trimmed)
    || trimmed.startsWith('NOTE')
    || trimmed.startsWith('STYLE')
    || trimmed.startsWith('KIND:');
}

/**
 * Parses a WebVTT document into cue objects.
 *
 * @param {string} text Raw VTT
 * @returns {{ start: number, duration: number, text: string }[]}
 */
export function parseVtt(text) {
  if (!text || typeof text !== 'string') return [];
  return text.replace(/^\uFEFF/, '').split(/\n\n+/).reduce((cues, block) => {
    const lines = block.split(/\r?\n/).filter((line) => !isCueMetaLine(line));
    const timeLine = lines.find((line) => line.includes('-->'));
    if (!timeLine) return cues;
    const [startRaw, endPart] = timeLine.split('-->');
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp((endPart || '').trim().split(/\s/)[0]);
    const cueText = lines
      .filter((line) => line !== timeLine)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cueText) return cues;
    cues.push({
      start,
      duration: Math.max(0, end - start),
      text: cueText,
    });
    return cues;
  }, []);
}

/**
 * Collapses YouTube ASR rolling captions into a readable transcript.
 * Auto-generated cues repeat and grow; this keeps new words only.
 *
 * @param {{ text?: string }[]} cues Timed caption cues
 * @returns {string}
 */
export function cuesToTranscript(cues) {
  if (!Array.isArray(cues) || !cues.length) return '';
  const parts = [];
  let current = '';

  cues.forEach(({ text }) => {
    const next = String(text || '').replace(/\s+/g, ' ').trim();
    if (!next || next === current) return;
    if (!current) {
      current = next;
      return;
    }
    if (next.startsWith(current)) {
      current = next;
      return;
    }
    if (current.startsWith(next)) return;

    const merged = mergeOverlappingText(current, next);
    if (merged) {
      current = merged;
      return;
    }
    parts.push(current);
    current = next;
  });

  if (current) parts.push(current);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Joins prev and next when they share a trailing/leading word overlap.
 *
 * @param {string} prev Current assembled line
 * @param {string} next Incoming cue text
 * @returns {string} Merged text, or empty if they do not overlap
 */
function mergeOverlappingText(prev, next) {
  const prevWords = prev.split(' ');
  const nextWords = next.split(' ');
  let overlap = Math.min(prevWords.length, nextWords.length);
  while (overlap > 0) {
    if (prevWords.slice(-overlap).join(' ') === nextWords.slice(0, overlap).join(' ')) break;
    overlap -= 1;
  }
  if (overlap === 0) return '';
  return [...prevWords, ...nextWords.slice(overlap)].join(' ');
}
