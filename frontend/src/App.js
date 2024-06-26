// App.jsx
import React from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import VideoControl from "./components/VideoControl";
import ThankYou from "./components/ThankYou";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/video"
        element={
          <Layout>
            <VideoControl />
          </Layout>
        }
      />
      <Route path="/thankyou" element={<ThankYou />} />
    </Routes>
  );
}

export default App;
