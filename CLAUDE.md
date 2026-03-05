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
