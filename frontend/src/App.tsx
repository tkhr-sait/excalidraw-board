import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'jotai';
import ErrorBoundary from '@/components/Common/ErrorBoundary';
import Header from '@/components/Header/Header';
import WelcomeScreen from '@/components/Common/WelcomeScreen';
import CollaborativeBoard from '@/components/Board/CollaborativeBoard';

function App() {
  return (
    <Provider>
      <ErrorBoundary>
        <Router>
          <div className="app min-h-screen bg-gray-50">
            <Header />
            <main className="app-main">
              <Routes>
                <Route path="/" element={<WelcomeScreen />} />
                <Route path="/room/:roomId" element={<CollaborativeBoard />} />
              </Routes>
            </main>
          </div>
        </Router>
      </ErrorBoundary>
    </Provider>
  );
}

export default App;