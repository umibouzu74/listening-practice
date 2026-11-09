# Listening Lab

英語リスニング演習アプリ（共通テスト・英検・TOEIC・高校入試・オリジナル教材対応）。
現在収録しているのは **英検準1級 2020年度第3回〜2025年度第2回（15回分）** のリスニングと、
**英検準1級 二次試験（面接）2017年度第3回〜2025年度第2回（24回分、各回 問題カード A・D）** です。
面接官の音声ファイルが入っているのは 2020年度第3回〜2025年度第2回の15回で、それより前の9回はブラウザの読み上げで流します。

## 主な機能

- 問題ごとの音声プレイヤー（速度変更・5秒送り/戻し・シーク）。複数の音声が同時に鳴らないよう自動で切り替え
- 英検 Part 2 のような「本文 + 複数設問」は、本文 → Q1 → Q2 を1本につないで連続再生
- 1問ずつモード（キー操作: ←/→ 移動, Space 再生/停止, 1〜4 選択, Enter 答え合わせ, Esc 閉じる）
- 答え合わせ後に解説・スクリプト・和訳（段落ごとの対訳）を表示
- 学習履歴（最高点・回数・前回間違えた問題）を端末に保存し、**間違えた問題だけを解き直す** ことができる
- 解答途中で戻ってしまっても、同じタブなら続きから再開
- **本番モード**: 説明 → 各問の音声を本番どおり1回ずつ止めずに流し、マークシート風の解答用紙で解答。終了後に採点
- **設問を隠す** 設定: 英検 Part 1・2 のように本番で印刷されない設問文を、答え合わせまで隠す（初期状態でオン。演習画面のボタンで切り替え、設定は端末に保存）
- 問題データは回ごとに分割して必要なときだけ読み込む（一覧画面は軽い目次だけで表示）

### 英検二次試験（面接）

- **本番形式**（`?mode=exam`）: 黙読1分 → ナレーション2分 → No.1 → カードを伏せる → No.2〜4 → 振り返り の順に本番どおり進む。
  面接官の指示・質問は音声ファイル（データの `cues` / `audio`）があれば再生し、なければブラウザの読み上げ（英語）で流す。質問文は画面に出さない。
  開始前に「入室・退室のやりとりも通す」をオンにすると、黙読の前に入室・名前・簡単な会話、No.4 のあとに退室のやりとり（面接官は合成音声）を入れる
- **練習形式**: ナレーション・No.1〜4 を1つずつ何度でもやり直せる。開始前の画面は「操作パネル → 問題カード → 使えるフレーズ」の順で、絵がすぐ見える
  - 質問文の表示（No.1〜4）は「音声のみ / 英文 / 英文＋和訳」から選ぶ。初めて使う人は「音声のみ」（本番どおり）で、回答中に「質問文を見る」で途中表示もできる。英文を表示する設定でも、面接官が質問し始めるまでは出さない
  - ナレーションは「準備時間1分をとる」をオンにすると、黙読1分（タイマーつき）から始められる
- 回答中は、ステップ名・録音の状態・タイマー・「終える」ボタンをヘッダーの下に固定する（絵を見るために下へスクロールしても見える。本番形式も同じ）
- **問題カードの絵の拡大**: 絵（または「拡大して見る」）をタップすると全画面で表示する。ピンチ・ダブルタップ・＋/− で拡大でき、
  「横一列 / 2×2 / 縦一列」に並べ替えられる（コマの位置は `INTERVIEW_CONFIG.cardPanels`）。× か Esc で閉じる。回答中はタイマーと「終える」ボタンも上部に出る
- **フレーズ**（まだ話せない人向けのヒント）: 「フレーズを表示」をオンにすると、答える前と答えている間に「使えるフレーズ」（その質問用 + どのカードでも使える基本の型）を出す。
  読み上げボタンで聞いてまねしてから答え、慣れたら「フレーズを見ずにもう一度」でヒントなしに挑戦する
- **基本フレーズ集**（`#/eiken/phrases`。英検の一覧の「面接」タブと、面接の回のカード一覧から開く）:
  入室〜退室のやりとり・ナレーション・No.1・No.2〜4・言葉に詰まったときの言い回しを区分ごとにまとめる。
  「続けて練習」で区分のフレーズを順に流し、音声のあとに続けて言う（リピート）。練習中は「練習を止める」を画面の下に固定する。
  「英語を隠す」をオンにすると、日本語を見て英語で言ったあとに音声で答えを確かめる練習になる。読み上げでは `...` や空の引用符は読まない
- 質問が終わると録音が始まり、「回答を終える」で次へ。経過時間が目安を超えると色が変わる。「質問をもう一度聞く」の間は録音を止める。ナレーションは2分で自動的に終わる
- 振り返り: ステップごとに自分の録音・質問・かんたん解答例・使えるフレーズ・模範解答・和訳・解説を並べる
  - 模範解答・かんたん解答例は「音声で聞く」でブラウザの合成音声で読み上げる（0.8x / 1.0x。読んでいる文をハイライト）
  - 自己採点（ナレーション 0〜15、No.1〜4 各 0〜5）は、観点にチェックするとチェックした割合から点数の目安が入る（点数ボタンで直せる）
  - 本番形式ではアティチュード（0〜3）も採点し、合計を本番と同じ 38 点満点で出す。合計の下に各パートへのジャンプ（採点済みかどうかつき）を置き、パートごとに折りたためる
- 自己採点・練習したパート・日時を端末に保存し、カード一覧（「3/5 パート」「済」・本番の最新点/最高点）と回の一覧に表示する。
  「済」は全パート（ナレーション・No.1〜4）を練習するか、本番形式を通したカード
