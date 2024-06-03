import React, { useState } from 'react';
import { ThemeProvider } from 'styled-components';
import styled from 'styled-components';
import { lightTheme, darkTheme } from './theme';
import { GlobalStyles } from './global';
import Video from './components/video';
import StyledButton from './StyledButton';
import Recorder from './components/recorder';

const Title = styled.h1`
  color: ${({ theme }) => theme.text};
  text-align: center;
  margin-top: 0.5em;
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 10;
`;

const StartButton = styled.button`
  font-size: 1.5rem;
  padding: 20px 40px;
  border: none;
  border-radius: 8px;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
  transition: background-color 0.3s;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  pointer-events: ${({ disabled }) => (disabled ? 'none' : 'auto')};

  &:hover {
    background-color: #45a049;
  }
`;

const NameInput = styled.input`
  font-size: 1.2rem;
  padding: 15px;
  width: 300px;
  margin-bottom: 20px;
  border: 2px solid #ccc;
  border-radius: 4px;
`;

function App() {
  const [theme, setTheme] = useState('light');
  const [showOverlay, setShowOverlay] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [playVideo, setPlayVideo] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState(null);
  const [stream, setStream] = useState(null);
  const [userName, setUserName] = useState('');
  const [meetingEnded, setMeetingEnded] = useState(false);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleRecordingStart = (audioStream) => {
    console.log('Recording started with stream:', audioStream);
    const context = new AudioContext();
    const analyserNode = context.createAnalyser();
    const source = context.createMediaStreamSource(audioStream);
    source.connect(analyserNode);
    setAudioContext(context);
    setAnalyser(analyserNode);
    setStream(audioStream);
  };

  const startRecording = () => {
    setShowOverlay(false);
    setIsRecording(true);
    setPlayVideo(true);
  };

  const handleMeetingEnd = () => {
    setMeetingEnded(true);
    setIsRecording(false); // Stop recording

    // Ensure all tracks are stopped
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }
};


  const icon = theme === 'light' ? '🌙' : '☀️';

  const videoUrl = '/video.mp4';

  const isStartDisabled = userName.trim().length === 0;

  return (
    <ThemeProvider theme={theme === 'light' ? lightTheme : darkTheme}>
      <GlobalStyles />
      {meetingEnded ? (
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw'
        }}>
          <h1>Thank You for Attending!</h1>
        </div>
      ) : (
        <div className="App">
          {showOverlay && (
            <Overlay>
              <NameInput 
                type="text" 
                placeholder="Enter your name" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)} 
              />
              <StartButton disabled={isStartDisabled} onClick={startRecording}>
                Start Meeting
              </StartButton>
            </Overlay>
          )}
          <header className="App-header">
            <Title>AI Recruiter</Title>
            <StyledButton onClick={toggleTheme}>{icon}</StyledButton>
            {playVideo && <Video id="mainVideo" url={videoUrl} />}
            {isRecording && <Recorder onRecordingStart={handleRecordingStart} onRecordingStop={handleMeetingEnd} userName={userName} jobId={123} />}
          </header>
        </div>
      )}
    </ThemeProvider>
  );
}

export default App;
