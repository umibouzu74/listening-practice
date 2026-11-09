// ルーターより先に popstate を受け取れるよう、最初に読み込む（utils/popGate.js を参照）
import './utils/popGate';
import { useEffect } from 'react';
import { createHashRouter, Outlet, RouterProvider, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import ExamListPage from './pages/ExamListPage';
import SectionsPage from './pages/SectionsPage';
import PracticeRoute from './pages/PracticeRoute';
import PhraseBookPage from './pages/PhraseBookPage';
import styles from './pages/PracticePage.module.css';

/** 画面遷移のたびに先頭へスクロール（HashRouter は自動でやらないため） */
function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
}

function Layout() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}

/** 存在しない URL や描画エラーのとき（ルーターの開発者向けの既定画面を出さない） */
function RouteError() {
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <Header onBack={() => navigate('/')} />
      <div className={styles.empty}>ページを表示できませんでした</div>
    </div>
  );
}

// useBlocker（hooks/useLeaveGuard.js）を使うため、データルーターにしている
const router = createHashRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/:examType', element: <ExamListPage /> },
      // 面接の基本フレーズ集（/:examType/:examId より優先される）
      { path: '/eiken/phrases', element: <PhraseBookPage /> },
      { path: '/:examType/:examId', element: <SectionsPage /> },
      { path: '/:examType/:examId/:sectionId', element: <PracticeRoute /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
