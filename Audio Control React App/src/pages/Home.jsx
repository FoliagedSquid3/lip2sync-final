import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate fetching data from the backend
    async function fetchData() {
      // Simulate fetching video URL and other data needed
      const video_url_from_backend = "http://localhost:3000/videos/1/1.mp4";
      const userName = "Numan Pathan";

      // Navigate to /video with state parameters
      navigate('/video', { state: { videoUrl: video_url_from_backend, userName } });
    }

    fetchData();
  }, [navigate]);

  return null; // Render nothing as it will navigate immediately
};

export default Home;
