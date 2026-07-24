import React, { useState } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import AIAssistantPage from './components/AIAssistant/AIAssistantPage';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import { WeatherDataProvider } from './contexts/WeatherDataContext';
import './styles/dashboard.css';
import './styles/ai-assistant.css';

function App() {
  const [isFullScreenChat, setIsFullScreenChat] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(true);

  const toggleFullScreen = () => {
    setIsFullScreenChat(!isFullScreenChat);
  };

  const toggleChat = () => {
    if (isFullScreenChat && isChatVisible) {
      setIsFullScreenChat(false); // If closing while full screen, exit full screen first
    }
    setIsChatVisible(!isChatVisible);
  };

  return (
    <WeatherDataProvider>
      <div style={{ height: '100vh', width: '100vw', display: 'flex', overflow: 'hidden' }}>
        <Group orientation="horizontal">
          {!isFullScreenChat && (
            <Panel id="dashboard-panel" order={1} defaultSize={isChatVisible ? 70 : 100} minSize={30}>
              <DashboardLayout isChatVisible={isChatVisible} onToggleChat={toggleChat} />
            </Panel>
          )}
          
          {!isFullScreenChat && isChatVisible && (
            <Separator id="resize-handle" className="resize-handle" />
          )}

          {isChatVisible && (
            <Panel id="chat-panel" order={2} defaultSize={isFullScreenChat ? 100 : 30} minSize={20}>
              <div className="ai-assistant-panel" style={{ width: '100%', height: '100%' }}>
                <AIAssistantPage
                  isFullScreen={isFullScreenChat}
                  onToggleFullScreen={toggleFullScreen}
                  onCloseChat={toggleChat}
                />
              </div>
            </Panel>
          )}
        </Group>
      </div>
    </WeatherDataProvider>
  );
}

export default App;
