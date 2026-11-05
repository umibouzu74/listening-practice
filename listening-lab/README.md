# Listening Lab

英語リスニング演習アプリ（共通テスト・英検・TOEIC・高校入試・オリジナル教材対応）。
現在収録しているのは **英検準1級 2020年度第3回〜2025年度第2回（15回分）** のリスニングと、
**英検準1級 二次試験（面接）2024年度第3回**（問題カード A・D、下書き）です。

## 主な機能

- 問題ごとの音声プレイヤー（速度変更・5秒送り/戻し・シーク）。複数の音声が同時に鳴らないよう自動で切り替え
- 英検 Part 2 のような「本文 + 複数設問」は、本文 → Q1 → Q2 を1本につないで連続再生
- 1問ずつモード（キー操作: ←/→ 移動, Space 再生/停止, 1〜4 選択, Enter 答え合わせ, Esc 閉じる）
- 答え合わせ後に解説・スクリプト・和訳（段落ごとの対訳）を表示
- 学習履歴（最高点・回数・前回間違えた問題）を端末に保存し、**間違えた問題だけを解き直す** ことができる
- 解答途中で戻ってしまっても、同じタブなら続きから再開
- **本番モード**: 説明 → 各問の音声を本番どおり1回ずつ止めずに流し、マークシート風の解答用紙で解答。終了後に採点
- **設問を隠す** 設定: 英検 Part 1・2 のように本番で印刷されない設問文を、答え合わせまで隠せる
- 問題データは回ごとに分割して必要なときだけ読み込む（一覧画面は軽い目次だけで表示）

### 英検二次試験（面接）

- **本番形式**（`?mode=exam`）: 黙読1分 → ナレーション2分 → No.1 → カードを伏せる → No.2〜4 → 振り返り の順に本番どおり進む。
  面接官の指示・質問は音声ファイル（データの `audio`）があれば再生し、なければブラウザの読み上げ（英語）で流す。質問文は画面に出さない
