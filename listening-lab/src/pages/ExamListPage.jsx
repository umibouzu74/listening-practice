import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import ExamSetCard from '../components/ExamSetCard';
import PhraseBookLink from '../components/PhraseBookLink';
import { getExamType, getGradeLabel, getGradeOrder, getPrefectureLabel } from '../utils/examConfig';
import { getExamSets, isInterview } from '../data/registry';
import { getRecord, recordKey } from '../utils/history';
import { isCardComplete } from '../utils/interviewHistory';
import usePreference from '../hooks/usePreference';
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
  // 1種類しかないグループ（タブで絞り込んだときなど）は見出しなしで並べる
  if (parts.length === 1) return [{ ...parts[0], label: null }];
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

/** リスニングと面接の両方がある試験種別では、どちらを表示するかをタブで切り替える */
function availableFormats(sets) {
  return FORMAT_PARTS.filter((part) => sets.some(part.match));
}

export default function ExamListPage() {
  const { examType } = useParams();
  const navigate = useNavigate();
  const config = getExamType(examType);
  const [searchParams, setSearchParams] = useSearchParams();
  // 最後に選んだタブ（URL に ?format= がないとき、戻ってきたときに使う）
  const [savedFormat, setSavedFormat] = usePreference(`examListFormat:${examType}`, null);

  if (!config) {
    return (
      <div className={styles.page}>
        <Header onBack={() => navigate('/')} />
        <div className={styles.empty}>試験種別が見つかりません</div>
      </div>
    );
  }

  const allSets = getExamSets(examType);
  const formats = availableFormats(allSets);
  const tabbed = formats.length > 1;
  const requested = searchParams.get('format') || savedFormat;
  const format = tabbed ? (formats.find((f) => f.key === requested) || formats[0]).key : null;
  const sets = tabbed ? allSets.filter(FORMAT_PARTS.find((f) => f.key === format).match) : allSets;
  const groups = groupExamSets(sets, config.groupBy, config.sortOrder);

  const selectFormat = (key) => {
    setSavedFormat(key);
    setSearchParams({ format: key }, { replace: true });
  };

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

        {tabbed && (
          <div className={styles.tabs} role="tablist" aria-label="表示する問題の種類">
            {formats.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                id={`tab-${f.key}`}
                aria-selected={f.key === format}
                aria-controls="exam-list-panel"
                className={`${styles.tab} ${f.key === format ? styles.tabOn : ''}`}
                style={{ '--tab-accent': config.color }}
                onClick={() => selectFormat(f.key)}
              >
                {f.label}
                <span className={styles.tabCount}>{allSets.filter(f.match).length}回</span>
              </button>
            ))}
          </div>
        )}

        {tabbed && format === 'interview' && (
          <p className={styles.legend}>
            面接官の声は、<strong>録音音声</strong>（実際の面接官の声を録音したもの）か、
            <strong>合成音声</strong>（ブラウザの読み上げ。声は端末によって変わります）で流れます。
          </p>
        )}

        <div id="exam-list-panel" role={tabbed ? 'tabpanel' : undefined} aria-labelledby={tabbed ? `tab-${format}` : undefined}>
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
                              ? isCardComplete(examSet.id, sec)
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
    </div>
  );
}
