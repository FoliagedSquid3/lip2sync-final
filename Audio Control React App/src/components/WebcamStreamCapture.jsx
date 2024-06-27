import React, { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { useNavigate, useLocation } from "react-router-dom";

const WebcamStreamCapture = ({ onRecordingComplete }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (location.state && location.state.userName) {
      setUserName(location.state.userName);
    } else {
      navigate("/");
    }
  }, [location.state, navigate]);

  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [isRecordingComplete, setIsRecordingComplete] = useState(false);
  const [intervalId, setIntervalId] = useState(null);

  const videoConstraints = {
    aspectRatio: 1.7777777778,
    facingMode: "user",
    width: 320,
    height: 180,
  };

  useEffect(() => {
    handleStartCaptureClick();
    return () => {
      handleStopCaptureClick();
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const handleStartCaptureClick = useCallback(() => {
    setCapturing(true);
    navigator.mediaDevices
      .getUserMedia({
        video: videoConstraints,
        audio: true,
      })
      .then((stream) => {
        webcamRef.current.srcObject = stream;
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: "video/webm",
        });
        mediaRecorderRef.current.addEventListener("dataavailable", handleDataAvailable);
        mediaRecorderRef.current.start();

        const id = setInterval(() => {
          const blob = new Blob(recordedChunks, { type: "video/webm" });
          console.log("Current Blob size:", blob.size);
        }, 1000);
        setIntervalId(id);
      })
      .catch((err) => {
        console.error("Error accessing webcam:", err);
      });
  }, [recordedChunks]);

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
      formData.append("job_id", 2);
      formData.append("user_name", userName);

      const response = await fetch("http://127.0.0.1/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("File uploaded successfully:", data.file_path);
        if (onRecordingComplete) {
          onRecordingComplete(blob);
        }
        navigate("/thankyou");
      } else {
        throw new Error("Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }, [recordedChunks, userName, onRecordingComplete, navigate]);

  useEffect(() => {
    if (isRecordingComplete && recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      console.log("Final Blob size:", blob.size);
    }
  }, [isRecordingComplete, recordedChunks]);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Webcam
        audio={false}
        mirrored={true}
        height={videoConstraints.height}
        width={videoConstraints.width}
        ref={webcamRef}
        className="rounded"
      />
    </div>
  );
};

export default WebcamStreamCapture;
