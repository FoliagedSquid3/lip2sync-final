// VideoControl.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import VideoPlayer from "./VideoPlayer";
import AudioCapture from "./AudioCapture";
import WebcamStreamCapture from "./WebcamStreamCapture";

const VideoControl = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (location.state && location.state.userName) {
      setUserName(location.state.userName);
    } else {
      // Redirect to Home if userName state is not passed
      navigate("/");
    }
  }, [location.state, navigate]);

  const [isPaused, setIsPaused] = useState(false);
  const [volume, setVolume] = useState(0.0);
  const [recordingStopped, setRecordingStopped] = useState(false);
  const [disableVideo, setDisableVideo] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [threshold] = useState(0.01); // Threshold value remains constant

  const handleVoiceDetected = (isVoiceDetected) => {
    const videoElement = document.getElementById("video");
    if (!disableVideo) {
      console.log(`Voice detected: ${isVoiceDetected}, Video paused: ${isPaused}`);
      if (isVoiceDetected && !isPaused) {
        console.log("Pausing video due to voice detection");
        videoElement.pause();
        setIsPaused(true);
      } else if (!isVoiceDetected && isPaused) {
        console.log("Resuming video playback");
        setTimeout(() => {
          videoElement.play();
          setIsPaused(false);
        }, 1500);
      }
    }
  };

  const handleRecordingComplete = (blob) => {
    console.log("Recording complete. Blob URL:", URL.createObjectURL(blob));
    // Handle the recorded video blob here, for example, upload or preview
  };

  const handleVideoEnd = () => {
    console.log("Video playback ended. Preparing to show upload button.");
    setRecordingStopped(true);
    setDisableVideo(true);
    setButtonEnabled(true);
  };

  const handleUploadButtonClick = () => {
    console.log("Upload button clicked. Navigating to thank you page.");
    navigate("/thankyou");
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="flex flex-col justify-center items-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Hello, {userName}!
        </h2>
        <VideoPlayer
          videoSrc={"video.mp4"}
          onVideoEnd={handleVideoEnd}
          disable={disableVideo}
        />
      </div>
      <div className="absolute bottom-16 right-4">
        <WebcamStreamCapture
          recordingStopped={recordingStopped}
          onRecordingComplete={handleRecordingComplete}
        />
      </div>
      <AudioCapture
        onVoiceDetected={handleVoiceDetected}
        setVolume={setVolume}
        threshold={threshold}
      />
    </div>
  );
};

export default VideoControl;
