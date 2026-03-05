# Listening Lab

英語リスニング演習アプリ（共通テスト・英検・TOEIC・高校入試・オリジナル教材対応）

## 開発

```bash
npm install
npm run dev
```

## デプロイ

```bash
npm run build
npm run deploy
```

## 音声ファイルの追加

`public/audio/{examType}/{examId}/` に MP3 ファイルを配置

## 問題データの追加

1. `src/data/{examType}/{examId}.json` を作成（統一フォーマットに従う）
2. `src/data/registry.js` にインポートを追加

## 統一JSONフォーマット

```json
{
  "examType": "kyotsu | eiken | toeic | nyushi | custom",
  "examId": "試験ID",
  "title": "試験タイトル",
  "sections": [
    {
      "sectionId": "セクションID",
      "title": "セクションタイトル",
      "questions": [
        {
          "questionId": "問題ID",
          "audioFile": "音声ファイルパス",
          "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
          "correctAnswer": 0
        }
      ]
    }
  ]
}
```

## 対応試験

- 共通テスト（本試・追試）
- 英検（準1級〜3級）
- TOEIC Listening
- 高校入試
- オリジナル教材
