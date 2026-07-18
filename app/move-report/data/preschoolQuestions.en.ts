import type { Question } from '../types';

/** English translation of PRESCHOOL_QUESTIONS (ages 5-7) */
export const PRESCHOOL_QUESTIONS_EN: Question[] = [
  {
    id: 1,
    axis: 'C/I',
    label: 'Social style',
    q: 'During active play or PE time, what does your child enjoy more?',
    opts: [
      { v: 'C', e: '🙌', t: 'Running around or passing a ball back and forth with friends', d: 'Their energy rises when they move together with others' },
      { v: 'I', e: '🎯', t: 'Climbing equipment or running laps on their own, again and again', d: 'They like moving at their own pace' },
    ],
  },
  {
    id: 2,
    axis: 'D/S',
    label: 'Energy style',
    q: 'When your child first steps into a wide open space, what do they usually do?',
    opts: [
      { v: 'D', e: '⚡', t: 'Runs off right away without even checking out the space', d: 'Their body reacts before they think' },
      { v: 'S', e: '🔍', t: 'Stops and slowly scans the whole space first', d: "They feel more comfortable moving once they've taken it all in" },
    ],
  },
  {
    id: 3,
    axis: 'R/E',
    label: 'Exploration style',
    q: "When given a ball or piece of equipment they've never seen before, what does your child do first?",
    opts: [
      { v: 'R', e: '📖', t: 'Asks right away, "How do I use this?"', d: 'They feel reassured once they know the method before starting' },
      { v: 'E', e: '💥', t: 'Is already throwing it or climbing on it before asking anyone', d: "They'd rather figure it out with their body first" },
    ],
  },
  {
    id: 4,
    axis: 'P/G',
    label: 'Motivation style',
    q: 'When your child loses a running race, how do they usually react?',
    opts: [
      { v: 'P', e: '😄', t: 'Shakes it off quickly and runs off to the next game', d: 'Just running was already fun enough for them' },
      { v: 'G', e: '😤', t: 'Gets upset or insists on doing it again', d: "The loss stays with them and isn't easy to brush off" },
    ],
  },
  {
    id: 5,
    axis: 'C/I',
    label: 'Social style',
    q: 'During a game of tag or dodgeball, which does your child lean toward more?',
    opts: [
      { v: 'C', e: '🤝', t: 'Coming up with a strategy together and winning as a team', d: "It's so much more exciting when everyone's in sync" },
      { v: 'I', e: '🏃', t: 'Surviving to the end all on their own', d: 'Trusting their own quick reflexes feels more thrilling' },
    ],
  },
  {
    id: 6,
    axis: 'D/S',
    label: 'Energy style',
    q: 'During physical play, when does your child seem most excited?',
    opts: [
      { v: 'D', e: '🌪️', t: 'When running around energetically, using their whole body', d: 'The faster and more dynamic it is, the more alive they feel' },
      { v: 'S', e: '🎯', t: 'When focusing and doing something with precision', d: 'Their eyes light up when they can control something carefully' },
    ],
  },
  {
    id: 7,
    axis: 'R/E',
    label: 'Exploration style',
    q: 'When doing something with a set method, like jump rope or a hula hoop, what does your child do?',
    opts: [
      { v: 'R', e: '🔁', t: 'Keeps repeating it the "right" way until it works', d: 'They need to get it exactly right before moving on' },
      { v: 'E', e: '🌀', t: 'Ends up doing it their own unique way without realizing it', d: 'Discovering a new way to do it is the fun part' },
    ],
  },
  {
    id: 8,
    axis: 'P/G',
    label: 'Motivation style',
    q: "What happens when your child can't quite get a movement right during exercise?",
    opts: [
      { v: 'P', e: '🔄', t: 'They just move on and keep having fun', d: 'Enjoying the overall flow matters more than any one thing' },
      { v: 'G', e: '🎯', t: 'They keep at that one movement until it works', d: "It's hard to move on without solving it" },
    ],
  },
  {
    id: 9,
    axis: 'C/I',
    label: 'Social style',
    q: 'When your child struggles to follow along during stretching or gymnastics, what do they do?',
    opts: [
      { v: 'C', e: '😄', t: 'Looks over at a friend to copy them, or laughs it off together', d: 'Syncing up with the people around them feels natural' },
      { v: 'I', e: '🔂', t: 'Ignores their friends and just repeats the movement alone', d: 'They need to work it out with their own body to feel satisfied' },
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
    q: 'When exciting music comes on, how does your child move?',
    opts: [
      { v: 'R', e: '🎵', t: 'Copies the moves of a teacher or a video', d: 'They like getting good at a set routine' },
      { v: 'E', e: '🕺', t: 'Just moves however their body feels like moving', d: 'Expressing themselves in their own unique way is more fun' },
    ],
  },
  {
    id: 12,
    axis: 'P/G',
    label: 'Motivation style',
    q: "After playing energetically, what's the first thing your child usually says?",
    opts: [
      { v: 'P', e: '😊', t: '"That was so much fun!" — talking excitedly about it', d: 'The joy of the experience itself stays with them longest' },
      { v: 'G', e: '😬', t: '"But I still couldn\'t do that thing…" — sounding disappointed', d: "Not being able to do something bothers them" },
    ],
  },
];
