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

const PREFECTURE_LABELS = {
  hokkaido: "北海道", aomori: "青森県", iwate: "岩手県", miyagi: "宮城県",
  akita: "秋田県", yamagata: "山形県", fukushima: "福島県", ibaraki: "茨城県",
  tochigi: "栃木県", gunma: "群馬県", saitama: "埼玉県", chiba: "千葉県",
  tokyo: "東京都", kanagawa: "神奈川県", niigata: "新潟県", toyama: "富山県",
  ishikawa: "石川県", fukui: "福井県", yamanashi: "山梨県", nagano: "長野県",
  gifu: "岐阜県", shizuoka: "静岡県", aichi: "愛知県", mie: "三重県",
  shiga: "滋賀県", kyoto: "京都府", osaka: "大阪府", hyogo: "兵庫県",
  nara: "奈良県", wakayama: "和歌山県", tottori: "鳥取県", shimane: "島根県",
  okayama: "岡山県", hiroshima: "広島県", yamaguchi: "山口県", tokushima: "徳島県",
  kagawa: "香川県", ehime: "愛媛県", kochi: "高知県", fukuoka: "福岡県",
  saga: "佐賀県", nagasaki: "長崎県", kumamoto: "熊本県", oita: "大分県",
  miyazaki: "宮崎県", kagoshima: "鹿児島県", okinawa: "沖縄県",
};

/**
 * 都道府県の日本語ラベルを返す
 */
export function getPrefectureLabel(key) {
  return PREFECTURE_LABELS[key] || key;
}
