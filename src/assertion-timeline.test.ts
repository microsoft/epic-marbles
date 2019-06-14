import { expect } from 'chai';
import { AssertionTimeline } from './assertion-timeline';

describe('assertion timline', () => {
  const tcases = [
    {
      data: [[{ i: 1, v: 'a' }]],
      expected: ['-a--------'],
    },
    {
      data: [[{ i: 1, v: 'a' }, { i: 1, v: 'b' }]],
      expected: ['-(a b)----'],
    },
    {
      data: [[{ i: 1, v: 'a' }, { i: 1, v: 'b' }], [{ i: 1, v: 'a' }]],
      expected: ['-(a b)----', '-  a  ----'],
    },
    {
      data: [[{ i: 1, v: 'a' }, { i: 1, v: 'b' }], [{ i: 2, v: 'a' }]],
      expected: ['-(a b)----', '-  -  a---'],
    },
    {
      data: [[{ i: 1, v: 'a' }], [{ i: 2, v: 'a' }, { i: 50, v: 'b' }]],
      expected: ['-a--45ms--', '--a-45ms-b'],
    },
    {
      data: [[{ i: 1, v: 'a' }, { i: 25, v: 'b' }], [{ i: 2, v: 'a' }, { i: 50, v: 'b' }]],
      expected: ['-a--20ms-b-22ms--', '--a-20ms---22ms-b'],
    },
  ];

  for (const tcase of tcases) {
    it(`builds ${tcase.expected.join(', ')}`, () => {
      const timelines = tcase.data.map(series => {
        const timeline = new AssertionTimeline<void>();
        for (const entry of series) {
          timeline.add(entry.i, entry.v, undefined);
        }

        return timeline;
      });

      expect(AssertionTimeline.printAll(timelines)).to.deep.equal(tcase.expected);
    });
  }
});
