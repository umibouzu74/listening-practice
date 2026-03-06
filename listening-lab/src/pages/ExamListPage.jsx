import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import ExamSetCard from '../components/ExamSetCard';
import { getExamType, getGradeLabel, getPrefectureLabel } from '../utils/examConfig';
import { getExamSets } from '../data/registry';
import styles from './ExamListPage.module.css';

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
    if (sortOrder === 'desc') return String(b).localeCompare(String(a), undefined, { numeric: true });
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });

  return keys.map((key) => {
    let label = String(key);
    if (groupBy === 'year') label = `${key}年度`;
    else if (groupBy === 'grade') label = getGradeLabel(key);
    else if (groupBy === 'prefecture') label = getPrefectureLabel(key);
    return { key, label, items: grouped[key] };
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
              <div className={styles.list}>
                {group.items.map((examSet) => (
                  <ExamSetCard
                    key={examSet.id}
                    examSet={examSet}
                    accentColor={config.color}
                    onClick={() => navigate(`/${examType}/${examSet.id}`)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
