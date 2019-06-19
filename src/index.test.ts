import { expect } from 'chai';
import { stub } from 'sinon';

import { AssertionError } from 'assert';
import {
  Actions,
  callDependencyEpic,
  dependencyCaller,
  didYellAction,
  emptyEpic,
  errorEpic,
  extraYellingEpic,
  getsStateCurrentValue,
  IDependencies,
  IState,
  yellAction,
  yellEpic,
  yellFromStateEpic,
} from './demo-app.test';
import { EpicTestFactory } from './index';

const epic = new EpicTestFactory<Actions, IState, IDependencies>();

const expectAssertionError = (fn: () => void, message: string[] = []) => () =>
  expect(fn).to.throw(AssertionError, message.join('\r\n'));

it('asserts output actions successfully', () =>
  epic
    .test(yellEpic)
    .actions('-a', { a: yellAction('hello') })
    .test('-a', { a: didYellAction('HELLO') }));

it('asserts multiple output actions successfully', () =>
  epic
    .test(extraYellingEpic)
    .actions('-a', { a: yellAction('hello') })
    .test('-(ab)', { a: didYellAction('HELLO'), b: didYellAction('HELLOHELLO') }));

it(
  'fails if epic emits error',
  expectAssertionError(
    () =>
      epic
        .test(errorEpic)
        .singleAction(yellAction('hello'))
        .test('---'),
    [
      '',
      'Expected: -- -------',
      'Actual:   -!0-------',
      '',
      'Expectations:',
      '',
      'Unmatched/Extraneous Actions:',
      '  !0@1: SomeError: oh no!',
    ],
  ),
);

it(
  'fails if one action mismatches',
  expectAssertionError(
    () =>
      epic
        .test(extraYellingEpic)
        .send('-a----b', { a: yellAction('hello'), b: yellAction('bye') })
        .test('-(ab)-(cd)', {
          a: didYellAction('HELLO'),
          b: didYellAction('wut'),
          c: didYellAction('BYE'),
          d: didYellAction('BYEBYE'),
        }),
    [
      '',
      'Expected: -(a b) ----(c d)',
      'Actual:   -(a ?1)----(c d)',
      '',
      'Expectations:',
      '  ✔ a@1: DID_YELL "HELLO"',
      '  ✖ b@1: DID_YELL "wut"',
      '  ✔ c@6: DID_YELL "BYE"',
      '  ✔ d@6: DID_YELL "BYEBYE"',
      '',
      'Unmatched/Extraneous Actions:',
      '  ?1@1: DID_YELL "HELLOHELLO"',
    ],
  ),
);

it(
  'fails if extra actions are emitted',
  expectAssertionError(
    () =>
      epic
        .test(extraYellingEpic)
        .actions('-a', { a: yellAction('hello') })
        .test('-a', { a: didYellAction('HELLO') }),
    [
      '',
      'Expected: -  a   ---',
      'Actual:   -(a ?1)---',
      '',
      'Expectations:',
      '  ✔ a@1: DID_YELL "HELLO"',
      '',
      'Unmatched/Extraneous Actions:',
      '  ?1@1: DID_YELL "HELLOHELLO"',
    ],
  ),
);

it(
  'fails if output is mismatched',
  expectAssertionError(
    () =>
      epic
        .test(yellEpic)
        .actions('-a', { a: yellAction('hello') })
        .test('-a', { a: didYellAction('wut') }),
    [
      '',
      'Expected: -a -------',
      'Actual:   -?0-------',
      '',
      'Expectations:',
      '  ✖ a@1: DID_YELL "wut"',
      '',
      'Unmatched/Extraneous Actions:',
      '  ?0@1: DID_YELL "HELLO"',
    ],
  ),
);

it('runs using singleAction', () =>
  epic
    .test(yellEpic)
    .singleAction(yellAction('hello'))
    .test('-a', { a: didYellAction('HELLO') }));

it('runs dependency tests', () => {
  const dep = stub();
  epic
    .test(callDependencyEpic)
    .service('dep', dep)
    .singleAction(dependencyCaller('w00t'))
    .test()
    .after(() => {
      expect(dep.calledWith('w00t')).to.be.true;
    });
});

it('injects state correctly', () =>
  epic
    .test(yellFromStateEpic)
    .states('-a-b', {
      a: { foo: 'first' },
      b: { foo: 'second' },
    })
    .test('-a-b', {
      a: didYellAction('FIRST'),
      b: didYellAction('SECOND'),
    }));

it('injects using singleState', () =>
  epic
    .test(yellFromStateEpic)
    .singleState({ foo: 'FIRST' })
    .test('a', {
      a: didYellAction('FIRST'),
    }));

it('injects factories', () => {
  epic
    .test(yellFromStateEpic)
    .singleState(() => ({ foo: 'first' }))
    .test('a', {
      a: didYellAction('FIRST'),
    });

  epic
    .test(yellEpic)
    .actions('-a', { a: () => yellAction('hello') })
    .test('-a', { a: didYellAction('HELLO') });
});

it('reads the state.value', () =>
  epic
    .test(getsStateCurrentValue)
    .states('--ab', { a: { foo: 'bar' }, b: { foo: 'baz' } })
    .actions('-a', { a: yellAction('hi') })
    .test('--ab', {
      a: didYellAction('BAR'),
      b: didYellAction('BAZ'),
    }));

describe('after callback', () => {
  it('executes after test is complete', () => {
    let isAfterExecuted = false;
    epic
      .test(yellEpic)
      .actions('-a', { a: yellAction('hello') })
      .test('-a', { a: didYellAction('HELLO') })
      .after(() => {
        isAfterExecuted = true;
      });

    expect(isAfterExecuted).to.be.true;
  });

  it('executes a promise callback', done => {
    let isAfterExecuted = false;
    epic
      .test(emptyEpic)
      .actions('-a', { a: yellAction('hello') })
      .test('---')
      .after(() => {
        return new Promise((resolve, _) => {
          isAfterExecuted = true;
          resolve();
        });
      })
      .then(() => {
        expect(isAfterExecuted).to.be.true;
        done();
      })
      .catch(() => {
        done('promise rejected');
      });
  });

  it('fails test if the passed in function fails', () => {
    let didFail = false;

    try {
      epic
        .test(emptyEpic)
        .actions('-a', { a: yellAction('hello') })
        .test('---')
        .after(() => {
          expect(false).to.be.true;
        });
    } catch {
      didFail = true;
    }

    expect(didFail).to.be.true;
  });

  it('fails test if the passed in function throws exception', () => {
    let didFail = false;

    try {
      epic
        .test(emptyEpic)
        .actions('-a', { a: yellAction('hello') })
        .test('---')
        .after(() => {
          throw new Error();
        });
    } catch {
      didFail = true;
    }

    expect(didFail).to.be.true;
  });
});
