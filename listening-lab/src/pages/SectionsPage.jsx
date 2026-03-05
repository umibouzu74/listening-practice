import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import SectionListItem from '../components/SectionListItem';
import { getExamColor } from '../utils/examConfig';
import { getExamSet } from '../data/registry';
import styles from './SectionsPage.module.css';

export default function SectionsPage() {
  const { examType, examId } = useParams();
  const navigate = useNavigate();
  const examSet = getExamSet(examId);
  const accent = getExamColor(examType);

  if (!examSet) {
    return (
      <div className={styles.page}>
        <Header onBack={() => navigate(`/${examType}`)} accentColor={accent} />
        <div className={styles.empty}>試験データが見つかりません</div>
      </div>
    );
  }

  const { meta, sections, instructions } = examSet;

  return (
    <div className={styles.page}>
      <Header onBack={() => navigate(`/${examType}`)} accentColor={accent} />

      <div className={styles.content}>
        {instructions && (
          <div className={styles.instructions}>{instructions}</div>
        )}

        <div className={styles.list}>
          {sections.map((section) => (
            <SectionListItem
              key={section.id}
              section={section}
              accentColor={accent}
              onClick={() => navigate(`/${examType}/${examId}/${section.id}`)}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <button
            className={styles.actionButtonPrimary}
            style={{ '--accent': accent }}
            onClick={() => navigate(`/${examType}/${examId}/all`)}
          >
            全問通し演習
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
