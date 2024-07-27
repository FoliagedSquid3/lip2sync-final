import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import VideoPlayer from "./VideoPlayer";
import AudioCapture from "./AudioCapture";


const fetchJobDetails = async (url) => {
  try {
    const response = await fetch(url); // Make a GET request to the API endpoint
    if (!response.ok) {
      throw new Error(`Failed to retrieve data: ${response.status}`);
    }
    const data = await response.json(); // Parse the JSON response
    const jobs = data.data || []; // Extract the list of jobs

    // Initialize an array to store names
    const names = [];

    // Iterate through each job to get the applicants' names
    jobs.forEach((job) => {
      const applicants = job.applicants || [];
      applicants.forEach((applicant) => {
        const name = applicant.user.name;
        if (name) {
          names.push(name); // Add the name to the array if it exists
        }
      });
    });

    return names; // Return the array of names
  } catch (error) {
    console.error("Error fetching job details:", error);
    return []; // Return an empty array if there's an error
  }
};

const VideoControl = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [videoSrc, setVideoSrc] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);  // State to manage loading indicator
  const REACT_APP_API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const jobIdParam = searchParams.get("job_id");
    const userIdParam = searchParams.get("user_id");
    setJobId(jobIdParam);
    setUserId(userIdParam);

    const apiUrl = process.env.REACT_APP_API_URL;

    const fetchData = async () => {
      try {
        const names = await fetchJobDetails(apiUrl); // Call the fetchJobDetails function
        const fetchedUserName = names.length > 0 ? names[0] : 'Unknown'; // Assuming the first name is the user's name
        setUserName(fetchedUserName); // Set the fetched username
      } catch (error) {
        console.error("Error fetching data:", error);
        // Handle error fetching data, e.g., show an error message
      }
    };

    const fetchVideo = async () => {
      try {
        const response = await fetch(`${REACT_APP_API_URL}/send_video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ user_id: userIdParam, job_id: jobIdParam })
        });
        if (!response.ok) {
          throw new Error('Video not found');
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setVideoSrc(url);
        setIsLoading(false);
        console.log(`video size ${blob.size}`)
        console.log(`Video temp url ${url}`)
        console.log("Response type:", blob.type); // This should log 'video/mp4'
      } catch (error) {
        console.error('Error fetching video:', error);
      }
    };

    if (jobIdParam && userIdParam) {
      fetchData();
      fetchVideo();
      console.log('fetching video and data')
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
      // console.log(`Voice detected: ${isVoiceDetected}, Video paused: ${isPaused}`);
      if (isVoiceDetected && !isPaused) {
        // console.log("Pausing video due to voice detection");
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
    const redirectUrl = `https://app.timetomeet.ai/meeting-finished/${jobId}/${userId}`;
    window.location.href = redirectUrl; // Redirect to the external URL
    // navigate("/thankyou");
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="flex flex-col justify-center items-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Hello {userName}!
        </h2>
        {isLoading && (
          <div className="flex flex-col justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full border-t-transparent border-solid border-blue-500 border-8 h-16 w-16"></div>  {/* Loader */}
          <p className="text-black font-bold text-lg mt-4">Please wait, the recruiter will be joining shortly...</p>  {/* Larger text displayed below the loader */}
        </div>
        )}
        <VideoPlayer
          videoSrc={videoSrc}
          onVideoEnd={handleVideoEnd}
          disable={disableVideo}
          jobId={jobId}
          userId={userId}
          userName={userName}
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
