// 英検二次試験（面接）の「基本の型」: どのカードでも使える短いフレーズ。
// 練習形式で「フレーズ」をオンにすると、カードごとのフレーズ（データの phrases）と一緒に表示する。
// 基本フレーズ集のページ（pages/PhraseBookPage.jsx）では、入室〜退室のやりとりも合わせてまとめて練習できる。
// 項目は { group, en, ja }。en は読み上げるので、空欄は「...」で書く（「~」「___」は読み上げが不自然になる）。
import { questionKind } from './interview';

const BASIC_PHRASES = {
  narration: {
    title: 'ナレーションの基本の型',
    phrases: [
      { group: '動作・様子を言う', en: 'He was talking to his wife.', ja: '彼は妻と話していた（動作は was / were + -ing）' },
      { group: '動作・様子を言う', en: 'She looked surprised.', ja: '彼女は驚いた様子だった（表情は looked + 気持ち）' },
      { group: '動作・様子を言う', en: 'There was a sign that said, "Closed."', ja: '「閉店」と書かれた看板があった（掲示や看板の文字）' },
      { group: '吹き出しのセリフを伝える', en: 'He told her that ...', ja: '彼は彼女に…と言った（時制を1つ過去にずらす）' },
      { group: '吹き出しのセリフを伝える', en: 'She suggested going to the beach.', ja: '彼女は海に行こうと提案した（Let\'s ... / Why don\'t we ...?）' },
      { group: '吹き出しのセリフを伝える', en: 'He asked her to help him.', ja: '彼は彼女に手伝ってほしいと頼んだ（Can you ...? / Please ...）' },
      { group: '考えの吹き出しを伝える', en: 'She was thinking about buying a new car.', ja: '彼女は新しい車を買おうかと考えていた' },
      { group: '考えの吹き出しを伝える', en: 'He was imagining living in the country.', ja: '彼は田舎で暮らすことを想像していた' },
      { group: '話をつなぐ', en: 'However, ...', ja: 'ところが…（話の流れが変わる最後のコマで）' },
      { group: '話をつなぐ', en: 'Because of this, ...', ja: 'そのため…' },
    ],
  },
  picture: {
    title: 'No.1 の基本の型',
    phrases: [
      { group: '答え始め（必ずこの形で）', en: 'I\'d be thinking, "..."', ja: '「…」と考えていると思います' },
      { group: '中身に使える形', en: 'I should have checked the weather.', ja: '天気を確認しておけばよかった（反省）' },
      { group: '中身に使える形', en: 'I\'m glad that everyone is happy.', ja: 'みんなが喜んでいてよかった（よかったこと）' },
      { group: '中身に使える形', en: 'It\'s too bad, but it can\'t be helped.', ja: '残念だけど、仕方がない' },
      { group: '中身に使える形', en: 'Next time, I\'ll be more careful.', ja: '次はもっと気をつけよう（これからどうするか）' },
    ],
  },
  opinion: {
    title: '意見を言うときの基本の型',
    phrases: [
      { group: '① 立場を言う', en: 'Yes, I think so.', ja: 'はい、そう思います' },
      { group: '① 立場を言う', en: 'No, I don\'t think so.', ja: 'いいえ、そうは思いません' },
      { group: '① 立場を言う', en: 'Yes, they should.', ja: 'はい、そうすべきです（Should ...? の質問に）' },
      { group: '② 理由を言う', en: 'This is because ...', ja: 'なぜなら…だからです' },
      { group: '② 理由を言う', en: 'For example, ...', ja: 'たとえば…' },
      { group: '② 理由を言う', en: 'Also, ...', ja: 'また…（2つ目の理由）' },
      { group: '③ まとめる', en: 'That\'s why I think so.', ja: 'だから、そう思います' },
      { group: '理由に困ったときのネタ', en: 'It costs a lot of money.', ja: 'お金がたくさんかかる' },
      { group: '理由に困ったときのネタ', en: 'It saves time.', ja: '時間の節約になる' },
      { group: '理由に困ったときのネタ', en: 'It is good for our health.', ja: '健康によい' },
      { group: '理由に困ったときのネタ', en: 'It is bad for the environment.', ja: '環境に悪い' },
      { group: '理由に困ったときのネタ', en: 'People can get information easily on the Internet.', ja: 'インターネットで簡単に情報が手に入る' },
      { group: '理由に困ったときのネタ', en: 'Many people are too busy these days.', ja: '最近は忙しすぎる人が多い' },
      { group: '理由に困ったときのネタ', en: 'Japan\'s population is getting older.', ja: '日本は高齢化が進んでいる' },
    ],
  },
};

