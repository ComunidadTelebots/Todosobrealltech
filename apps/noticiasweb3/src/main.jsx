import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './theme-material.css'; // tema Android (.platform-android)
import './theme-ios.css';      // tema iOS (.platform-ios)
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
