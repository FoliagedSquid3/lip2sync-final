import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const [isNameEntered, setIsNameEntered] = useState(false);

  const handleStart = () => {
    if (name.trim()) {
      navigate("/video", { state: { userName: name } });

    }
  };

  const handleChangeName = (e) => {
    setName(e.target.value);
    setIsNameEntered(e.target.value.trim().length > 0); // Enable button when name is entered
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-200 to-blue-400">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">
        Welcome to AI Recruiter
      </h1>
      <div className="container flex flex-col md:flex-row mx-auto max-w-7xl px-4 py-6">
        {/* Left Side: Name Entering Field */}
        <div className="flex-1 mb-4 md:mr-4">
          <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Enter Your Name
            </label>
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={handleChangeName}
              className="px-3 py-2 placeholder-gray-400 text-gray-700 relative bg-white rounded text-sm shadow outline-none focus:outline-none focus:shadow-outline w-full"
            />
            <button
              onClick={handleStart}
              disabled={!isNameEntered} // Disable button until name is entered
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4 w-full focus:outline-none focus:shadow-outline ${
                !isNameEntered ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Start
            </button>
          </div>
        </div>
        {/* Right Side: Instructions Card */}
        <div className="flex-1">
          <div className="bg-white shadow-md rounded-lg p-6 h-full">
            <h2 className="text-xl font-semibold mb-2">Instructions for Candidates</h2>
            <ul className="list-disc pl-4">
              <li className="text-gray-700">
                Ensure that mic and camera access is provided.
              </li>
              <li className="text-gray-700">
                It is suggested that you use headphones and high quality microphone for seamless experience.
              </li>
              <li className="text-gray-700">
                Avoid being in a crowded noisy environment for optimal performance.
              </li>
              <li className="text-gray-700">
                Don't forget to submit your recording.
              </li>
              <li className="text-gray-700">
                Listen to all questions carefully and answer accordingly.
              </li>
              <li className="text-gray-700">
                Refreshing browser will lead to deletion of data and may disqualify you too if malified intent noted.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
