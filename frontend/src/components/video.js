import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  width: 80%;
  max-width: 640px;
  margin: 2rem auto;
`;

const Video = ({ url }) => {
  const videoRef = useRef(null);
  const [recognition, setRecognition] = useState(null);
  const [speechTimeout, setSpeechTimeout] = useState(null);

  useEffect(() => {
    // Setup Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      let recognizer = new SpeechRecognition();
      recognizer.continuous = true; // Listen continuously
      recognizer.interimResults = false; // Only report final results

      recognizer.onstart = () => {
        console.log('Speech recognition service started.');
      };

      recognizer.onspeechstart = () => {
        console.log('Speech detected.');
        clearTimeout(speechTimeout); // Clear any existing timeout
        setSpeechTimeout(setTimeout(() => {
          console.log('Pausing video due to speech.');
          if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
          }
        }, 100)); // Wait for 300 ms of continuous speech before pausing
      };

      recognizer.onspeechend = () => {
        console.log('Speech ended.');
        clearTimeout(speechTimeout); // Clear speech start timeout
        setSpeechTimeout(setTimeout(() => {
          console.log('Resuming video after speech ended.');
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play();
          }
        }, 100)); // Reduce timeout to 100 ms after speech has ended to resume
      };

      recognizer.onerror = (event) => {
        console.error('Speech Recognition Error:', event.error);
      };

      setRecognition(recognizer);
      recognizer.start();
    } else {
      console.warn('Speech Recognition API is not supported in this browser.');
    }

    return () => {
      // Clean up: stop recognition and release media
      if (recognition) {
        recognition.stop();
        console.log('Speech recognition service stopped.');
      }
      clearTimeout(speechTimeout); // Make sure to clear the timeout on cleanup
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
