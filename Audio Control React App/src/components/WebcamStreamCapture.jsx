import React, { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { useNavigate } from "react-router-dom";

const WebcamStreamCapture = ({ onRecordingComplete, setStopFunction }) => {
  const navigate = useNavigate();

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
    navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: true,
    }).then(stream => {
      webcamRef.current.srcObject = stream;
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });
      mediaRecorderRef.current.addEventListener("dataavailable", handleDataAvailable);
      mediaRecorderRef.current.start();

      const id = setInterval(() => {
        if (recordedChunks.length > 0) {
          const blob = new Blob(recordedChunks, { type: "video/webm" });
          console.log("Current Blob size:", blob.size);
        }
      }, 1000);
      setIntervalId(id);
    }).catch(err => {
      console.error("Error accessing webcam:", err);
    });
  }, [recordedChunks]);

  const handleDataAvailable = useCallback(({ data }) => {
    if (data.size > 0) {
      setRecordedChunks(prev => [...prev, data]);
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

  // Use useEffect to call setStopFunction with handleStopCaptureClick
  useEffect(() => {
    setStopFunction(handleStopCaptureClick);
  }, [handleStopCaptureClick, setStopFunction]);

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
