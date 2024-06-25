// VideoPlayer.jsx
import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const VideoPlayer = ({ videoSrc, onVideoEnd }) => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const videoElement = videoRef.current;

    const handleEnded = () => {
      console.log("Video playback ended");
      if (onVideoEnd) {
        onVideoEnd();
      }
      videoElement.pause();
      videoElement.currentTime = 0;
    };

    videoElement.addEventListener("ended", handleEnded);

    return () => {
      videoElement.removeEventListener("ended", handleEnded);
    };
  }, [onVideoEnd]);

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const handleLeave = () => {
    alert("Meeting Ended");
    navigate("/");
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex justify-center items-center">
        <video
          ref={videoRef}
          id="video"
          className="w-full max-w-lg rounded-xl"
          autoPlay
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="flex justify-between mt-4 space-x-4">
        <button
          onClick={handleMute}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {isMuted ? "Unmute" : "Mute"}
        </button>
        <button
          onClick={handlePause}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          {isPaused ? "Play" : "Pause"}
        </button>
        <button
          onClick={handleLeave}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
          Leave Meeting
        </button>
      </div>
    </div>
  );
};

export default VideoPlayer;
