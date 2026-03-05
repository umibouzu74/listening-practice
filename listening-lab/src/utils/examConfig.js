const EXAM_TYPES = {
  kyotsu: {
    id: "kyotsu",
    label: "共通テスト",
    icon: "📝",
    color: "#e94560",
    description: "大学入学共通テスト リスニング",
    groupBy: "year",
    sortOrder: "desc",
  },
  eiken: {
    id: "eiken",
    label: "英検",
    icon: "🏅",
    color: "#3498db",
    description: "実用英語技能検定 リスニング",
    groupBy: "grade",
    sortOrder: "asc",
    grades: { pre1: "準1級", 2: "2級", pre2: "準2級", 3: "3級" },
  },
  toeic: {
    id: "toeic",
    label: "TOEIC",
    icon: "🌐",
    color: "#e67e22",
    description: "TOEIC Listening 演習",
    groupBy: "none",
    sortOrder: "desc",
  },
  nyushi: {
    id: "nyushi",
    label: "高校入試",
    icon: "🏫",
    color: "#2ecc71",
    description: "公立高校入試 リスニング",
    groupBy: "prefecture",
    sortOrder: "asc",
  },
  custom: {
    id: "custom",
    label: "オリジナル教材",
    icon: "✏️",
    color: "#9b59b6",
    description: "オリジナル・その他のリスニング教材",
    groupBy: "none",
    sortOrder: "asc",
  },
};

export default EXAM_TYPES;

/**
 * 試験種別の設定オブジェクトを返す
 */
export function getExamType(examType) {
  return EXAM_TYPES[examType] || null;
}

/**
 * 試験種別のカラーコードを返す
 */
export function getExamColor(examType) {
  return EXAM_TYPES[examType]?.color || "#666666";
}

/**
 * 英検の級の日本語ラベルを返す
 */
export function getGradeLabel(grade) {
  return EXAM_TYPES.eiken.grades[grade] || grade;
}
