import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import QAPage from './pages/QAPage';
import ExtractionPage from './pages/ExtractionPage';
import ComparisonPage from './pages/ComparisonPage';
import FAQPage from './pages/FAQPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<QAPage />} />
          <Route path="/results" element={<ExtractionPage />} />
          <Route path="/comparison" element={<ComparisonPage />} />
          <Route path="/faq" element={<FAQPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
