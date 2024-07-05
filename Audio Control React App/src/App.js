// App.jsx
import React from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import VideoControl from "./components/VideoControl";
import ThankYou from "./components/ThankYou";
import WebcamStreamCapture from "./components/WebcamStreamCapture";
import NotFound from "./components/NotFound";

function App() {
  return (
    <Routes>
      <Route
        path="/video"
        element={
          <Layout sidebarContent={<WebcamStreamCapture />}>
            <VideoControl />
          </Layout>
        }
      />
      <Route path="/thankyou" element={<ThankYou />} />
      <Route path="/" element={<NotFound />} />
    </Routes>
  );
}

export default App;
