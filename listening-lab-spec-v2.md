# Listening Lab — プロジェクト仕様書 v2（多テスト対応版）

英語リスニング演習の統合Webアプリ。  
共通テスト・英検・TOEIC・高校入試・独自教材など複数の試験形式に対応。  
GitHub Pages でホスティングし、スマホ・PCからアクセスできる静的サイトとして構築する。

---

## 技術スタック

| 項目 | 選定 |
|------|------|
| フレームワーク | React 18+ (Vite) |
| スタイリング | CSS Modules（Tailwindは不使用） |
| ルーティング | React Router v6 (HashRouter) |
| 音声再生 | HTML5 Audio API |
| データ管理 | 静的JSONファイル（src/data/） |
| 学習履歴 | localStorage（将来的にIndexedDB移行も検討） |
| ホスティング | GitHub Pages |
| デプロイ | gh-pages パッケージ |

---

## 対応試験と階層構造

### 試験カテゴリ一覧

| examType | 表示名 | 階層の構成 | 備考 |
|----------|--------|-----------|------|
| `kyotsu` | 共通テスト | 年度 → 本試/追試 → 大問 | 第1問〜第6問、1回読み/2回読み |
| `eiken` | 英検 | 級 → 年度・回次 → Part | 準1級〜3級、Part 1〜4 |
| `toeic` | TOEIC | 回次/教材名 → Part | Part 1〜4 (Listening) |
| `nyushi` | 高校入試 | 都道府県 → 年度 → 大問 | 各県独自形式 |
| `custom` | オリジナル教材 | カテゴリ → 教材名 → セクション | 自作リスニング教材 |

### 統一データモデル概念図

```
ExamType (試験種別)
  └─ ExamSet (試験セット: 年度・級・回次などの組み合わせ)
      └─ Section (大問・Part)
          └─ Question (問題)
```

---

## ディレクトリ構成

```
listening-lab/
├── public/
│   └── audio/                          # 音声ファイル格納
│       ├── kyotsu/                     # 共通テスト
│       │   ├── 2025-honshi/
│       │   │   ├── section1_q01.mp3
│       │   │   └── ...
│       │   └── 2025-tsuishi/
│       │       └── ...
│       ├── eiken/                      # 英検
│       │   ├── pre1-2025-1/
│       │   │   └── ...
│       │   └── 2q-2025-1/
│       │       └── ...
│       ├── toeic/                      # TOEIC
│       │   └── practice01/
│       │       └── ...
│       ├── nyushi/                     # 高校入試
│       │   └── fukuoka-2025/
│       │       └── ...
│       └── custom/                     # オリジナル教材
│           └── my-course-01/
│               └── ...
├── src/
│   ├── data/
│   │   ├── registry.js                # 全試験データの集約・エクスポート
│   │   ├── kyotsu/
│   │   │   ├── 2025-honshi.json
│   │   │   └── 2025-tsuishi.json
│   │   ├── eiken/
│   │   │   ├── pre1-2025-1.json
│   │   │   └── 2q-2025-1.json
│   │   ├── toeic/
│   │   │   └── practice01.json
│   │   ├── nyushi/
│   │   │   └── fukuoka-2025.json
│   │   └── custom/
│   │       └── my-course-01.json
│   ├── components/
│   │   ├── AudioPlayer.jsx
│   │   ├── QuestionCard.jsx
│   │   ├── ScoreBanner.jsx
│   │   ├── SpeedControl.jsx
│   │   ├── Header.jsx
│   │   ├── ExamTypeCard.jsx           # 試験種別カード
│   │   ├── ExamSetCard.jsx            # 試験セットカード
│   │   └── SectionListItem.jsx        # セクションリスト項目
│   ├── pages/
│   │   ├── HomePage.jsx               # 試験種別選択
│   │   ├── ExamListPage.jsx           # 試験セット一覧
│   │   ├── SectionsPage.jsx           # セクション選択
│   │   └── PracticePage.jsx           # 演習画面
│   ├── hooks/
│   │   ├── useAudioPlayer.js          # 音声制御
│   │   └── useHistory.js              # 学習履歴
│   ├── utils/
│   │   ├── examConfig.js              # 試験種別ごとの設定・メタ情報
│   │   └── scoring.js                 # 採点ロジック
│   ├── styles/
│   │   └── global.css
│   ├── App.jsx
│   └── main.jsx
├── vite.config.js
├── package.json
├── CLAUDE.md
└── README.md
```

