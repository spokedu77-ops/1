import type { Question } from '../types';

/** English translation of ELEMENTARY_QUESTIONS (ages 8-10) */
export const ELEMENTARY_QUESTIONS_EN: Question[] = [
  {
    id: 1,
    axis: 'C/I',
    label: 'Social style',
    q: 'When told to move freely during PE class, where does your child usually end up?',
    opts: [
      { v: 'C', e: '🙌', t: 'Mixed in with a group of friends, moving along together', d: 'Being around people is what gets their energy going' },
      { v: 'I', e: '🎯', t: 'Quietly doing their own thing on their own', d: 'Getting ready at their own pace feels more comfortable' },
    ],
  },
  {
    id: 2,
    axis: 'D/S',
    label: 'Energy style',
    q: 'The rules suddenly change during PE class. How does your child react?',
    opts: [
      { v: 'D', e: '🙆', t: 'Just jumps right into the new rules immediately', d: "Their body reacts first, even with a change" },
      { v: 'S', e: '🤔', t: 'Takes a moment to sort out the new rules in their head first', d: "They need to understand it before moving, so they don't make mistakes" },
    ],
  },
  {
    id: 3,
    axis: 'R/E',
    label: 'Exploration style',
    q: 'When trying a new sport for the first time, how does your child start?',
    opts: [
      { v: 'R', e: '📋', t: 'Learns the rules and method first before starting', d: 'They feel reassured once they know how it works' },
      { v: 'E', e: '🏃', t: 'Jumps right in and figures it out with their body', d: 'Learning by doing feels faster to them' },
    ],
  },
  {
    id: 4,
    axis: 'P/G',
    label: 'Motivation style',
    q: "When their time or score in PE class isn't as good as expected, how does your child react?",
    opts: [
      { v: 'P', e: '😄', t: 'How much fun they had today matters more than the number', d: 'The process itself is already enough for them' },
      { v: 'G', e: '📊', t: 'Immediately thinks about what to fix to do better next time', d: 'The desire to do better keeps bubbling up' },
    ],
  },
  {
    id: 5,
    axis: 'C/I',
    label: 'Social style',
    q: "When their team is losing in a team sport, what does your child do?",
    opts: [
      { v: 'C', e: '💬', t: "Talks to teammates and tries to lift everyone's spirits", d: 'It only really feels like winning when everyone wins together' },
      { v: 'I', e: '😶', t: 'Says little and focuses harder on their own play', d: "They'd rather show it through their own performance than words" },
    ],
  },
  {
    id: 6,
    axis: 'D/S',
    label: 'Energy style',
    q: 'When exercising, in which moment does your child seem most full of energy?',
    opts: [
      { v: 'D', e: '🌪️', t: 'Sprinting at full speed or using their whole body', d: 'Using their entire body is when they feel most alive' },
      { v: 'S', e: '🏹', t: 'Focusing carefully on timing and accuracy', d: 'Their skill really shows when they control things precisely' },
    ],
  },
  {
    id: 7,
    axis: 'R/E',
    label: 'Exploration style',
    q: 'When practicing a skill they struggled with before, how does your child approach it?',
    opts: [
      { v: 'R', e: '✅', t: 'Tries it again the same way that worked last time', d: 'Building on a familiar method step by step feels right' },
      { v: 'E', e: '🔀', t: 'Wants to try a different approach this time', d: 'A new attempt is more tempting than repeating the same method' },
    ],
  },
  {
    id: 8,
    axis: 'P/G',
    label: 'Motivation style',
    q: 'When your child comes home after PE class, what do they bring up first?',
    opts: [
      { v: 'P', e: '😆', t: '"I had so much fun with everyone today," they say with a smile', d: 'The fun moments come to mind first' },
      { v: 'G', e: '💪', t: '"I finally did ___ today," talking about what they achieved', d: 'What they accomplished is what comes to mind first' },
    ],
  },
  {
    id: 9,
    axis: 'C/I',
    label: 'Social style',
    q: "When a newly learned skill isn't working out, what does your child do first?",
    opts: [
      { v: 'C', e: '🗣️', t: 'Asks a friend, "How do you do it?"', d: 'Figuring it out together gets to the answer faster' },
      { v: 'I', e: '🔂', t: 'Keeps trying on their own without saying anything', d: 'It only really counts once they\'ve figured it out themselves' },
    ],
  },
  {
    id: 10,
    axis: 'D/S',
    label: 'Energy style',
    q: 'When your child gets to freely choose an activity, what are they drawn to?',
    opts: [
      { v: 'D', e: '💨', t: 'An activity where they keep running and moving nonstop', d: 'The more they move, the more satisfied they feel' },
      { v: 'S', e: '🎯', t: 'An activity where they stop and focus to do something precisely', d: 'They feel a bigger sense of accomplishment doing something with precision' },
    ],
  },
  {
    id: 11,
    axis: 'R/E',
    label: 'Exploration style',
    q: 'When a chance comes up to actually use a move they learned in PE class, what does your child do?',
    opts: [
      { v: 'R', e: '🧐', t: 'Tries to use it exactly the way they were taught', d: 'Doing it the "right" way feels more comfortable' },
      { v: 'E', e: '💡', t: 'Builds on what they learned and adapts it their own way', d: 'Putting their own spin on it is more fun than using it as-is' },
    ],
  },
  {
    id: 12,
    axis: 'P/G',
    label: 'Motivation style',
    q: "When your child sees a friend who's better at a sport than them, how do they react?",
    opts: [
      { v: 'P', e: '👍', t: '"Whoa, how do you do that?" — watches with fascination', d: 'Seeing someone else do well is interesting in itself' },
      { v: 'G', e: '🔥', t: '"I can do that too," they think, quietly fired up', d: 'The urge to not fall behind kicks in naturally' },
    ],
  },
];
