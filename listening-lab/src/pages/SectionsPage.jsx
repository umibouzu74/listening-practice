import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import SectionListItem from '../components/SectionListItem';
import { getExamColor } from '../utils/examConfig';
import { getExamSet } from '../data/registry';
import useHistory from '../hooks/useHistory';
import styles from './SectionsPage.module.css';

export default function SectionsPage() {
  const { examType, examId } = useParams();
  const navigate = useNavigate();
  const examSet = getExamSet(examId);
  const accent = getExamColor(examType);
  const { getRecord } = useHistory();

  if (!examSet) {
    return (
      <div className={styles.page}>
        <Header onBack={() => navigate(`/${examType}`)} accentColor={accent} />
        <div className={styles.empty}>試験データが見つかりません</div>
      </div>
    );
  }

  const { meta, sections, instructions } = examSet;

  const sectionRecords = sections.map((s) => getRecord(`${examId}__${s.id}`));
  const completedCount = sectionRecords.filter(Boolean).length;

  return (
    <div className={styles.page}>
      <Header onBack={() => navigate(`/${examType}`)} accentColor={accent} />

      <div className={styles.content}>
        {/* Exam info header */}
        <div className={styles.examHeader}>
          <h2 className={styles.examTitle}>{meta.title}</h2>
          {meta.subtitle && <p className={styles.examSubtitle}>{meta.subtitle}</p>}
          {completedCount > 0 && (
            <div className={styles.overallProgress}>
              <span>{completedCount}/{sections.length} セクション完了</span>
              <div className={styles.overallTrack}>
                <div
                  className={styles.overallFill}
                  style={{
                    width: `${(completedCount / sections.length) * 100}%`,
                    background: accent,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {instructions && (
          <div className={styles.instructions}>{instructions}</div>
        )}

        <div className={styles.list}>
          {sections.map((section, i) => (
            <SectionListItem
              key={section.id}
              section={section}
              accentColor={accent}
              onClick={() => navigate(`/${examType}/${examId}/${section.id}`)}
              history={sectionRecords[i]}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.actionButtonPrimary}
            style={{ '--accent': accent }}
            onClick={() => navigate(`/${examType}/${examId}/all`)}
          >
            全問通し演習（{sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0)}問）
          </button>

          {meta.totalTime && (
            <button className={styles.phase2} disabled>
              本番形式（タイマー付き）— Phase 2
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
