import { cuesToTranscript, parseTimestamp, parseVtt } from './vtt.js';

describe('parseTimestamp', () => {
  it('parses minute-second-millis timestamps', () => {
    expect(parseTimestamp('00:01.200')).toBe(1.2);
  });

  it('parses hour timestamps', () => {
    expect(parseTimestamp('01:00:01.500')).toBe(3601.5);
  });

  it('returns 0 for empty input', () => {
    expect(parseTimestamp('')).toBe(0);
  });
});

describe('parseVtt', () => {
  it('returns timed cues from a WEBVTT document', () => {
    const vtt = [
      'WEBVTT',
      '',
      '1',
      '00:00:00.000 --> 00:00:01.200',
      'Hello world',
      '',
      '2',
      '00:00:01.200 --> 00:00:03.000',
      'More <b>text</b>',
    ].join('\n');

    expect(parseVtt(vtt)).toEqual([
      { start: 0, duration: 1.2, text: 'Hello world' },
      { start: 1.2, duration: 1.8, text: 'More text' },
    ]);
  });

  it('returns an empty array for blank input', () => {
    expect(parseVtt('')).toEqual([]);
  });
});

describe('cuesToTranscript', () => {
  it('collapses overlapping ASR rolling captions', () => {
    const cues = [
      { text: 'Hello friends, Randy here. I am showing' },
      { text: 'Hello friends, Randy here. I am showing' },
      { text: 'Hello friends, Randy here. I am showing a video of the parallax effects um for' },
      { text: 'a video of the parallax effects um for' },
      { text: 'a video of the parallax effects um for Adobe Labs. All right, so uh what we' },
      { text: 'Adobe Labs. All right, so uh what we' },
      { text: 'Adobe Labs. All right, so uh what we have here, we have the homepage and the' },
    ];
    expect(cuesToTranscript(cues)).toBe(
      'Hello friends, Randy here. I am showing a video of the parallax effects um for Adobe Labs. All right, so uh what we have here, we have the homepage and the',
    );
  });

  it('joins non-overlapping standard caption cues', () => {
    expect(cuesToTranscript([
      { text: 'Hello friends.' },
      { text: 'Randy here.' },
    ])).toBe('Hello friends. Randy here.');
  });

  it('returns an empty string for missing cues', () => {
    expect(cuesToTranscript([])).toBe('');
    expect(cuesToTranscript(undefined)).toBe('');
  });
});
