import { add } from '../src/index';

test('add adds numbers', () => {
  expect(add(2, 2)).toBe(4);
});