import { expect, AssertionError } from 'chai';
import { stub } from 'sinon';

import { EpicTestFactory } from './index';
import {
  Actions,
  IState,
  IDependencies,
  yellEpic,
  yellAction,
  didYellAction,
  callDependencyEpic,
  dependencyCaller,
  extraYellingEpic,
  yellFromStateEpic,
  getsStateCurrentValue,
} from './demo-app.test';

const epic = new EpicTestFactory<Actions, IState, IDependencies>();

const expectAssertionError = (fn: () => void) => () => expect(fn).to.throw(AssertionError);

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
  'fails if extra actions are emitted',
  expectAssertionError(() =>
    epic
      .test(extraYellingEpic)
      .actions('-a', { a: yellAction('hello') })
      .test('-a', { a: didYellAction('HELLO') }),
  ),
);

it(
  'fails if output is mismatched',
  expectAssertionError(() =>
    epic
      .test(yellEpic)
      .actions('-a', { a: yellAction('hello') })
      .test('-a', { a: didYellAction('wut') }),
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
    .test();
  expect(dep.calledWith('w00t')).to.be.true;
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
