import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import ExamSetCard from '../components/ExamSetCard';
import PhraseBookLink from '../components/PhraseBookLink';
import { getExamType, getGradeLabel, getGradeOrder, getPrefectureLabel } from '../utils/examConfig';
import { getExamSets, isInterview } from '../data/registry';
import { getRecord, recordKey } from '../utils/history';
import { getInterviewRecord } from '../utils/interviewHistory';
import { PHRASE_BOOK } from '../utils/interviewPhrases';
import styles from './ExamListPage.module.css';

// 同じグループ（英検の級など）の中を、リスニングと面接（二次試験）に分けて表示する
const FORMAT_PARTS = [
  { key: 'listening', label: 'リスニング', match: (s) => !isInterview(s) },
  { key: 'interview', label: '面接（二次試験）', match: isInterview },
];

function splitByFormat(items) {
  const parts = FORMAT_PARTS
    .map((part) => ({ ...part, items: items.filter(part.match) }))
    .filter((part) => part.items.length > 0);
  // リスニングしかないグループは今までどおり見出しなしで並べる
  if (parts.length === 1 && parts[0].key === 'listening') return [{ ...parts[0], label: null }];
  return parts;
}

function groupExamSets(sets, groupBy, sortOrder) {
  if (groupBy === 'none' || !groupBy) {
    return [{ key: null, label: null, items: sets }];
  }

  const grouped = {};
  for (const s of sets) {
    let key;
    if (groupBy === 'year') key = s.meta.year ?? 'その他';
    else if (groupBy === 'grade') key = s.meta.grade ?? 'その他';
    else if (groupBy === 'prefecture') key = s.meta.prefecture ?? 'その他';
    else key = 'その他';

    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  const keys = Object.keys(grouped);
  keys.sort((a, b) => {
    // 級は「1級 → 準1級 → 2級 …」の決まった順に並べる
    if (groupBy === 'grade') return getGradeOrder(a) - getGradeOrder(b);
    if (sortOrder === 'desc') return String(b).localeCompare(String(a), undefined, { numeric: true });
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });

  return keys.map((key) => {
    let label = String(key);
    if (groupBy === 'year') label = `${key}年度`;
    else if (groupBy === 'grade') label = getGradeLabel(key);
    else if (groupBy === 'prefecture') label = getPrefectureLabel(key);
    const items = grouped[key].slice().sort((a, b) => {
      const sa = a.meta.session ?? a.id;
      const sb = b.meta.session ?? b.id;
      if (sortOrder === 'desc') return String(sb).localeCompare(String(sa), undefined, { numeric: true });
      return String(sa).localeCompare(String(sb), undefined, { numeric: true });
    });
    return { key, label, items };
  });
}

export default function ExamListPage() {
  const { examType } = useParams();
  const navigate = useNavigate();
  const config = getExamType(examType);

  if (!config) {
    return (
      <div className={styles.page}>
        <Header onBack={() => navigate('/')} />
        <div className={styles.empty}>試験種別が見つかりません</div>
      </div>
    );
  }

  const sets = getExamSets(examType);
  const groups = groupExamSets(sets, config.groupBy, config.sortOrder);

  return (
    <div className={styles.page}>
      <Header onBack={() => navigate('/')} accentColor={config.color} />

      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <span className={styles.pageIcon}>{config.icon}</span>
          <div>
            <h2 className={styles.pageTitle}>{config.label}</h2>
            <p className={styles.pageDescription}>{config.description}</p>
          </div>
        </div>

        {sets.length === 0 ? (
          <div className={styles.empty}>準備中です</div>
        ) : (
          groups.map((group) => (
            <div key={group.key ?? '_flat'}>
              {group.label && (
                <h2 className={styles.groupHeading}>{group.label}</h2>
              )}
              {splitByFormat(group.items).map((part) => (
                <section key={part.key} className={styles.formatPart}>
                  {part.label && <h3 className={styles.formatHeading}>{part.label}</h3>}
                  <div className={styles.list}>
                    {examType === 'eiken' && part.key === 'interview' && group.key === PHRASE_BOOK.grade && (
                      <PhraseBookLink accentColor={config.color} onClick={() => navigate('/eiken/phrases')} />
                    )}
                    {part.items.map((examSet) => (
                      <ExamSetCard
                        key={examSet.id}
                        examSet={examSet}
                        accentColor={config.color}
                        completedSections={
                          examSet.sections.filter((sec) =>
                            isInterview(examSet)
                              ? getInterviewRecord(examSet.id, sec.id)
                              : getRecord(recordKey(examSet.id, sec.id))
                          ).length
                        }
                        onClick={() => navigate(`/${examType}/${examSet.id}`)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
