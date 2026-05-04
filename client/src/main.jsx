// client/src/main.jsx
window.global  = window;
window.process = window.process ?? { env: {} };

import { Buffer } from 'buffer';
window.Buffer = Buffer;

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

const root = createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);