---

## 統一JSONデータ仕様

### 共通フォーマット

すべての試験種別が以下の共通構造に従う。  
試験ごとの違いは `meta` フィールドで吸収する。

```json
{
  "examType": "kyotsu",
  "examId": "kyotsu-2025-honshi",
  "meta": {
    "title": "令和7年度 共通テスト",
    "subtitle": "本試験",
    "year": 2025,
    "tags": ["共通テスト", "2025", "本試験"],
    "icon": "📝",
    "totalTime": 30,
    "description": "2025年1月実施の共通テスト英語リスニング本試験"
  },
  "sections": [
    {
      "id": "kyotsu-2025-honshi-s1",
      "title": "第1問",
      "subtitle": "短い対話（A・B）",
      "playCount": "1回読み",
      "audioFile": "audio/kyotsu/2025-honshi/section1_full.mp3",
      "instructions": "短い対話を聞き、最も適切な答えを1つ選びなさい。",
      "questions": [
        {
          "id": "kyotsu-2025-honshi-s1-q01",
          "questionNumber": 1,
          "audioFile": "audio/kyotsu/2025-honshi/section1_q01.mp3",
          "audioStart": null,
          "audioEnd": null,
          "prompt": "What will the woman probably do next?",
          "promptJa": null,
          "image": null,
          "choices": [
            "Go to the library",
            "Call her professor",
            "Submit the report online",
            "Ask her classmate for help"
          ],
          "answer": 2,
          "explanation": "女性は 'I'll just upload it from my laptop' と言っているので、オンラインで提出する。",
          "script": "M: Have you finished your report?\nW: Yes, but I can't find the submission box. I'll just upload it from my laptop."
        }
      ]
    }
  ]
}
```

### フィールド仕様

#### ルートレベル

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `examType` | string | ✅ | `kyotsu` / `eiken` / `toeic` / `nyushi` / `custom` |
| `examId` | string | ✅ | グローバルに一意なID |
| `meta` | object | ✅ | 試験のメタ情報（下記参照） |
| `sections` | array | ✅ | セクション配列 |

#### meta オブジェクト

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `title` | string | ✅ | メイン表示名（例: "令和7年度 共通テスト"） |
| `subtitle` | string | — | サブ表示（例: "本試験"、"第1回"） |
| `year` | number | — | 実施年度 |
| `tags` | string[] | — | 検索・フィルタ用タグ |
| `icon` | string | — | 絵文字アイコン |
| `grade` | string | — | 級（英検用: "pre1" / "2" / "pre2" / "3"） |
| `session` | string | — | 回次（英検用: "2025-1" / "2025-2"） |
| `prefecture` | string | — | 都道府県（高校入試用） |
| `totalTime` | number | — | 制限時間（分） |
| `description` | string | — | 詳細説明文 |

#### question オブジェクト

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `id` | string | ✅ | 一意な問題ID |
| `questionNumber` | number | ✅ | 表示用問題番号 |
| `audioFile` | string | ✅ | 音声ファイルパス |
| `audioStart` / `audioEnd` | number \| null | — | 音声内の区間指定（秒） |
| `prompt` | string | ✅ | 問題文（英語） |
| `promptJa` | string \| null | — | 問題文の日本語訳（入試等で日本語指示がある場合） |
| `image` | string \| null | — | 図表画像パス（第4問の図表等） |
| `choices` | string[] | ✅ | 選択肢（3択 or 4択） |
| `answer` | number | ✅ | 正解インデックス（0始まり） |
| `explanation` | string | — | 解説テキスト（日本語） |
| `script` | string \| null | — | 音声スクリプト（採点後に表示可能） |

---

## 試験種別ごとの設定: examConfig.js

```js
export const EXAM_TYPES = {
  kyotsu: {
    id: "kyotsu",
    label: "共通テスト",
    icon: "📝",
    color: "#e94560",
    description: "大学入学共通テスト リスニング",
    groupBy: "year",          // 一覧画面のグルーピング
    sortOrder: "desc",        // 新しい年度を上に
  },
  eiken: {
    id: "eiken",
    label: "英検",
    icon: "🏅",
    color: "#3498db",
    description: "実用英語技能検定 リスニング",
    groupBy: "grade",
    sortOrder: "asc",
    grades: {
      "pre1": "準1級",
      "2": "2級",
      "pre2": "準2級",
      "3": "3級"
    }
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
```

