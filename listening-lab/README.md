# Listening Lab

英語リスニング演習アプリ（共通テスト・英検・TOEIC・高校入試・オリジナル教材対応）。
現在収録しているのは **英検準1級 2023年度第1回〜2025年度第2回（8回分）** です。
2022年度の3回分は音声のみで選択肢・解答が未入力のため「準備中」として表示しています。

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
2. 音声ファイルを `public/audio/{examType}/{examId}/` に置く
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

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run validate` | JSON の必須項目・正解ラベル・音声ファイルの存在をチェック（CI でも実行） |
| `npm run scan-audio` | 音声ファイルと JSON の参照の対応を一覧表示（`-- --fix` でパスの自動修正） |
| `node scripts/excel-to-json.js <file.xlsx>` | Excel テンプレートから JSON を生成（`npm i -D xlsx` が必要） |
