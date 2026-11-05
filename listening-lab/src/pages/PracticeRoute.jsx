import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import PracticePage from './PracticePage';
import ExamModePage from './ExamModePage';
import InterviewExamPage from './InterviewExamPage';
import useExamSet from '../hooks/useExamSet';
import { isDraft, isInterview } from '../data/registry';
import { getExamColor } from '../utils/examConfig';
import styles from './PracticePage.module.css';

/**
 * 演習画面の入口。問題データを読み込んでから、練習モード / 本番モードを表示する。
 * 「次のセクションへ」など同じルート内の遷移でも状態をリセットするため、遷移ごとに作り直す。
 */
export default function PracticeRoute() {
  const { examType, examId, sectionId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const accent = getExamColor(examType);
  const { status, examSet, retry } = useExamSet(examId);

  if (status !== 'ready' || isDraft(examSet)) {
    const message = {
      loading: '読み込み中…',
      notfound: '試験データが見つかりません',
      error: '問題データを読み込めませんでした。通信状況を確認してください。',
    }[status] ?? 'この回は問題データを準備中です';
    return (
      <div className={styles.page}>
        <Header onBack={() => navigate(`/${examType}/${examId}`)} accentColor={accent} />
        <div className={styles.empty} role={status === 'loading' ? 'status' : undefined}>
          {message}
          {status === 'error' && (
            <div>
              <button className={styles.ghostButton} style={{ marginTop: '1rem' }} onClick={retry}>
                再読み込み
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 面接（二次試験）: 問題カード1枚ごとに練習形式・本番形式を開く
  if (isInterview(examSet)) {
    const section = examSet.sections.find((s) => s.id === sectionId);
    if (section && searchParams.get('mode') === 'exam') {
      return <InterviewExamPage key={location.key} examSet={examSet} section={section} />;
    }
    // 練習形式は次の段階で追加する
    return (
      <div className={styles.page}>
        <Header onBack={() => navigate(`/${examType}/${examId}`)} accentColor={accent} />
        <div className={styles.empty}>
          {section ? '面接の練習形式は準備中です' : '問題カードが見つかりません'}
        </div>
      </div>
    );
  }

  if (searchParams.get('mode') === 'exam') {
    return <ExamModePage key={location.key} examSet={examSet} />;
  }
  return <PracticePage key={location.key} examSet={examSet} />;
}
