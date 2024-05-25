import React from 'react';
import styled from 'styled-components';

const VideoContainer = styled.div`
  width: 80%;
  max-width: 640px;
  margin: 2rem auto;
`;

const Video = ({ url }) => (
  <VideoContainer>
    <video id="mainVideo" width="100%" controls autoPlay>
      <source src={url} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  </VideoContainer>
);

export default Video;
