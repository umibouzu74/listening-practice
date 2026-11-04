import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import SectionListItem from '../components/SectionListItem';
import { getExamColor } from '../utils/examConfig';
import { getExamSet, isDraft, countQuestions } from '../data/registry';
import { getRecord, recordKey } from '../utils/history';
import styles from './SectionsPage.module.css';

export default function SectionsPage() {
  const { examType, examId } = useParams();
  const navigate = useNavigate();
  const examSet = getExamSet(examId);
  const accent = getExamColor(examType);

  if (!examSet || isDraft(examSet)) {
    return (
      <div className={styles.page}>
        <Header onBack={() => navigate(`/${examType}`)} accentColor={accent} />
        <div className={styles.empty}>
          {examSet ? 'この回は問題データを準備中です' : '試験データが見つかりません'}
        </div>
      </div>
    );
  }

  const { meta, sections, instructions } = examSet;
  const sectionRecords = sections.map((s) => getRecord(recordKey(examId, s.id)));
  const allRecord = getRecord(recordKey(examId, 'all'));
  const completedCount = sectionRecords.filter(Boolean).length;
  const practicePath = (sectionId, mode) =>
    `/${examType}/${examId}/${sectionId}${mode ? `?mode=${mode}` : ''}`;

  return (
    <div className={styles.page}>
      <Header onBack={() => navigate(`/${examType}`)} accentColor={accent} />

      <div className={styles.content}>
        <div className={styles.examHeader}>
          <h2 className={styles.examTitle}>{meta.title}</h2>
          {meta.subtitle && <p className={styles.examSubtitle}>{meta.subtitle}</p>}
          {completedCount > 0 && (
            <div className={styles.overallProgress}>
              <span>{completedCount}/{sections.length} セクション完了</span>
              <div className={styles.overallTrack}>
                <div
                  className={styles.overallFill}
                  style={{ width: `${(completedCount / sections.length) * 100}%`, background: accent }}
                />
              </div>
            </div>
          )}
        </div>

        {instructions && <div className={styles.instructions}>{instructions}</div>}

        <div className={styles.list}>
          {sections.map((section, i) => (
            <SectionListItem
              key={section.id}
              title={section.title}
              subtitle={section.subtitle || section.description}
              questionCount={section.questions?.length || 0}
              playCount={section.playCount}
              accentColor={accent}
              history={sectionRecords[i]}
              onClick={() => navigate(practicePath(section.id))}
              onReviewWrong={() => navigate(practicePath(section.id, 'wrong'))}
            />
          ))}
        </div>

        {sections.length > 1 && (
          <>
            <h3 className={styles.subheading}>まとめて解く</h3>
            <SectionListItem
              title="全問通し演習"
              subtitle={`${sections.map((s) => s.title).join(' → ')} を続けて解く`}
              questionCount={countQuestions(examSet)}
              accentColor={accent}
              history={allRecord}
              onClick={() => navigate(practicePath('all'))}
              onReviewWrong={() => navigate(practicePath('all', 'wrong'))}
            />
          </>
        )}
      </div>
    </div>
  );
}
