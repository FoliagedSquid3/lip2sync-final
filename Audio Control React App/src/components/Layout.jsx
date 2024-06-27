import React from "react";

const Layout = ({ children, blurBackground, sidebarContent }) => {
  const backgroundColor = "#e0e0e0"; // Google Meet-like background color

  return (
    <div
      className={`flex min-h-screen transition-colors duration-500 ${blurBackground ? 'blur' : ''}`}
      style={{ backgroundColor: backgroundColor }}
    >
      {/* Main Content Area */}
      <div className="flex-grow">
        <header className="flex justify-between items-center p-4 bg-gray-200">
          <h1 className="text-2xl font-bold">Video Interview</h1>
        </header>
        <main className="p-4 flex-grow">{children}</main>
      </div>

      {/* Sidebar/Navbar */}
      <div className="w-96 bg-gray-800 text-white p-5"> {/* Increased width */}
        <h1 className="text-lg font-bold mb-4">Participant</h1>
        {/* You can pass sidebar content dynamically or define it here */}
        {sidebarContent}
      </div>

      <style jsx>{`
        .blur {
          filter: blur(5px);
        }
        .bg-gray-200 {
          background-color: #e0e0e0; /* Lighter gray for header contrast */
        }
        .bg-gray-800 {
          background-color: #2d2d2d; /* Darker gray for sidebar */
        }
        .text-white {
          color: white;
        }
      `}</style>
    </div>
  );
};

export default Layout;