---

## 画面遷移とルーティング

```
#/                          → HomePage        試験種別を選ぶ
#/:examType                 → ExamListPage    その種別の試験セット一覧
#/:examType/:examId         → SectionsPage    セクション（大問/Part）選択
#/:examType/:examId/:sectionId → PracticePage 演習画面
```

### 1. ホーム画面（試験種別選択）

- 各試験種別を大きなカードで表示
- カードにはアイコン、名前、説明文、登録済みセット数を表示
- 登録済みデータがない種別はグレーアウト or 「準備中」表示
- 上部に検索バー（将来用、Phase 2）

### 2. 試験セット一覧（ExamListPage）

- 試験種別に応じたグルーピングで表示:
  - 共通テスト → 年度でグループ化（2025, 2024, ...）
  - 英検 → 級でグループ化（準1級, 2級, ...）、その中で年度・回次順
  - TOEIC → フラットリスト
  - 高校入試 → 都道府県でグループ化
  - オリジナル → フラットリスト
- 各カードに meta.title, meta.subtitle, セクション数, 問題数を表示

### 3. セクション選択画面（SectionsPage）

- セクションリスト表示（タイトル、サブタイトル、問題数、読み回数）
- セクション説明文（instructions）がある場合は表示
- 「全問通し演習」ボタン
- 制限時間がある場合（meta.totalTime）は「タイマー付き演習」ボタンも表示

### 4. 演習画面（PracticePage）

- 音声プレーヤー（AudioPlayer）
- 問題リスト（QuestionCard）
- 図表画像がある場合は問題内に表示
- 全問回答後:「解答する」ボタン
- 採点後:
  - ScoreBanner（正答数/総数/パーセント）
  - 各問題の正誤表示
  - 解説テキスト展開
  - スクリプト表示（あれば、トグルで表示）
  - 「もう一度」「セクション選択に戻る」ボタン

---

## 音声ファイル管理

### ディレクトリ規則

```
public/audio/{examType}/{examId}/
```

| 試験種別 | パス例 |
|---------|-------|
| 共通テスト 2025本試 | `audio/kyotsu/2025-honshi/section1_q01.mp3` |
| 英検2級 2025第1回 | `audio/eiken/2q-2025-1/part1_q01.mp3` |
| TOEIC 練習01 | `audio/toeic/practice01/part1_q01.mp3` |
| 福岡県入試 2025 | `audio/nyushi/fukuoka-2025/section1_q01.mp3` |
| オリジナル教材01 | `audio/custom/my-course-01/unit1_q01.mp3` |

### ファイル命名規則

```
section{N}_q{NN}.mp3      ← 共通テスト・入試
part{N}_q{NN}.mp3          ← 英検・TOEIC
unit{N}_q{NN}.mp3          ← オリジナル教材
section{N}_full.mp3        ← セクション通し音声（任意）
```

### 管理フロー（Google Drive併用）

```
Google Drive（原本管理）
  └─ Listening Lab/
      ├── 共通テスト/
      │   └── 2025本試/
      │       ├── section1_q01.mp3
      │       └── ...
      └── 英検/
          └── ...

          ↓ 手動コピー or スクリプト

GitHub リポジトリ（公開用）
  └─ public/audio/kyotsu/2025-honshi/
      ├── section1_q01.mp3
      └── ...
```

将来的にはGoogle Drive APIで自動同期するスクリプトも作れるが、  
まずは手動コピーで十分。

---

## デザイン方針

| 要素 | 仕様 |
|------|------|
| テーマ | ダークモード基調 |
| 背景 | `linear-gradient(160deg, #0f0f1a 0%, #1a1a2e 40%, #16213e 100%)` |
| メインアクセント | 試験種別ごとに変わる（examConfig.color） |
| 正解色 | #2ed573 |
| 不正解色 | #e94560 |
| 日本語フォント | Noto Sans JP |
| 数字・コード | JetBrains Mono |
| カード | 半透明背景 + 細ボーダー + border-radius 12-16px |
| レイアウト | max-width 520px, スマホファースト |

### 試験種別カラー

ホーム画面とヘッダーで、選択中の試験種別に応じてアクセントカラーが変わる:

