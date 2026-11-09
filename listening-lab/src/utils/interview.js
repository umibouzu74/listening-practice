// 英検二次試験（面接）形式のデータを扱うユーティリティ
import { INTERVIEW_CONFIG } from './examConfig';
import { speak } from './speech';

/** カード1枚分の問題を「ナレーション → No.1 → … → No.4」の順で返す */
export function getInterviewSteps(section) {
  const questions = section?.questions || [];
  const narration = questions.find((q) => q.type === 'narration');
  const qas = questions.filter((q) => q.type === 'qa').sort((a, b) => a.number - b.number);
  return narration ? [narration, ...qas] : qas;
}

export function stepLabel(q) {
  return q.type === 'narration' ? 'ナレーション' : `No.${q.number}`;
}

/** 面接官が読み上げる質問（「Number 1. Please look at …」） */
export function spokenQuestion(q) {
  return `${INTERVIEW_CONFIG.phrases.questionNumber.replace('{n}', q.number)} ${q.prompt}`;
}

/** 回答時間の目安（秒）。ナレーションは制限時間 */
export function answerTargetSeconds(q) {
  if (q.type === 'narration') return INTERVIEW_CONFIG.narrationSeconds;
  return INTERVIEW_CONFIG.answerTargetSeconds[q.number] ?? 30;
}

/** 質問1つ分の発話。音声ファイルがあればそれを流し、再生できなければ読み上げに切り替える */
export function questionSegment(q) {
  return { audio: q.audio || null, text: spokenQuestion(q), isQuestion: true };
}

/** ナレーション開始の指示（「Please begin your narration.」） */
export function narrationStartSegment(section) {
  return { text: INTERVIEW_CONFIG.phrases.narrationStart, audio: section?.cues?.narrationStart };
}

/** 面接官の音声ファイルが入っているカードか（入っていない回はブラウザの読み上げで流す） */
export function hasInterviewAudio(section) {
  return (section?.questions || []).some((q) => q.audio);
}

/**
 * 質問の種類。共通の採点観点・基本フレーズの切り替えに使う
 *   'narration'（ナレーション）| 'picture'（カードを見て答える No.1）| 'opinion'（意見を述べる No.2〜4）
 */
export function questionKind(q) {
  if (q.type === 'narration') return 'narration';
  return q.showCard ? 'picture' : 'opinion';
}

/** 自己採点の横に出す観点（共通の観点 + カードごとの checkpoints） */
export function checkpointsFor(q) {
  return [...(q.checkpoints || []), ...INTERVIEW_CONFIG.checkpoints[questionKind(q)]];
}

/**
 * 面接官の発話（決まり文句・質問）を順に流す。
 * segments: [{ text, audio?, isQuestion? }]（audio があればそれを流し、再生できなければ text を読み上げる）
 * playFile: 音声ファイルを流す関数（useQuestionAudio の playFile）
 * 中断されたら null、最後まで流れたら { questionVoiced }（質問を音声で伝えられたか）を返す
 */
export async function runCue(segments, { playFile, isCancelled }) {
  const rate = INTERVIEW_CONFIG.speechRate;
  let questionVoiced = true;
  for (const seg of segments) {
    if (isCancelled()) return null;
    let ok = seg.audio ? await playFile(seg.audio) : false;
    if (isCancelled()) return null;
    if (!ok) ok = await speak(seg.text, { rate });
    if (isCancelled()) return null;
    if (seg.isQuestion && !ok) questionVoiced = false;
  }
  return { questionVoiced };
}

/**
 * 本番形式の進行表を作る。
 * 黙読 → ナレーション → No.1 →（カードを伏せる）→ No.2〜4 → 終了
 * 各ステージは「面接官が話す（cue）」→「受験者の番（黙読・録音）」の順に進む。
 */
export function buildExamStages(section) {
  const P = INTERVIEW_CONFIG.phrases;
  const cueAudio = section?.cues || {};
  const stages = [
    {
      id: 'prep',
      kind: 'prep',
      label: '黙読',
      cue: [{ text: P.prep, audio: cueAudio.prep }],
      seconds: INTERVIEW_CONFIG.prepSeconds,
      showCard: true,
    },
  ];

  let cardShown = true;
  let firstQa = true;
  for (const q of getInterviewSteps(section)) {
    if (q.type === 'narration') {
      stages.push({
        id: q.id,
        kind: 'narration',
        label: 'ナレーション',
        question: q,
        cue: [narrationStartSegment(section)],
        seconds: INTERVIEW_CONFIG.narrationSeconds,
        record: true,
        showCard: true,
      });
      continue;
    }
    const cue = [];
    if (firstQa) cue.push({ text: P.qaIntro, audio: cueAudio.qaIntro });
    // カードを見て答える質問（No.1）が終わったらカードを伏せる
    const showCard = cardShown && !!q.showCard;
    if (cardShown && !showCard) cue.push({ text: P.turnOver, audio: cueAudio.turnOver });
    cue.push(questionSegment(q));
    stages.push({
      id: q.id,
      kind: 'qa',
      label: `No.${q.number}`,
      question: q,
      cue,
      replay: [questionSegment(q)],
      target: answerTargetSeconds(q),
      record: true,
      showCard,
    });
    cardShown = showCard;
    firstQa = false;
  }

  stages.push({ id: 'closing', kind: 'closing', label: '終了', cue: [{ text: P.end }], showCard: false });
  return stages;
}