// No.1〜4 で、言葉に詰まったとき・聞き取れなかったとき
const STUCK_PHRASES = [
  { group: '言葉に詰まったとき', en: 'Let me see.', ja: 'ええと（黙り込まずに考える時間をつなぐ）' },
  { group: '言葉に詰まったとき', en: 'That\'s a difficult question, but I think ...', ja: '難しい質問ですが、…だと思います' },
  { group: '言葉に詰まったとき', en: 'I\'m sorry. Could you say that again, please?', ja: 'すみません、もう一度言っていただけますか（質問が聞き取れなかったとき）' },
];

// 入室から退室までの決まったやりとり（受験者が言うこと）。基本フレーズ集にだけ出す
const FLOW_PHRASES = [
  { group: '入室・あいさつ', en: 'Good afternoon.', ja: 'こんにちは（入室したとき。午前なら Good morning.）' },
  { group: '入室・あいさつ', en: 'Here you are.', ja: 'どうぞ（面接カードを渡すとき）' },
  { group: '入室・あいさつ', en: 'Thank you.', ja: 'ありがとうございます（Please have a seat. と言われて座るとき）' },
  { group: '入室・あいさつ', en: 'My name is Yuki Tanaka.', ja: '私の名前は田中ゆきです（名前を聞かれたとき）' },
  { group: '入室・あいさつ', en: 'I\'m fine, thank you.', ja: '元気です、ありがとうございます（How are you? と聞かれたとき）' },
  { group: '最初の会話（自分のこと）', en: 'I\'m a high school student.', ja: '高校生です' },
  { group: '最初の会話（自分のこと）', en: 'I\'m in the tennis club at school.', ja: '学校でテニス部に入っています' },
  { group: '最初の会話（自分のこと）', en: 'I like reading books in my free time.', ja: '空いた時間に本を読むのが好きです' },
  { group: '最初の会話（自分のこと）', en: 'I came here by train.', ja: '電車でここに来ました' },
  { group: '退室', en: 'Sure. Here you are.', ja: 'はい、どうぞ（問題カードを返すとき）' },
  { group: '退室', en: 'Thank you. Goodbye.', ja: 'ありがとうございました。さようなら' },
  { group: '退室', en: 'Have a nice day.', ja: 'よい一日を（最後にひと言添えるなら）' },
];

/**
 * 基本フレーズ集（#/eiken/phrases）の内容。準1級の面接の流れに合わせて並べる（short は上部のジャンプ用の短い名前）。
 * grade の級の面接一覧に、フレーズ集へのリンクを出す。
 */
export const PHRASE_BOOK = {
  grade: 'pre1',
  title: '面接の基本フレーズ集',
  subtitle: '英検準1級 二次試験',
  sections: [
    {
      id: 'flow',
      title: '入室から退室まで',
      short: '入室〜退室',
      description: '面接の始めと終わりのやりとりです。どの回もほぼ同じ流れなので、まるごと覚えてしまいましょう。',
      phrases: FLOW_PHRASES,
    },
    {
      id: 'narration',
      title: 'ナレーション',
      short: 'ナレーション',
      description: '絵の人物の動作・セリフ・考えを伝える言い方です。話はすべて過去形・過去進行形で進めます。',
      phrases: BASIC_PHRASES.narration.phrases,
    },
    {
      id: 'picture',
      title: 'No.1（絵の人物の考え）',
      short: 'No.1',
      description: '「もしあなたがこの人物だったら、何を考えているか」に答える型です。',
      phrases: BASIC_PHRASES.picture.phrases,
    },
    {
      id: 'opinion',
      title: 'No.2〜4（意見を言う）',
      short: 'No.2〜4',
      description: '「立場 → 理由 → まとめ」の順に話します。理由が思いつかないときのネタも覚えておくと安心です。',
      phrases: BASIC_PHRASES.opinion.phrases,
    },
    {
      id: 'stuck',
      title: '言葉に詰まったとき',
      short: '詰まったとき',
      description: '黙り込むより、ひと言つないで話し続けましょう。',
      // 区分の名前と同じ見出しは出さない
      phrases: STUCK_PHRASES.map((p) => ({ en: p.en, ja: p.ja })),
    },
  ],
};

/** 質問の種類に合った基本の型（{ title, phrases }） */
export function basicPhrasesFor(q) {
  const kind = questionKind(q);
  const { title, phrases } = BASIC_PHRASES[kind];
  return { title, phrases: kind === 'narration' ? phrases : [...phrases, ...STUCK_PHRASES] };
}
