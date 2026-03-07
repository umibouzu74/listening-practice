import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import ExamTypeCard from '../components/ExamTypeCard';
import EXAM_TYPES from '../utils/examConfig';
import { getExamCount } from '../data/registry';
import styles from './HomePage.module.css';

const examTypeList = Object.values(EXAM_TYPES);

export default function HomePage() {
  const navigate = useNavigate();

  const handleClick = (et) => {
    if (et.comingSoon) return;
    if (et.externalUrl) {
      window.location.href = et.externalUrl;
    } else {
      navigate(`/${et.id}`);
    }
  };

  return (
    <div className={styles.page}>
      <Header showSubtitle />
      <div className={styles.list}>
        {examTypeList.map((et) => (
          <ExamTypeCard
            key={et.id}
            examType={et}
            count={getExamCount(et.id)}
            onClick={() => handleClick(et)}
          />
        ))}
      </div>
    </div>
  );
}
