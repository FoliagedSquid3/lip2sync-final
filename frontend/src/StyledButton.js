import styled from 'styled-components';

const StyledButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.text};
  border: none;
  cursor: pointer;
  font-size: 1.5rem;
  position: absolute;
  top: 10px;
  right: 20px;
  transition: color 0.3s ease;

  &:hover {
    color: ${({ theme }) => theme.toggleBorder};
  }
`;

export default StyledButton;
