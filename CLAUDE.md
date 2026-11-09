# Listening Lab

英語リスニング演習の統合Webアプリ。共通テスト・英検・TOEIC・高校入試・オリジナル教材に対応。
英検準1級は二次試験（面接）の練習（録音・読み上げ・自己採点）にも対応。
React + Vite で構築し、GitHub Pages にデプロイする。

## Tech Stack
- React 19 / Vite 7（アプリ本体は listening-lab/ 配下）
- React Router v7（createHashRouter。離脱の確認に useBlocker を使う）
- HTML5 Audio API
- CSS Modules（Tailwind不使用）
- localStorage（学習履歴）/ sessionStorage（解答途中の状態）
- GitHub Pages（GitHub Actions で main への push 時に自動デプロイ）

## Data Architecture
- 全試験データは統一JSONフォーマットに従う
- 試験種別(examType): kyotsu / eiken / toeic / nyushi / custom
- 階層: ExamType → ExamSet → Section → Question
- データファイル: src/data/{examType}/*.json（自動登録。registry の手動更新は不要）
  - 一覧用の目次は vite.config.js の exam-index プラグイン（virtual:exam-index）がビルド時に生成
  - 問題本文は回ごとに別チャンク。演習画面では hooks/useExamSet.js で非同期に読み込む
- 音声ファイル: public/audio/{examType}/{examId}/
- データ形式の詳細は listening-lab/README.md を参照（answer は choices[].label の文字列）
- 未完成の回は meta.status = "draft" にする（一覧で「準備中」表示・演習不可）
- データを追加・修正したら `npm run validate`（listening-lab/ で実行）でチェックする
- 英検二次試験（面接）は新しい examType を作らず、英検データのルートに "format": "interview" を付ける
  - Section = 問題カード1枚（card.image / instruction / firstSentence）、Question = ナレーション（type "narration"）と No.1〜4（type "qa"）
  - カード画像: public/images/{examType}/{examId}/（PDF から切り出す場合は JPEG で1枚数百KB以内。元の PDF はコミットしない）
  - 面接官の音声: section.cues（決まり文句）と q.audio（質問）。public/audio/{examType}/{examId}/ に scripts/extract-interview-audio.js で切り出して置く。ない回は読み上げで流れる。市販の模範ナレーションの音声は入れない
  - 模範解答・和訳・解説は独自に作成し、公式・市販の解答例を写さない
  - 任意で simpleAnswer / simpleAnswerJa（かんたん解答例）と phrases（使えるフレーズ。[{ group, en, ja }]）を付けられる。これも独自に作成する
  - 形式の詳細は listening-lab/README.md の「面接形式（英検二次試験）」

## Conventions
- コンポーネントは関数コンポーネント + Hooks
- ファイル名: PascalCase（コンポーネント）、camelCase（hooks/utils）
- 試験種別ごとのカラーは examConfig.js で一元管理
- 音声再生は hooks/useAudioPlayer.js（単一・連続再生の両対応）に集約。UI は AudioPlayer（大）/ MiniAudioPlayer（小）/ SeekBar を使う
- 問題の表示（状況文・設問・選択肢・解説・スクリプト）は components/QuestionBody.jsx に集約
- 面接（二次試験）
  - 練習形式 pages/InterviewPracticePage.jsx、本番形式 pages/InterviewExamPage.jsx（PracticeRoute が format で振り分ける）
  - 録音は hooks/useRecorder.js（MediaRecorder）に集約。録音はメモリ上の blob: URL だけで扱い、送信・保存しない
  - 英文の読み上げは utils/speech.js（speechSynthesis）。音声プレイヤーと同じく claimPlayback に参加させる
  - 面接官の発話（音声ファイル or 読み上げ）は hooks/useQuestionAudio.js + utils/interview.js の runCue を使う。audio 要素を1つ使い回すので、開始ボタンのクリック処理で unlock() を呼ぶ（iPhone 対策）。速度設定は受け継がず常に等倍
  - 時間の目安・決まり文句（読み上げ用）・共通の採点観点は examConfig.js の INTERVIEW_CONFIG
  - どのカードでも使える基本の型（フレーズ）は utils/interviewPhrases.js。フレーズの一覧は components/PhraseList.jsx（読み上げボタン付き）、練習形式のヒント欄は components/PhraseHints.jsx
  - 基本フレーズ集のページは pages/PhraseBookPage.jsx（内容は interviewPhrases.js の PHRASE_BOOK）。入口は components/PhraseBookLink.jsx
  - 自己採点・練習回数は utils/interviewHistory.js（localStorage の別キー）。リスニングの history.js とは混ぜない
    - 形式を変えるときは古い記録もそのまま読めるようにする（項目の追加は可。practiceSteps は後から足した項目）
    - 本番形式の合計はアティチュード込みの 38 点満点（examScoreParts）。古い回の total / maxTotal（35 点満点）はそのまま表示する
  - 画面を離れる確認は hooks/useLeaveGuard.js + hooks/useConfirm.jsx（アプリ内のダイアログ。window.confirm は使わない）
    - URL のハッシュの書き換えはルーターの useBlocker で止められないので、utils/popGate.js でルーターより先に popstate を受け取る（App.jsx で最初に import する）
  - 問題カードの絵の拡大表示は components/CardImageViewer.jsx（InterviewCard から開く）。コマの切り出し位置は INTERVIEW_CONFIG.cardPanels
  - 模範解答の読み上げは components/ReadAloud.jsx（speech.js の speakAll で1文ずつ）。speech.js は読み上げ前に「...」や空の引用符を除く（表示はそのまま）
  - オン・オフの切り替えは components/ToggleSwitch.jsx、いくつかから選ぶ切り替えは components/SegmentedControl.jsx
  - localStorage のキーは必ず listening-lab- で始める。同じオリジンの別アプリもあるので localStorage.clear() は使わない
- コミット前に `npm run lint` と `npm run build` が通ることを確認する
- ルーティング: #/:examType/:examId/:sectionId（sectionId=all で全問通し、?mode=wrong で前回間違えた問題のみ、?mode=exam で本番モード）
  - 面接の回は sectionId = 問題カードの id。?mode=exam で本番形式、なしで練習形式（all・wrong はない）
  - #/eiken/phrases は面接の基本フレーズ集（examId "phrases" は使わない）
- コミットメッセージは日本語OK

## Structure
- src/components/ : 再利用可能なUIコンポーネント
- src/pages/ : ページコンポーネント
- src/hooks/ : カスタムフック
- src/data/ : 問題データJSON（試験種別ごとにサブディレクトリ）
- src/utils/ : 設定・ユーティリティ（examConfig / audio / history / speech / interview / interviewHistory / interviewPhrases）
- scripts/ : データ検証などの Node スクリプト
- public/audio/ : 音声ファイル（試験種別ごとにサブディレクトリ）
- public/images/ : 画像（面接の問題カードなど。試験種別・回ごとにサブディレクトリ）
