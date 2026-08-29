import React, { useState, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

export default function VoiceNoteBubble({ duration = '0:08', waveforms = [4, 8, 14, 20, 16, 10, 18, 24, 18, 12, 16, 22, 26, 18, 14, 20, 12, 8, 16, 22, 18, 10, 6, 12, 18, 14, 8, 4], isOwn = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 3.5;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!isPlaying && progress >= 100) {
      setProgress(0);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="voice-note-bubble-content">
      <button
        type="button"
        className={`voice-play-btn ${isOwn ? 'voice-play-own' : ''}`}
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
      </button>

      <div className="voice-waveform-wrap">
        <div className="voice-waveform-bars">
          {waveforms.map((height, idx) => {
            const barProgress = (idx / waveforms.length) * 100;
            const isPlayed = barProgress <= progress;
            return (
              <div
                key={idx}
                className={`voice-bar ${isPlayed ? 'played' : ''}`}
                style={{ height: `${height}px` }}
                onClick={() => setProgress(barProgress)}
              />
            );
          })}
        </div>
        <div className="voice-meta-row">
          <span className="voice-duration">
            <Mic size={10} style={{ display: 'inline', marginRight: 3 }} />
            {isPlaying ? `0:0${Math.floor((progress / 100) * 8)}` : duration}
          </span>
        </div>
      </div>
    </div>
  );
}
