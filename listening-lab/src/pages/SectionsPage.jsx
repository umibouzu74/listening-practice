import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import SectionListItem from '../components/SectionListItem';
import InterviewCardItem from '../components/InterviewCardItem';
import PhraseBookLink from '../components/PhraseBookLink';
import { getExamColor } from '../utils/examConfig';
import { getExamSummary, isDraft, isInterview, countQuestions } from '../data/registry';
import { getRecord, recordKey } from '../utils/history';
import { getInterviewRecord, summarizeInterview } from '../utils/interviewHistory';
import { PHRASE_BOOK } from '../utils/interviewPhrases';
import styles from './SectionsPage.module.css';

export default function SectionsPage() {
  const { examType, examId } = useParams();
  const navigate = useNavigate();
  const examSet = getExamSummary(examId);
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
  const practicePath = (sectionId, mode) =>
    `/${examType}/${examId}/${sectionId}${mode ? `?mode=${mode}` : ''}`;

  // 面接（二次試験）: 問題カードの一覧。各カードから練習形式・本番形式を選ぶ
  if (isInterview(examSet)) {
    const histories = sections.map((s) =>
      summarizeInterview(getInterviewRecord(examId, s.id), s.questionCount || 5)
    );
    const completeCount = histories.filter((h) => h?.complete).length;
    const totalParts = sections.reduce((sum, s) => sum + (s.questionCount || 5), 0);
    const doneParts = histories.reduce((sum, h) => sum + (h?.doneParts || 0), 0);
    const cardLetters = sections.map((s) => String(s.id).toUpperCase()).join('・');
    return (
      <div className={styles.page}>
        <Header onBack={() => navigate(`/${examType}?format=interview`)} accentColor={accent} />
        <div className={styles.content}>
          <div className={styles.examHeader}>
            <h2 className={styles.examTitle}>{meta.title}</h2>
            {meta.subtitle && <p className={styles.examSubtitle}>{meta.subtitle}</p>}
            <p className={styles.examNote}>
              この回の本番で使われた問題カードのうち、{cardLetters} の{sections.length}枚を収録しています
            </p>
            {doneParts > 0 && (
              <div className={styles.overallProgress}>
                <span>
                  全パート練習済み {completeCount}/{sections.length} 枚（パート {doneParts}/{totalParts}）
                </span>
                <div className={styles.overallTrack}>
                  <div
                    className={styles.overallFill}
                    style={{ width: `${(doneParts / totalParts) * 100}%`, background: accent }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className={styles.instructions}>
            {instructions ||
              '問題カードを選んで練習します。練習形式ではナレーションと No.1〜4 を1つずつ何度でもやり直せます。本番形式では黙読1分 → ナレーション2分 → No.1〜4 を本番どおりの流れで通します。録音は端末の中だけで扱い、外部には送信しません。'}
          </div>

          <div className={styles.list}>
            {examType === 'eiken' && meta.grade === PHRASE_BOOK.grade && (
              <PhraseBookLink accentColor={accent} onClick={() => navigate('/eiken/phrases')} />
            )}
            {sections.map((section, i) => (
              <InterviewCardItem
                key={section.id}
                title={section.title}
                story={section.story}
                accentColor={accent}
                history={histories[i]}
                onPractice={() => navigate(practicePath(section.id))}
                onExam={() => navigate(practicePath(section.id, 'exam'))}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const sectionRecords = sections.map((s) => getRecord(recordKey(examId, s.id)));
  const allRecord = getRecord(recordKey(examId, 'all'));
  const completedCount = sectionRecords.filter(Boolean).length;

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
              questionCount={section.questionCount}
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

        <h3 className={styles.subheading}>本番形式で解く</h3>
        <SectionListItem
          title="本番モード"
          subtitle="説明から最後の問題まで音声が1回ずつ止まらずに流れ、最後にまとめて採点します"
          questionCount={countQuestions(examSet)}
          playCount={meta.totalTime ? `約${meta.totalTime}分` : undefined}
          accentColor={accent}
          onClick={() => navigate(practicePath('all', 'exam'))}
        />
      </div>
    </div>
  );
}
