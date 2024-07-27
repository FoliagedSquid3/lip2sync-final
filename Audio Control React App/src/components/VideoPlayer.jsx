import React, { useRef, useEffect, useState, useCallback } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeMute, faVolumeUp, faUpload } from '@fortawesome/free-solid-svg-icons';

const VideoPlayer = ({ videoSrc, onVideoEnd, jobId, userId, userName }) => {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const mediaRecorderRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [blob, setBlob] = useState(null);
  const [readyToUpload, setReadyToUpload] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleEnded = () => {
      console.log("Video playback ended");
      onVideoEnd && onVideoEnd();
      videoElement.pause();
    };

    videoElement.addEventListener("ended", handleEnded);
    return () => videoElement.removeEventListener("ended", handleEnded);
  }, [onVideoEnd]);

  const handleMute = () => {
    const { current } = videoRef;
    if (current) {
      current.muted = !current.muted;
      setIsMuted(current.muted);
    }
  };

  const handleStartCaptureClick = useCallback(() => {
    setCapturing(true);
    navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 180, facingMode: "user" },
      audio: true,
    }).then(stream => {
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current.addEventListener("dataavailable", handleDataAvailable);
      mediaRecorderRef.current.start();
    }).catch(err => console.error("Error accessing webcam:", err));
  }, []);

  const handleDataAvailable = useCallback(({ data }) => {
    if (data.size > 0) {
      setRecordedChunks(prev => [...prev, data]);
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current.addEventListener('stop', () => {
        setBlob(new Blob(recordedChunks, { type: "video/webm" }));
        setReadyToUpload(true);
      });
      setCapturing(false);
    }
  }, [recordedChunks]);

  const handleUploadClick = useCallback(async () => {
    setIsUploading(true);

    if (!blob) {
      console.error("No recorded blob to upload");
      return;
    }

    console.log("Uploading Blob size:", blob.size);

    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      formData.append("job_id", jobId);
      formData.append("user_id", userId);
      formData.append("user_name", userName);

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("File uploaded successfully:", data.file_path);
        window.location.href = `https://app.timetomeet.ai/meeting-finished/${jobId}/${userId}`;
      } else {
        throw new Error("Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }, [blob, jobId, userId, userName]);

  useEffect(() => {
    handleStartCaptureClick();
    return () => mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
  }, [handleStartCaptureClick]);

  return (
    <div className="flex flex-col items-center justify-center">
      {isUploading ? (
        <div className="loader-overlay">
          <div className="loader text-4xl">Please wait while your recording is processed.</div>
        </div>
      ) : (
        <>
          <div className="flex justify-center items-center w-full">
            {videoSrc && <video
              ref={videoRef}
              id="video"
              className="w-full h-auto"
              autoPlay
              style={{ maxWidth: '60vw', maxHeight: '100vh' }}
            >
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>}
          </div>
          <div className="flex justify-between mt-4 space-x-4">
            <button onClick={handleMute} className="bg-gray-100 hover:bg-gray-300 text-black font-bold py-2 px-4 rounded">
              <FontAwesomeIcon icon={isMuted ? faVolumeUp : faVolumeMute} className="mr-2" />
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button disabled={!readyToUpload} onClick={handleUploadClick} className="bg-red-300 hover:bg-red-400 text-black font-bold py-2 px-4 rounded">
              <FontAwesomeIcon icon={faUpload} className="mr-2" />
              Leave Meeting
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default VideoPlayer;
