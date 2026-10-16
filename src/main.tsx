import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './ui/App';
import { registerServiceWorker } from './pwa';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
    <div className="rotate-notice">
      <div className="rotate-card">
        <div className="rotate-title">スマホを横向きにしてください</div>
        <p>Eight Wardens：八人の防衛隊 は横画面で遊ぶゲームです。</p>
      </div>
    </div>
  </React.StrictMode>,
);

registerServiceWorker();