- **練習形式**: ナレーション・No.1〜4 を1つずつ何度でもやり直せる。質問文・和訳の表示/非表示を切り替えられる
- 質問が終わると録音が始まり、「回答を終える」で次へ。経過時間が目安を超えると色が変わる。「質問をもう一度聞く」の間は録音を止める
- 振り返り: ステップごとに自分の録音・質問・模範解答・和訳・解説を並べ、自己採点（ナレーション 0〜15、No.1〜4 各 0〜5）と観点のチェックリストを出す
- 自己採点・練習回数・日時を端末に保存し、カード一覧と回の一覧に表示する
- **録音はメモリ上だけで扱い、どこにも送信・保存しない**（画面を離れると消える）。マイクが使えない・許可されない場合も、録音なしで流れとタイマーを練習できる
- 時間の目安・面接官の決まり文句・共通の採点観点は `src/utils/examConfig.js` の `INTERVIEW_CONFIG` で調整する

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm run lint       # ESLint
npm run validate   # 問題データと音声ファイルの整合性チェック
npm run build      # 本番ビルド（dist/）
```

## デプロイ

`main` ブランチに push すると GitHub Actions（`.github/workflows/deploy.yml`）が
lint → データ検証 → ビルド → GitHub Pages へのデプロイ を自動で行います。
PR では同じチェック（デプロイなし）が `.github/workflows/ci.yml` で走ります。

## 問題データの追加

1. `src/data/{examType}/{任意の名前}.json` を作成する（下記フォーマット）
   - **JSON を置くだけで自動的にアプリに登録されます**（レジストリの手動更新は不要）
   - 一覧用の目次は `vite.config.js` の exam-index プラグインがビルド時に自動生成します
2. 音声ファイルを `public/audio/{examType}/{examId}/` に置く（面接のカード画像は `public/images/{examType}/{examId}/`）
3. `npm run validate` でエラーがないことを確認する

選択肢や解答がまだ入力できていない回は `meta.status` を `"draft"` にしておくと、一覧に「準備中」と表示され演習できなくなります。

## JSON フォーマット

```jsonc
{
  "examType": "eiken",               // kyotsu | eiken | toeic | nyushi | custom（ディレクトリ名と一致させる）
  "id": "eiken-pre1-2024-3",          // 全データで一意。URL にも使われる
  "meta": {
    "title": "英検準1級",
    "subtitle": "2024年度 第3回",
    "year": 2024,
    "grade": "pre1",                  // 英検の級: 1 / pre1 / 2 / pre2plus / pre2 / 3
    "session": "2024-3",              // 一覧の並び順に使う
    "totalTime": 29,                  // 目安時間（分）
    "status": "draft"                 // 任意。下書き（演習不可）にする場合のみ
  },
  "sections": [
    {
      "id": "part1",                  // "all" は全問通し演習用に予約済み
      "title": "Part 1",
      "description": "会話の応答 — …",
      "playCount": "1回読み",
      "instructionAudio": "audio/eiken/eiken-pre1-2024-3/01_Part1_explanation.mp3",
      "questions": [
        {
          "id": "q1",
          "number": 1,
          "audio": "audio/eiken/eiken-pre1-2024-3/02_No01.mp3",   // 本番モードでは解答時間の無音も含めて連続再生する
          "prompt": "Why is the woman annoyed?",
          "choices": [
            { "label": "1", "text": "The store clerk charged her too much." },
            { "label": "2", "text": "…" },
            { "label": "3", "text": "…" },
            { "label": "4", "text": "…" }
          ],
          "answer": "3",              // 正解の choices[].label
          "explanation": "解説（日本語）",
          "script": "W: …\nM: …",       // 改行区切り。W: / M: は話者として強調表示
          "scriptJa": "W: …\nM: …"      // script と同じ段落数にすると対訳がそろう
        }
      ]
    }
  ]
}
```

### 形式ごとの追加フィールド

| フィールド | 用途 |
|---|---|
| `passageAudio` / `passageLabel` | 本文音声と見出し（英検 Part 2 など）。同じ `passageAudio` を持つ連続した設問は1グループとして表示され、本文 → 各設問を連続再生する |
| `situation` / `situationJa` | Real-Life 形式（英検 Part 3）の状況文と和訳。英文がない場合は和訳を状況文として表示 |
| `promptJa` | 設問文の和訳（「和訳を表示」で表示） |
| （共通） | `situation` / `situationJa` がない問題の `prompt` は「本番では音声だけで読まれる設問」として扱われ、「設問を隠す」設定や本番モードで答え合わせまで非表示になる |
| `image` | 図表画像のパス（`public/` からの相対パス） |
| section の `audioFile` | セクション全体で1本の音声がある場合（共通テストなど） |

### 面接形式（英検二次試験）

JSON のルートに `"format": "interview"` を付けると面接形式として扱います（省略時はリスニング）。
新しい examType は作らず、英検（`eiken`）のデータとして `src/data/eiken/pre1-2024-3-interview.json` のように置きます。
階層は ExamSet = 「準1級 二次試験 ○年度第○回」、Section = 問題カード1枚、Question = ナレーションと No.1〜4 です。

```jsonc
{
  "examType": "eiken",
  "format": "interview",
  "id": "eiken-pre1-2024-3-interview",
  "meta": { "title": "英検準1級 二次試験", "subtitle": "2024年度 第3回", "year": 2024, "grade": "pre1", "session": "2024-3", "status": "draft" },
  "sections": [
    {
      "id": "a",                         // URL に使う（#/eiken/{examId}/a）
      "title": "問題カードA",
      "card": {
        "image": "images/eiken/eiken-pre1-2024-3-interview/card-a.jpg",   // 4コマのイラスト（public/ からの相対パス）
        // カードの指示文。「Your story should begin with the following sentence:」は画面側で表示するので書かない
        "instruction": "You have one minute to prepare.\nThis is a story about a CEO who wanted to cut down on running costs.\nYou have two minutes to narrate the story.",
        "firstSentence": "One day, a CEO was at her office."
      },
      "questions": [
        {
          "id": "narration", "type": "narration",
          "modelAnswer": "…", "modelAnswerJa": "…", "explanation": "…",
          "checkpoints": ["1コマ目: …"]          // 任意。カードごとの採点の観点
        },
        {
          "id": "q1", "number": 1, "type": "qa",
          "showCard": true,                       // カードを見て答える質問（準1級は No.1）。これ以降はカードを伏せる
          "prompt": "Please look at the fourth picture. If you were the CEO, what would you be thinking?",
          "promptJa": "…",
          "audio": "audio/…",                     // 任意。面接官の質問の音声。なければ読み上げる
          "modelAnswer": "…", "modelAnswerJa": "…", "explanation": "…"
        }
        // q2〜q4 も同じ形（showCard なし = カードを伏せた状態）
      ]
    }
  ]
}
```

| フィールド | 用途 |
|---|---|
| `card.image` / `card.instruction` / `card.firstSentence` | 問題カード（必須） |
| `type` | `"narration"`（1つ）か `"qa"`（No.1〜4 を1つずつ） |
| `prompt` / `promptJa` | 面接官の質問と和訳。本番形式では画面に出さず、音声または読み上げで流す |
| `audio` | 面接官の質問の音声ファイル（任意）。あれば「Number N.」の読み上げも含めてこの音声に任せる。再生できないときは読み上げに切り替える |
| `modelAnswer` / `modelAnswerJa` / `explanation` | 模範解答・和訳・解説（独自に作成する。欠けていると validate で警告） |
| `checkpoints` | カードごとの採点の観点（任意）。共通の観点は `examConfig.js` の `INTERVIEW_CONFIG.checkpoints` |

- カード画像は `public/images/eiken/{examId}/` に置く。PDF から切り出す場合は 4コマ部分だけを JPEG にし、1枚数百KB以内に収める（元の PDF はリポジトリに入れない）
- 模範解答・和訳・解説は独自に作成し、公式・市販の解答例を写さない
- 自己採点・練習回数は localStorage の `listening-lab-interview-history` に保存する（リスニングの履歴 `listening-lab-history` とは別）

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run validate` | JSON の必須項目・正解ラベル・音声/画像ファイルの存在をチェック（CI でも実行）。面接形式ではカード・ナレーション・No.1〜4 の質問文をチェックし、模範解答などの欠落は警告にする |
| `npm run scan-audio` | 音声ファイルと JSON の参照の対応を一覧表示（`-- --fix` でパスの自動修正） |
| `node scripts/excel-to-json.js <file.xlsx>` | Excel テンプレートから JSON を生成（`npm i -D xlsx` が必要） |