| 種別 | カラー |
|------|--------|
| 共通テスト | #e94560（レッド） |
| 英検 | #3498db（ブルー） |
| TOEIC | #e67e22（オレンジ） |
| 高校入試 | #2ecc71（グリーン） |
| オリジナル | #9b59b6（パープル） |

---

## 学習履歴（localStorage）

### 保存データ構造

```json
{
  "history": {
    "kyotsu-2025-honshi-s1": {
      "lastAttempt": "2025-12-01T10:30:00",
      "attempts": 3,
      "bestScore": { "correct": 6, "total": 7 },
      "lastScore": { "correct": 5, "total": 7 }
    }
  }
}
```

- セクション単位で記録
- 最終挑戦日時、挑戦回数、最高スコア、直近スコアを保持
- ExamListPage / SectionsPage に進捗バッジを表示（「済」「最高 6/7」等）

---

## GitHub Pages デプロイ設定

### vite.config.js

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/listening-lab/',
})
```

### package.json scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "gh-pages -d dist"
  }
}
```

---

## 将来の拡張案（Phase 2 以降）

- セクション別・試験別の正答率グラフ（recharts）
- 誤答した問題だけの「復習モード」
- タイマー機能（本番と同じ制限時間で演習）
- 全文検索（問題文・解説を横断検索）
- PWA化（オフライン対応、音声キャッシュ）
- Google Drive API 連携（音声ファイル自動同期）
- データ入稿ツール（問題データJSON を GUI で作成）
- 印刷用ビュー（問題＋解答を紙で配布できる形式）

---
---

# Claude Code 用プロンプト集 v2

以下のプロンプトを **Step 0 → Step 9** の順に Claude Code で実行してください。  
各ステップが完了してから次に進むことを推奨します。

---

## Step 0: CLAUDE.md の作成

```
listening-lab プロジェクトの CLAUDE.md を以下の内容で作成してください:

# Listening Lab

英語リスニング演習の統合Webアプリ。共通テスト・英検・TOEIC・高校入試・オリジナル教材に対応。
React + Vite で構築し、GitHub Pages にデプロイする。

## Tech Stack
- React 18+ / Vite
- React Router v6 (HashRouter)
- HTML5 Audio API
- CSS Modules（Tailwind不使用）
- localStorage（学習履歴）
- GitHub Pages (gh-pages)

## Data Architecture
- 全試験データは統一JSONフォーマットに従う
- 試験種別(examType): kyotsu / eiken / toeic / nyushi / custom
- 階層: ExamType → ExamSet → Section → Question
- データファイル: src/data/{examType}/{examId}.json
- 音声ファイル: public/audio/{examType}/{examId}/

## Conventions
- コンポーネントは関数コンポーネント + Hooks
- ファイル名: PascalCase（コンポーネント）、camelCase（hooks/utils）
- 試験種別ごとのカラーは examConfig.js で一元管理
- ルーティング: #/:examType/:examId/:sectionId
- コミットメッセージは日本語OK

## Structure
- src/components/ : 再利用可能なUIコンポーネント
- src/pages/ : ページコンポーネント
- src/hooks/ : カスタムフック
- src/data/ : 問題データJSON（試験種別ごとにサブディレクトリ）
- src/utils/ : 設定・ユーティリティ
- public/audio/ : 音声ファイル（試験種別ごとにサブディレクトリ）
```

---

## Step 1: プロジェクト初期化

```
Vite + React プロジェクトを listening-lab として初期化してください。

1. npm create vite@latest listening-lab -- --template react
2. cd listening-lab && npm install
3. 追加パッケージ:
   - react-router-dom
   - gh-pages (devDependency)
4. vite.config.js に base: '/listening-lab/' を設定
5. package.json に "deploy": "gh-pages -d dist" を追加
6. 不要な初期ファイル（App.css の中身、logo等）をクリーンアップ
7. git init して初回コミット

ディレクトリ構成:
src/
├── components/
├── pages/
├── hooks/
├── utils/
├── data/
│   ├── kyotsu/
│   ├── eiken/
│   ├── toeic/
│   ├── nyushi/
│   ├── custom/
│   └── registry.js
├── styles/
│   └── global.css
├── App.jsx
└── main.jsx
public/
└── audio/
    ├── kyotsu/
    ├── eiken/
    ├── toeic/
    ├── nyushi/
    └── custom/

各 audio サブディレクトリに .gitkeep を置いてください。
```

