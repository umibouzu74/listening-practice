import { HashRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ExamListPage from './pages/ExamListPage';
import SectionsPage from './pages/SectionsPage';
import PracticePage from './pages/PracticePage';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:examType" element={<ExamListPage />} />
        <Route path="/:examType/:examId" element={<SectionsPage />} />
        <Route path="/:examType/:examId/:sectionId" element={<PracticePage />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
