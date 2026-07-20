import React from 'react';
import AIAssistantPage from './components/AIAssistant/AIAssistantPage';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import './styles/dashboard.css';

function App() {
  return (
    <div className="split-layout">
      <DashboardLayout />
      <div className="ai-assistant-panel">
        <AIAssistantPage />
      </div>
    </div>
  );
}

export default App;