---

## Step 2: 試験種別設定とデータレジストリ

```
試験種別の設定とデータ管理の基盤を作成してください。

### src/utils/examConfig.js

試験種別の設定オブジェクトを定義:

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
    grades: { "pre1": "準1級", "2": "2級", "pre2": "準2級", "3": "3級" },
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

ヘルパー関数も追加:
- getExamType(examType) → 設定オブジェクトを返す
- getExamColor(examType) → カラーコードを返す
- getGradeLabel(grade) → 英検の級の日本語ラベルを返す

### src/data/registry.js

全試験データを集約するレジストリ:
- data/{examType}/ 配下の全JSONをインポート
- examType ごとにグルーピングして export
- getExamSets(examType) → そのタイプの全試験セットを返す
- getExamSet(examId) → 特定の試験セットを返す
- getSection(examId, sectionId) → 特定のセクションを返す
- 試験種別ごとの件数を返す getExamCount(examType)

最初はデータが空でもエラーにならないようにしてください。
```

---

## Step 3: サンプル問題データ作成

```
サンプルデータを3種類作成してください。

### 1. src/data/kyotsu/2025-honshi.json
共通テスト 2025年度 本試験:
- examType: "kyotsu", examId: "kyotsu-2025-honshi"
- meta: { title: "令和7年度 共通テスト", subtitle: "本試験", year: 2025, icon: "📝", totalTime: 30 }
- 第1問〜第6問の6セクション、各2〜3問のダミー問題
- 第1問〜第4問は playCount: "1回読み"、第5問〜第6問は "2回読み"
- 問題文は英語、選択肢は英語（第3問のみ3択、他は4択）
- 解説は日本語、script フィールドも含める

### 2. src/data/eiken/2q-2025-1.json
英検2級 2025年度第1回:
- examType: "eiken", examId: "eiken-2q-2025-1"
- meta: { title: "英検2級", subtitle: "2025年度 第1回", year: 2025, grade: "2", session: "2025-1", icon: "🏅" }
- Part 1（会話の応答）〜Part 2（会話の内容一致）の2セクション、各2問
- 全問 playCount: "1回読み"

### 3. src/data/nyushi/fukuoka-2025.json
福岡県公立高校入試 2025年度:
- examType: "nyushi", examId: "nyushi-fukuoka-2025"
- meta: { title: "福岡県公立高校入試", subtitle: "2025年度", year: 2025, prefecture: "fukuoka", icon: "🏫" }
- 2セクション、各2問
- promptJa（日本語の問題指示）を含める

音声パスはそれぞれの規則に従う（ファイルはまだなくてOK）。
registry.js を更新して全データをインポート・エクスポートしてください。
```

---

## Step 4: デザインシステム

```
src/styles/global.css にアプリ全体のデザイントークンとベーススタイルを定義してください。

CSS カスタムプロパティ:
--color-bg-primary: #0f0f1a
--color-bg-secondary: #1a1a2e
--color-bg-tertiary: #16213e
--color-bg-card: rgba(255,255,255,0.04)
--color-border: rgba(255,255,255,0.08)
--color-border-hover: rgba(255,255,255,0.15)
--color-accent: #e94560  （デフォルト、試験種別で上書き可能にする）
--color-correct: #2ed573
--color-incorrect: #e94560
--color-warning: #ffa502
--color-text-primary: rgba(255,255,255,0.9)
--color-text-secondary: rgba(255,255,255,0.6)
--color-text-muted: rgba(255,255,255,0.35)
--font-sans: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif
--font-mono: 'JetBrains Mono', monospace
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 16px
--max-width: 520px

Google Fonts の読み込み（Noto Sans JP: 300,400,500,600,700 + JetBrains Mono: 400,600,700）

背景: body に linear-gradient(160deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 40%, var(--color-bg-tertiary) 100%)

リセットCSS、ボックスサイジング、スクロールバーのスタイリングも含む。
スマホファースト、タッチターゲット最小44px。
```

---

## Step 5: 共通コンポーネント

