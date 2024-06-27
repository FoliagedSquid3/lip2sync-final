import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Navigate to /video as soon as the component is loaded
    navigate("/video", { state: { userName: "Numan Pathan" } });
  }, [navigate]);

  return null; // Render nothing as it will navigate immediately
};

export default Home;
