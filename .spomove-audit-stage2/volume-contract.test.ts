import {describe,it,expect} from 'vitest';
import {normalizeColorTrackerRounds} from '../app/admin/spomove/training/_player/lib/roundNormalization';
describe('PD-018: selected public White Ball repetition count must reach its engine unchanged',()=>{
it.each([10,15,20,30])('selection %i remains the engine target',selected=>{expect(normalizeColorTrackerRounds(selected)).toBe(selected)});
});