```
以下のコンポーネントを作成してください。すべてCSS Modulesでスタイリング。

### Header.jsx
- sticky ヘッダー、backdrop-filter: blur(20px)
- 左: 戻るボタン（ホーム以外で表示、props: onBack）
- 中央: ヘッドフォンSVGアイコン + 「Listening Lab」
- アクセントカラーを props で受け取り、アイコンの色に反映
- ホーム画面ではサブタイトル「英語リスニング演習」を表示

### AudioPlayer.jsx
- useAudioPlayer フック（Step 6で作成）を使用
- 再生/一時停止ボタン（丸型、shadow付き）
- プログレスバー（クリック/タップでシーク可能）
- 経過時間 / 全体時間（JetBrains Mono）
- リセットボタン
- 再生速度: [0.75, 1.0, 1.25, 1.5]
- props: src, disabled, accentColor
- 音声ファイル未設定/読み込みエラー時のフォールバック表示（「音声ファイルが設定されていません」）

### QuestionCard.jsx
- 問題番号バッジ（アクセントカラー）+ playCount ラベル
- promptJa がある場合は日本語指示も表示
- 英語の問題文
- image がある場合は図表画像を表示
- 選択肢ボタン（番号付き丸 + テキスト）
- 選択時: アクセントカラー強調
- 採点後: 正解=緑チェック、不正解=赤×
- 採点後に解説テキスト展開
- 採点後に script がある場合「スクリプトを表示」トグル
- props: question, userAnswer, showResult, onAnswer, accentColor

### ScoreBanner.jsx
- 正答数/総数 + パーセント
- 色: 80%↑=緑, 50-79%=黄, 49%↓=赤
- props: correct, total

### ExamTypeCard.jsx
- 試験種別カードコンポーネント（ホーム画面用）
- アイコン（絵文字）、ラベル、説明文、登録件数
- カードのホバー/タップで border が examType の color に変わる
- データが0件の場合はグレーアウト + 「準備中」
- props: examType (config object), count, onClick

### ExamSetCard.jsx
- 試験セットのカード（一覧画面用）
- meta.title, meta.subtitle, セクション数, 総問題数
- 学習履歴がある場合は進捗バッジ表示（将来用、今はスキップ可）
- props: examSet, accentColor, onClick

### SectionListItem.jsx
- セクション選択画面の行アイテム
- title, subtitle, 問題数, playCount
- props: section, accentColor, onClick
```

---

## Step 6: カスタムフック

```
2つのカスタムフックを作成してください。

### src/hooks/useAudioPlayer.js

HTML5 Audio API をラップ:

const {
  isPlaying,       // boolean
  currentTime,     // number (秒)
  duration,        // number (秒)
  progress,        // number (0-100)
  playbackRate,    // number
  isLoaded,        // boolean
  error,           // string | null
  play,            // () => void
  pause,           // () => void
  toggle,          // () => void
  seek,            // (time: number) => void
  seekByPercent,   // (percent: number) => void
  setSpeed,        // (rate: number) => void
  reset,           // () => void
} = useAudioPlayer(src);

要件:
- src 変更時に Audio を再生成
- アンマウント時にクリーンアップ
- loadedmetadata / timeupdate / ended / error をハンドル
- ファイル不在時は error にメッセージ設定
- ended で isPlaying を false に

### src/hooks/useHistory.js

localStorage で学習履歴を管理:

const {
  getRecord,       // (sectionId: string) => HistoryRecord | null
  saveRecord,      // (sectionId: string, score: {correct, total}) => void
  getAllRecords,    // () => Record<string, HistoryRecord>
  clearAll,        // () => void
} = useHistory();

HistoryRecord:
{
  lastAttempt: string (ISO日時),
  attempts: number,
  bestScore: { correct: number, total: number },
  lastScore: { correct: number, total: number },
}

localStorage キー: "listening-lab-history"
```

---

## Step 7: ページコンポーネントとルーティング

