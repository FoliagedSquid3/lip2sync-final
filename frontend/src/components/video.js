import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  width: 80%;
  max-width: 640px;
  margin: 2rem auto;
`;

const Video = ({ url }) => {
  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const requestRef = useRef(null);
  const lastActionRef = useRef(null); // Ref to store last action timestamp

  useEffect(() => {
    const setupAudioProcessing = async () => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      mediaStreamRef.current = stream;

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const average = sum / bufferLength;
        
        //console.log('Current audio level:', average); // Log the current audio level

        const now = Date.now();
        const actionDelay = 1000; // 1000 ms delay between actions to prevent rapid toggling

        if (average > 50) { // Sensitivity threshold
          if (videoRef.current && !videoRef.current.paused && (!lastActionRef.current || now - lastActionRef.current > actionDelay)) {
            console.log('Pausing video due to detected audio level.');
            videoRef.current.pause();
            lastActionRef.current = now;
          }
        } else {
          if (videoRef.current && videoRef.current.paused && (!lastActionRef.current || now - lastActionRef.current > actionDelay)) {
            console.log('Resuming video as audio level is low.');
            videoRef.current.play().catch(e => console.log('Error playing video:', e));
            lastActionRef.current = now;
          }
        }

        requestRef.current = requestAnimationFrame(checkAudio);
      };

      checkAudio();
    };

    setupAudioProcessing();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <VideoContainer>
      <video ref={videoRef} width="100%" controls autoPlay>
        <source src={url} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </VideoContainer>
  );
};

export default Video;
