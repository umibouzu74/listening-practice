// 英検二次試験（面接）形式のデータを扱うユーティリティ
import { INTERVIEW_CONFIG } from './examConfig';

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

function questionSegment(q) {
  // 音声ファイルがあればそれを流し、再生できなければ読み上げに切り替える
  return { audio: q.audio || null, text: spokenQuestion(q), isQuestion: true };
}

/**
 * 本番形式の進行表を作る。
 * 黙読 → ナレーション → No.1 →（カードを伏せる）→ No.2〜4 → 終了
 * 各ステージは「面接官が話す（cue）」→「受験者の番（黙読・録音）」の順に進む。
 */
export function buildExamStages(section) {
  const P = INTERVIEW_CONFIG.phrases;
  const stages = [
    {
      id: 'prep',
      kind: 'prep',
      label: '黙読',
      cue: [{ text: P.prep }],
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
        cue: [{ text: P.narrationStart }],
        seconds: INTERVIEW_CONFIG.narrationSeconds,
        record: true,
        showCard: true,
      });
      continue;
    }
    const cue = [];
    if (firstQa) cue.push({ text: P.qaIntro });
    // カードを見て答える質問（No.1）が終わったらカードを伏せる
    const showCard = cardShown && !!q.showCard;
    if (cardShown && !showCard) cue.push({ text: P.turnOver });
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