```
React Router (HashRouter) でページ構成を作成してください。

### ルーティング (App.jsx)
- #/ → HomePage
- #/:examType → ExamListPage
- #/:examType/:examId → SectionsPage
- #/:examType/:examId/:sectionId → PracticePage

### HomePage.jsx
- EXAM_TYPES と registry から各種別の登録件数を取得
- ExamTypeCard を5つ並べる
- 件数0の種別もグレーアウトで表示（「準備中」）
- タップで #/:examType へ遷移

### ExamListPage.jsx
- URL の examType から EXAM_TYPES の config を取得
- registry から該当 examType の全 examSet を取得
- groupBy に応じてグルーピング表示:
  - "year" → 年度見出し付きリスト
  - "grade" → 級見出し付きリスト（英検）
  - "prefecture" → 都道府県見出し付きリスト
  - "none" → フラットリスト
- ヘッダーのアクセントカラーを examType の color に

### SectionsPage.jsx
- URL の examId から試験セットデータを取得
- セクション一覧を SectionListItem で表示
- instructions がある場合はセクション上部に表示
- 「全問通し演習」ボタン（sectionId="all"）
- meta.totalTime がある場合「本番形式（タイマー付き）」ボタン（Phase 2表記でOK）

### PracticePage.jsx
- URL から examType, examId, sectionId を取得
- sectionId="all" の場合は全セクションの問題を結合
- 試験種別の accentColor を各コンポーネントに渡す
- AudioPlayer → QuestionCard リスト → 解答ボタン
- 採点後: ScoreBanner + 正誤 + 解説 + スクリプト
- useHistory で履歴を保存
- 「もう一度」「セクション選択に戻る」ボタン
```

---

## Step 8: GitHub Pages デプロイ設定と README

```
デプロイ設定を完了させてください。

1. vite.config.js の base 確認
2. App.jsx で HashRouter を使用していることを確認
3. public/404.html を作成（SPAリダイレクト用）
4. .gitignore に node_modules, dist を含める

5. README.md を作成:
# Listening Lab
英語リスニング演習アプリ（共通テスト・英検・TOEIC・高校入試・オリジナル教材対応）

## 開発
npm install
npm run dev

## デプロイ
npm run build
npm run deploy

## 音声ファイルの追加
public/audio/{examType}/{examId}/ に MP3 ファイルを配置

## 問題データの追加
1. src/data/{examType}/{examId}.json を作成（統一フォーマットに従う）
2. src/data/registry.js にインポートを追加

## 統一JSONフォーマット
（簡潔に構造を記載）

## 対応試験
- 共通テスト（本試・追試）
- 英検（準1級〜3級）
- TOEIC Listening
- 高校入試
- オリジナル教材
```

---

## Step 9: 動作確認と修正

```
npm run dev でローカル開発サーバーを起動して、以下を確認・修正してください。

チェックリスト:
□ ホーム画面で5つの試験種別カードが表示される
□ データのある種別（共通テスト・英検・高校入試）のカードがクリックできる
□ データのない種別（TOEIC・オリジナル）はグレーアウト/準備中表示
□ 共通テスト → 試験セット一覧が年度順で表示される
□ 英検 → 級でグルーピングされて表示される
□ 高校入試 → 都道府県で表示される
□ 試験セットをクリックしてセクション選択画面に遷移する
□ セクションをクリックして演習画面に遷移する
□ 音声プレーヤーが表示される（音声なしでもエラーにならない）
□ 選択肢をタップして選択状態が反映される
□ 全問回答で「解答する」ボタンが有効になる
□ 採点後にスコア・正誤・解説が表示される
□ スクリプト表示トグルが動作する
□ 「もう一度」で状態リセットされる
□ 戻るボタンが全画面で正しく動作する
□ 各試験種別でアクセントカラーが正しく変わる
□ スマホサイズ (375px幅) で表示崩れがない
□ HashRouter でページ遷移が正しく動く

問題があれば修正してください。
```

---

## 運用プロンプト集

### 新しい試験セットを追加する

```
新しい問題データを追加します。

ファイル: src/data/{examType}/{examId}.json を作成してください。

以下の情報を元に統一JSONフォーマットで作成:
- examType: "..."
- examId: "..."
- meta: { title: "...", subtitle: "...", year: ..., ... }
- 問題情報:
（...ここに問題文・選択肢・正解・解説を貼り付け...）

作成後、src/data/registry.js にインポートを追加してください。
```

### 音声ファイルを紐づける

```
public/audio/{examType}/{examId}/ にMP3ファイルを配置しました。
JSONデータの audioFile パスを実際のファイル名と一致するよう更新してください。

配置ファイル一覧:
（...ファイル名を列挙...）
```

### 問題データを一括入稿する（テキストから）

```
以下のテキスト（問題用紙のテキスト起こし）から、
統一JSONフォーマットの問題データを生成してください。

試験種別: 共通テスト
年度: 2024
タイプ: 本試験

---
（...問題テキストを貼り付け...）
---

選択肢・正解・解説も含めてJSONを出力してください。
出力先: src/data/kyotsu/2024-honshi.json
registry.js も更新してください。
```
