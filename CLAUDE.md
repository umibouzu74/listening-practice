# Listening Lab

英語リスニング演習の統合Webアプリ。共通テスト・英検・TOEIC・高校入試・オリジナル教材に対応。
React + Vite で構築し、GitHub Pages にデプロイする。

## Tech Stack
- React 19 / Vite 7（アプリ本体は listening-lab/ 配下）
- React Router v7 (HashRouter)
- HTML5 Audio API
- CSS Modules（Tailwind不使用）
- localStorage（学習履歴）/ sessionStorage（解答途中の状態）
- GitHub Pages（GitHub Actions で main への push 時に自動デプロイ）

## Data Architecture
- 全試験データは統一JSONフォーマットに従う
- 試験種別(examType): kyotsu / eiken / toeic / nyushi / custom
- 階層: ExamType → ExamSet → Section → Question
- データファイル: src/data/{examType}/*.json（import.meta.glob で自動登録。registry の手動更新は不要）
- 音声ファイル: public/audio/{examType}/{examId}/
- データ形式の詳細は listening-lab/README.md を参照（answer は choices[].label の文字列）
- 未完成の回は meta.status = "draft" にする（一覧で「準備中」表示・演習不可）
- データを追加・修正したら `npm run validate`（listening-lab/ で実行）でチェックする

## Conventions
- コンポーネントは関数コンポーネント + Hooks
- ファイル名: PascalCase（コンポーネント）、camelCase（hooks/utils）
- 試験種別ごとのカラーは examConfig.js で一元管理
- 音声再生は hooks/useAudioPlayer.js（単一・連続再生の両対応）に集約。UI は AudioPlayer（大）/ MiniAudioPlayer（小）/ SeekBar を使う
- 問題の表示（状況文・設問・選択肢・解説・スクリプト）は components/QuestionBody.jsx に集約
- コミット前に `npm run lint` と `npm run build` が通ることを確認する
- ルーティング: #/:examType/:examId/:sectionId（sectionId=all で全問通し、?mode=wrong で前回間違えた問題のみ）
- コミットメッセージは日本語OK

## Structure
- src/components/ : 再利用可能なUIコンポーネント
- src/pages/ : ページコンポーネント
- src/hooks/ : カスタムフック
- src/data/ : 問題データJSON（試験種別ごとにサブディレクトリ）
- src/utils/ : 設定・ユーティリティ（examConfig / audio / history）
- scripts/ : データ検証などの Node スクリプト
- public/audio/ : 音声ファイル（試験種別ごとにサブディレクトリ）
