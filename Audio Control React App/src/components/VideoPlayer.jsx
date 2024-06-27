import React, { useRef, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeMute, faVolumeUp, faPause, faPlay, faStop, faUpload } from '@fortawesome/free-solid-svg-icons';

const VideoPlayer = ({ videoSrc, onVideoEnd }) => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [isRecordingComplete, setIsRecordingComplete] = useState(false);
  const mediaRecorderRef = useRef(null);
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

  const toggleFullScreen = () => {
    const videoElement = videoRef.current;
    if (!document.fullscreenElement) {
      videoElement.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleStartCaptureClick = useCallback(() => {
    setCapturing(true);
    navigator.mediaDevices
      .getUserMedia({
        video: { width: 320, height: 180, facingMode: "user" },
        audio: true,
      })
      .then((stream) => {
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: "video/webm",
        });
        mediaRecorderRef.current.addEventListener("dataavailable", handleDataAvailable);
        mediaRecorderRef.current.start();
      })
      .catch((err) => {
        console.error("Error accessing webcam:", err);
      });
  }, []);

  const handleDataAvailable = useCallback(({ data }) => {
    if (data.size > 0) {
      setRecordedChunks((prev) => [...prev, data]);
    }
  }, []);

  const handleStopCaptureClick = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setCapturing(false);
      setIsRecordingComplete(true);
    }
  }, []);

  const handleUploadClick = useCallback(async () => {
    handleStopCaptureClick();
    
    if (recordedChunks.length === 0) {
      console.error("No recorded chunks to upload");
      return;
    }

    const blob = new Blob(recordedChunks, { type: "video/webm" });
    console.log("Uploading Blob size:", blob.size);

    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      formData.append("job_id", 1);
      formData.append("user_name", "Numan Pathan");

      const response = await fetch("http://127.0.0.1/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("File uploaded successfully:", data.file_path);
        navigate("/thankyou");
      } else {
        throw new Error("Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }, [recordedChunks, navigate]);

  useEffect(() => {
    handleStartCaptureClick();
    return () => {
      handleStopCaptureClick();
    };
  }, [handleStartCaptureClick, handleStopCaptureClick]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex justify-center items-center w-full">
        <video
          ref={videoRef}
          id="video"
          className="w-full h-auto" // Ensures video takes up full width and adjusts height automatically
          autoPlay
          style={{ maxWidth: '60vw', maxHeight: '100vh' }} // Ensures video doesn't exceed view width or height
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="flex justify-between mt-4 space-x-4">
        <button
          onClick={handleMute}
          className="bg-gray-100 hover:bg-gray-300 text-black font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors flex items-center"
        >
          <FontAwesomeIcon icon={isMuted ? faVolumeUp : faVolumeMute} className="mr-2" />
          {isMuted ? "Unmute" : "Mute"}
        </button>
        <button
          onClick={handlePause}
          className="bg-gray-100 hover:bg-gray-300 text-black font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors flex items-center"
        >
          <FontAwesomeIcon icon={isPaused ? faPlay : faPause} className="mr-2" />
          {isPaused ? "Play" : "Pause"}
        </button>
        {capturing ? (
          <button
            onClick={handleStopCaptureClick}
            className="bg-red-300 hover:bg-red-400 text-black font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors flex items-center"
          >
            <FontAwesomeIcon icon={faStop} className="mr-2" />
            Leave Meeting
          </button>
        ) : (
          isRecordingComplete && (
            <button
              onClick={handleUploadClick}
              className="bg-blue-300 hover:bg-blue-400 text-black font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-colors flex items-center"
            >
              <FontAwesomeIcon icon={faUpload} className="mr-2" />
              Upload Recording
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
