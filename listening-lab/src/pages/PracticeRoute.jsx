import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import PracticePage from './PracticePage';
import ExamModePage from './ExamModePage';
import useExamSet from '../hooks/useExamSet';
import { isDraft, isInterview } from '../data/registry';
import { getExamColor } from '../utils/examConfig';
import styles from './PracticePage.module.css';

/**
 * 演習画面の入口。問題データを読み込んでから、練習モード / 本番モードを表示する。
 * 「次のセクションへ」など同じルート内の遷移でも状態をリセットするため、遷移ごとに作り直す。
 */
export default function PracticeRoute() {
  const { examType, examId } = useParams();
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

  // 面接（二次試験）の練習・本番画面は次の段階で追加する。それまではリスニング用の画面に渡さない
  if (isInterview(examSet)) {
    return (
      <div className={styles.page}>
        <Header onBack={() => navigate(`/${examType}/${examId}`)} accentColor={accent} />
        <div className={styles.empty}>面接の練習画面は準備中です</div>
      </div>
    );
  }

  if (searchParams.get('mode') === 'exam') {
    return <ExamModePage key={location.key} examSet={examSet} />;
  }
  return <PracticePage key={location.key} examSet={examSet} />;
}
