import React, { useState } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import AIAssistantPage from './components/AIAssistant/AIAssistantPage';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import { WeatherDataProvider } from './contexts/WeatherDataContext';
import './styles/dashboard.css';
import './styles/ai-assistant.css';

function App() {
  const [isFullScreenChat, setIsFullScreenChat] = useState(false);

  const toggleFullScreen = () => {
    setIsFullScreenChat(!isFullScreenChat);
  };

  return (
    <WeatherDataProvider>
      <div style={{ height: '100vh', width: '100vw', display: 'flex', overflow: 'hidden' }}>
        <Group orientation="horizontal">
          {!isFullScreenChat && (
            <Panel id="dashboard-panel" order={1} defaultSize={70} minSize={30}>
              <DashboardLayout />
            </Panel>
          )}
          {!isFullScreenChat && (
            <Separator id="resize-handle" className="resize-handle" />
          )}

          <Panel id="chat-panel" order={2} defaultSize={isFullScreenChat ? 100 : 30} minSize={20}>
            <div className="ai-assistant-panel" style={{ width: '100%', height: '100%' }}>
              <AIAssistantPage
                isFullScreen={isFullScreenChat}
                onToggleFullScreen={toggleFullScreen}
              />
            </div>
          </Panel>
        </Group>
      </div>
    </WeatherDataProvider>
  );
}

export default App;
