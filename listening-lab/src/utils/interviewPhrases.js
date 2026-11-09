// 英検二次試験（面接）の「基本の型」: どのカードでも使える短いフレーズ。
// 練習形式で「フレーズ」をオンにすると、カードごとのフレーズ（データの phrases）と一緒に表示する。
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

/** 質問の種類に合った基本の型（{ title, phrases }） */
export function basicPhrasesFor(q) {
  const kind = questionKind(q);
  const { title, phrases } = BASIC_PHRASES[kind];
  return { title, phrases: kind === 'narration' ? phrases : [...phrases, ...STUCK_PHRASES] };
}
