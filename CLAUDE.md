# Listening Lab

英語リスニング演習の統合Webアプリ。共通テスト・英検・TOEIC・高校入試・オリジナル教材に対応。
React + Vite で構築し、GitHub Pages にデプロイする静的サイト。

## Project Status

プロジェクトは仕様策定フェーズ。`listening-lab-spec-v2.md` に詳細仕様書がある。
ソースコードはまだ未作成で、仕様書内の Step 0〜9 に従って段階的に構築する。

## Tech Stack

- React 18+ / Vite
- React Router v6 (HashRouter)
- HTML5 Audio API
- CSS Modules（Tailwind不使用）
- localStorage（学習履歴）
- GitHub Pages + gh-pages パッケージ

## Data Architecture

- 全試験データは統一JSONフォーマットに従う（仕様書「統一JSONデータ仕様」参照）
- 試験種別(examType): `kyotsu` / `eiken` / `toeic` / `nyushi` / `custom`
- 階層: ExamType → ExamSet → Section → Question
- データファイル: `src/data/{examType}/{examId}.json`
- 音声ファイル: `public/audio/{examType}/{examId}/`
- レジストリ: `src/data/registry.js` で全試験データを集約・エクスポート

## Target Directory Structure

```
listening-lab/
├── public/
│   └── audio/                    # 音声ファイル（試験種別ごとにサブディレクトリ）
│       ├── kyotsu/
│       ├── eiken/
│       ├── toeic/
│       ├── nyushi/
│       └── custom/
├── src/
│   ├── components/               # 再利用可能なUIコンポーネント
│   │   ├── AudioPlayer.jsx
│   │   ├── QuestionCard.jsx
│   │   ├── ScoreBanner.jsx
│   │   ├── Header.jsx
│   │   ├── ExamTypeCard.jsx
│   │   ├── ExamSetCard.jsx
│   │   └── SectionListItem.jsx
│   ├── pages/                    # ページコンポーネント
│   │   ├── HomePage.jsx          # 試験種別選択
│   │   ├── ExamListPage.jsx      # 試験セット一覧
│   │   ├── SectionsPage.jsx      # セクション選択
│   │   └── PracticePage.jsx      # 演習画面
│   ├── hooks/                    # カスタムフック
│   │   ├── useAudioPlayer.js     # 音声制御
│   │   └── useHistory.js         # 学習履歴
│   ├── utils/                    # 設定・ユーティリティ
│   │   ├── examConfig.js         # 試験種別ごとの設定・メタ情報
│   │   └── scoring.js            # 採点ロジック
│   ├── data/                     # 問題データJSON
│   │   ├── registry.js
│   │   ├── kyotsu/
│   │   ├── eiken/
│   │   ├── toeic/
│   │   ├── nyushi/
│   │   └── custom/
│   ├── styles/
│   │   └── global.css
│   ├── App.jsx
│   └── main.jsx
├── vite.config.js
├── package.json
└── CLAUDE.md
```

## Routing

```
#/                                → HomePage        試験種別選択
#/:examType                       → ExamListPage    試験セット一覧
#/:examType/:examId               → SectionsPage    セクション選択
#/:examType/:examId/:sectionId    → PracticePage    演習画面
```

## Conventions

- コンポーネントは関数コンポーネント + Hooks
- ファイル名: PascalCase（コンポーネント）、camelCase（hooks/utils）
- スタイリング: CSS Modules（各コンポーネントに `.module.css`）
- 試験種別ごとのカラーは `examConfig.js` で一元管理
- コミットメッセージは日本語OK

## Design System

- テーマ: ダークモード基調
- 背景: `linear-gradient(160deg, #0f0f1a 0%, #1a1a2e 40%, #16213e 100%)`
- 正解色: `#2ed573` / 不正解色: `#e94560`
- 日本語フォント: Noto Sans JP / 数字: JetBrains Mono
- レイアウト: max-width 520px, スマホファースト
- 試験種別カラー: kyotsu=#e94560, eiken=#3498db, toeic=#e67e22, nyushi=#2ecc71, custom=#9b59b6

## Build & Deploy Commands

```bash
npm install          # 依存パッケージインストール
npm run dev          # ローカル開発サーバー起動
npm run build        # プロダクションビルド
npm run deploy       # GitHub Pages にデプロイ (gh-pages -d dist)
```

## Adding Content

### 新しい問題データの追加

1. `src/data/{examType}/{examId}.json` を統一JSONフォーマットで作成
2. `src/data/registry.js` にインポートを追加

### 音声ファイルの追加

`public/audio/{examType}/{examId}/` にMP3ファイルを配置。命名規則:
- 共通テスト・入試: `section{N}_q{NN}.mp3`
- 英検・TOEIC: `part{N}_q{NN}.mp3`
- オリジナル: `unit{N}_q{NN}.mp3`
- 通し音声: `section{N}_full.mp3`

## Key Specification Reference

詳細な仕様は `listening-lab-spec-v2.md` を参照。特に:
- 統一JSONデータ仕様（フィールド定義）
- 試験種別設定（examConfig.js の構造）
- 画面遷移とルーティング
- デザイン方針（カラー、フォント、コンポーネントスタイル）
- 実装ステップ（Step 0〜9）
