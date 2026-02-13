import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/common/Header';
import UploadPage from './pages/UploadPage';
import ExtractionPage from './pages/ExtractionPage';
import ComparisonPage from './pages/ComparisonPage';
import QAPage from './pages/QAPage';
import FAQPage from './pages/FAQPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/extraction" element={<ExtractionPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/qa" element={<QAPage />} />
            <Route path="/faq" element={<FAQPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
