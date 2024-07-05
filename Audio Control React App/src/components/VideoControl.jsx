import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import VideoPlayer from "./VideoPlayer";
import AudioCapture from "./AudioCapture";

function joinPaths(...paths) {
  return paths.map((path, index) => {
    if (index === 0) {
      return path.trim().replace(/[/\\]*$/, '');
    } else {
      return path.trim().replace(/^[/\\]*|[/\\]*$/g, '');
    }
  }).join('/');
}
const VIDEO_OUTPUT = process.env.VIDEO_OUTPUT
const VideoControl = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [videoSrc, setVideoSrc] = useState(null);
  const VIDEO_OUTPUT = "/video"

  useEffect(() => {
    const jobIdParam = searchParams.get("job_id");
    let userIdParam = searchParams.get("user_id");

    if (jobIdParam && userIdParam) {
      const fullPath = `${VIDEO_OUTPUT}/${jobIdParam}/${userIdParam}.mp4`
      // http://localhost:8000/video?job_id=1&user_id=1
      setVideoSrc(fullPath)
      console.log(fullPath)
    } else {
      navigate("/error");
    }


  }, [navigate, searchParams]);

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
          Hello!
        </h2>
        <VideoPlayer
          videoSrc={videoSrc}
          onVideoEnd={handleVideoEnd}
          disable={disableVideo}
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
