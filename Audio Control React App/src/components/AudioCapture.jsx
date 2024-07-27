import React, { useEffect, useState } from "react";

const AudioCapture = ({ onVoiceDetected, setVolume, threshold }) => {
  const [analyser, setAnalyser] = useState(null);
  const [dataArray, setDataArray] = useState(null);

  useEffect(() => {
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const audioCtx = new (window.AudioContext ||
          window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 2048;
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);

        setAnalyser(analyser);
        setDataArray(dataArray);
      } catch (err) {
        console.error("Error accessing microphone", err);
      }
    };

    initAudio();
  }, []);

  useEffect(() => {
    let intervalId;

    if (analyser && dataArray) {
      const detectVoice = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sum = 0.0;
        for (let i = 0; i < dataArray.length; i++) {
          const value = dataArray[i] / 128.0 - 1.0;
          sum += value * value;
        }
        const calculatedVolume = Math.sqrt(sum / dataArray.length);
        setVolume(calculatedVolume);
        onVoiceDetected(calculatedVolume > threshold);
      };

      intervalId = setInterval(detectVoice, 250);
    }

    // Cleanup function to clear interval
    return () => clearInterval(intervalId);
  }, [analyser, dataArray, onVoiceDetected, threshold]);

  return <div className="hidden">Audio Capture Active</div>;
};

export default AudioCapture;
