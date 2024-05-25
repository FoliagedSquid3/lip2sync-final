import React, { useState, useEffect, useRef } from 'react';
import RecordRTC from 'recordrtc';

const Recorder = ({ onRecordingStart, onRecordingStop, userName, jobId }) => {
    const [recording, setRecording] = useState(false);
    const [showNotification, setShowNotification] = useState(false);
    const mediaRecorderRef = useRef(null);
    const videoRef = useRef(null);

    useEffect(() => {
        async function getMedia() {
            try {
                const constraints = { video: true, audio: true };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                onRecordingStart(stream);

                // Initialize RecordRTC
                const recorder = new RecordRTC(stream, {
                    type: 'video',
                    mimeType: 'video/webm; codecs=vp9', // ensuring the mimeType matches support
                    bitsPerSecond: 128000 // Adjust bitrate as needed
                });
                recorder.startRecording();
                mediaRecorderRef.current = recorder;
                setRecording(true);
            } catch (error) {
                console.error('Error accessing media devices:', error);
            }
        }

        getMedia();

        return () => {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stopRecording(() => {
                    videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                });
            }
        };
    }, []);

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            // Stop the media tracks to close the camera immediately
            if (videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }

            // Immediately show the notification and change the recording state
            onRecordingStop();
            setRecording(false);
            setShowNotification(true); // Show notification that meeting has ended

            // Stop recording and process the upload in the background
            mediaRecorderRef.current.stopRecording(() => {
                const blob = mediaRecorderRef.current.getBlob();
                uploadVideo(blob);
            });
        }
    };

    const uploadVideo = async (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');
        formData.append('user_name', userName);
        formData.append('job_id', jobId);

        try {
            const response = await fetch('http://localhost:8000/upload/', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            console.log('File uploaded and converted:', data);
        } catch (error) {
            console.error('Upload failed:', error);
        }
    };

    return (
        <div>
            {showNotification ? (
                <div style={{ position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                    <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '10px', textAlign: 'center' }}>
                        <h2>Meeting Ended</h2>
                        <button onClick={() => setShowNotification(false)} style={{ marginTop: '10px', padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>Close</button>
                    </div>
                </div>
            ) : (
                <>
                    {recording && (
                        <div style={{ position: 'fixed', top: '10px', left: '10px' }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="red" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="12" />
                            </svg>
                        </div>
                    )}
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        style={{ position: 'fixed', bottom: '10px', right: '10px', width: '300px', height: '225px', border: '1px solid black' }}
                    />
                    {recording && (
                        <button onClick={stopRecording} style={{
                            position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
                            padding: '15px 30px', // Increased padding
                            fontSize: '18px', // Increased font size
                            color: 'white', backgroundColor: 'red', border: 'none', borderRadius: '5px', cursor: 'pointer'
                        }}>
                            End Meeting
                        </button>
                    )}
                </>
            )}
        </div>
    );
};

export default Recorder;
