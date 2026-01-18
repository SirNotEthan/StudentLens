import { useNavigate } from 'react-router-dom';
import '../styles/StrandsPage.css';

const StrandsPage = () => {
  const navigate = useNavigate();

  // Strands is currently disabled - show coming soon message
  return (
    <div className="strands-page">
      <header className="strands-header">
        <button className="back-button" onClick={() => navigate('/main')}>
          ← Back
        </button>
        <h1 className="strands-title">STRANDS</h1>
        <div className="strands-stats">
          <div className="stat-item">
            <span className="stat-value">0</span>
            <span className="stat-label">Played</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">0</span>
            <span className="stat-label">Streak</span>
          </div>
        </div>
      </header>

      <main className="strands-main">
        <div className="coming-soon-container">
          <div className="coming-soon-icon">🚧</div>
          <h2 className="coming-soon-title">Coming Soon</h2>
          <p className="coming-soon-text">
            Strands is currently under development. We're working on bringing you an exciting
            word-finding puzzle experience similar to the New York Times Strands game.
          </p>
          <p className="coming-soon-text">
            Check back soon for updates!
          </p>
          <button className="back-to-games-button" onClick={() => navigate('/main')}>
            Back to Games
          </button>
        </div>
      </main>
    </div>
  );
};

export default StrandsPage;