- **録音はメモリ上だけで扱い、どこにも送信しない**。残したい録音は振り返りの「録音を保存」で端末にダウンロードできる。
  回答の途中や保存していない録音があるときに画面を離れようとすると（「＜」・ブラウザの戻る・URL の書き換え）、アプリ内の確認を出す（タブを閉じるときはブラウザの確認）。
  マイクが使えない・許可されない場合も、録音なしで流れとタイマーを練習できる
- 英検の一覧は「リスニング｜面接」のタブで切り替える（`?format=interview`。最後に選んだタブは端末に保存）
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
  "meta": { "title": "英検準1級 二次試験", "subtitle": "2024年度 第3回", "year": 2024, "grade": "pre1", "session": "2024-3" },
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
      // 任意。面接官の決まり文句の音声。なければ読み上げる
      "cues": {
        "prep": "audio/eiken/eiken-pre1-2024-3-interview/a-prep.mp3",              // Here's your card. …
        "narrationStart": "audio/eiken/eiken-pre1-2024-3-interview/a-narration.mp3", // Please begin your narration. …
        "qaIntro": "audio/eiken/eiken-pre1-2024-3-interview/a-intro.mp3",            // Now, I'm going to ask you four questions. …
        "turnOver": "audio/eiken/eiken-pre1-2024-3-interview/a-turnover.mp3"         // Please turn over the card …
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
          "audio": "audio/eiken/eiken-pre1-2024-3-interview/a-q1.mp3",   // 任意。面接官の質問の音声（Number 1. から）。なければ読み上げる
          "modelAnswer": "…", "modelAnswerJa": "…", "explanation": "…",
          "simpleAnswer": "…", "simpleAnswerJa": "…",   // 任意。かんたん解答例（模範解答より手前の目標）
          "phrases": [                                  // 任意。使えるフレーズ（同じ group は見出しにまとめる）
            { "group": "気持ち・反省", "en": "I should have told everyone to wear a suit.", "ja": "全員にスーツを着るよう伝えておくべきだった" }
          ]
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
| section の `cues` | 面接官の決まり文句の音声ファイル（任意。`prep` / `narrationStart` / `qaIntro` / `turnOver`）。ないものは `INTERVIEW_CONFIG.phrases` を読み上げる |
| `modelAnswer` / `modelAnswerJa` / `explanation` | 模範解答・和訳・解説（独自に作成する。欠けていると validate で警告） |
| `checkpoints` | カードごとの採点の観点（任意）。共通の観点は `examConfig.js` の `INTERVIEW_CONFIG.checkpoints` |
| `simpleAnswer` / `simpleAnswerJa` | かんたん解答例と和訳（任意）。模範解答をそのまま言えない人向けに、中学〜高校基礎の語彙・短い文で書く。振り返りで模範解答の前に出す |
| `phrases` | 使えるフレーズ（任意）。`[{ "group", "en", "ja" }]`。続けて並ぶ同じ `group` を1つの見出しにまとめる（ナレーションは「1コマ目」〜「4コマ目」、意見の質問は「Yes の理由」「No の理由」など）。練習形式で「フレーズを表示」をオンにしたときと振り返りに出し、`en` は読み上げボタンで流せる（空欄は `...` で書く） |

- 面接官の音声は `scripts/extract-interview-audio.js` で音源から切り出して `public/audio/eiken/{examId}/` に置く（`{カード}-prep` などの8本。無音を除くので1回 1〜3MB）。市販の模範ナレーションの音声（音源の `40_` `46_`）は入れない
- カード画像は `public/images/eiken/{examId}/` に置く。PDF から切り出す場合は 4コマ部分だけを JPEG にし、1枚数百KB以内に収める（元の PDF はリポジトリに入れない）
- 模範解答・和訳・解説・かんたん解答例・フレーズは独自に作成し、公式・市販の解答例を写さない
- どのカードでも使える「基本の型」（ナレーション / No.1 / 意見の質問 / 言葉に詰まったとき）は `src/utils/interviewPhrases.js` にまとめてある。`phrases` がない回でも、練習形式の「フレーズを表示」で基本の型は表示される。基本フレーズ集のページの区分（`PHRASE_BOOK`）も同じファイルにある
- 自己採点・練習回数は localStorage の `listening-lab-interview-history` に保存する（リスニングの履歴 `listening-lab-history` とは別）。
  形式は `src/utils/interviewHistory.js` の先頭のコメントを参照（項目を足すときは、古い記録もそのまま読めるようにする）
- 表示設定は `listening-lab-pref:{名前}` に保存する（`interviewShowPrompt` / `interviewShowTranslation`（2つで質問文の表示を表す）/ `interviewShowPhrases` /
  `interviewNarrationPrep` / `interviewExamTalk` / `cardViewLayout` / `modelAnswerSpeed` / `phraseBookHideEnglish` / `examListFormat:{examType}`）。
  同じオリジンの別アプリも localStorage を使うので、`localStorage.clear()` は使わない

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run validate` | JSON の必須項目・正解ラベル・音声/画像ファイルの存在をチェック（CI でも実行）。面接形式ではカード・ナレーション・No.1〜4 の質問文をチェックし、模範解答の欠落や面接官の音声が一部だけの場合は警告にする |
| `npm run scan-audio` | 音声ファイルと JSON の参照の対応を一覧表示（`-- --fix` でパスの自動修正） |
| `node scripts/excel-to-json.js <file.xlsx>` | Excel テンプレートから JSON を生成（`npm i -D xlsx` が必要） |
| `node scripts/extract-interview-audio.js <音源のルート> [--session 2024-3]` | 面接の音源（`j1q_YYYY_NN` が並ぶフォルダを指定）から面接官の発話を切り出し、JSON に `cues` / `audio` を書き込む（`npm i --no-save mpg123-decoder` が必要） |
