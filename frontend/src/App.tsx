import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import GameRoom from './pages/GameRoom';
import { GameProvider } from './hooks/useGameState';

function App() {
  return (
    <Router>
      <GameProvider>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/room/:id" element={<Navigate to="/game/:id" replace />} /> {/* Legacy redirect */}
            <Route path="/game/:id" element={<GameRoom />} />
          </Routes>
        </div>
      </GameProvider>
    </Router>
  );
}

export default App;
