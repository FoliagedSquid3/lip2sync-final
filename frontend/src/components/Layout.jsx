import React, { useState, useEffect } from "react";

const Layout = ({ children, blurBackground }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setDarkMode(savedTheme === "dark");
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div
      className={`min-h-screen ${
        darkMode ? 'dark-mode' : 'light-mode'
      } transition-colors duration-500 ${blurBackground ? 'blur' : ''}`}
    >
      <header className="flex justify-between items-center p-4">
        <h1 className="text-2xl font-bold">AI Recruiter</h1>
        <button
          onClick={toggleDarkMode}
          className="bg-gray-200 dark:bg-gray-700 text-black dark:text-white px-4 py-2 rounded"
        >
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </header>
      <main className="p-4">{children}</main>

      <style jsx>{`
        .light-mode {
          background: linear-gradient(135deg, #f6d365 0%, #fda085 100%);
          animation: gradientAnimation 15s ease infinite;
        }

        .dark-mode {
          background: linear-gradient(135deg, #2b5876 0%, #4e4376 100%);
          animation: gradientAnimation 15s ease infinite;
        }

        .blur {
          filter: blur(5px);
        }

        @keyframes gradientAnimation {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
