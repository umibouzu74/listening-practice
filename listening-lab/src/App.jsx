import { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ExamListPage from './pages/ExamListPage';
import SectionsPage from './pages/SectionsPage';
import PracticePage from './pages/PracticePage';

/** 画面遷移のたびに先頭へスクロール（HashRouter は自動でやらないため） */
function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
}

/** 「次のセクションへ」などで同じルートに遷移しても状態をリセットするため、遷移ごとに作り直す */
function PracticeRoute() {
  const location = useLocation();
  return <PracticePage key={location.key} />;
}

function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/:examType" element={<ExamListPage />} />
        <Route path="/:examType/:examId" element={<SectionsPage />} />
        <Route path="/:examType/:examId/:sectionId" element={<PracticeRoute />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
