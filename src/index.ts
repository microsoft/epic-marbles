import { expect } from 'chai';
import { Epic } from 'redux-observable';
import { never, Observable } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { map } from '../node_modules/rxjs/operators';

/**
 * Type that describes an action.
 */
export type Action<T> = { payload?: T; type: string };

/**
 * Expectation passed into the EpicTest.
 */
export type EpicExpectation<Actions> = Actions | ((action: { type: string; payload: any }) => void);

/**
 * Describes a type that either is another type or is a factory function for that type.
 */
export type Factory<T> = T | (() => T);

interface ISchedulerData<T> {
  frame: number;
  notification: { value: T; error?: Error };
}

const getCharacterFor = (action: ISchedulerData<any>) =>
  action.notification.error
    ? action.notification.error.name
    : action.notification.value
      ? action.notification.value.type
      : '?';

const listActionsIn = (actions: Array<ISchedulerData<any>>) => {
  let beadIndex = 0;
  let output = '';
  actions.forEach((action, i) => {
    while (beadIndex++ < action.frame) {
      output += '-';
    }
    if (i > 0 && actions[i - 1].frame === action.frame) {
      output += '|';
    }

    output += getCharacterFor(action);
  });

  return output;
};

/**
 * A recursive partial type.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U2> ? ReadonlyArray<DeepPartial<U2>> : DeepPartial<T[P]>
};

/**
 * EpicTestFactory is a utility for creating EpicTests. This is provided
 * mainly so you can capture your app typings in one place rather than
 * create then anew each time.
 */
export class EpicTestFactory<Actions extends Action<any>, State, Dependencies> {
  public test(epic: Epic<Actions, Actions, State, Dependencies>) {
    return new EpicTest<Actions, State, Dependencies>(epic);
  }
}

const unfactorize = <T>(item: Factory<T>): T => (typeof item === 'function' ? item() : item);

/**
 * EpicTest is the test instance.
 */
export class EpicTest<Actions extends Action<any>, State, Dependencies> {
  private services: Partial<Dependencies> = {};

  constructor(private readonly epic: Epic<Actions, Actions, State>) {}

  /**
   * Sets a single action the epic will get.
   */
  public singleAction(action: Factory<Actions>): this {
    this.getActions = helpers => helpers.hot('-a', { a: action });
    return this;
  }

  /**
   * Sets the actions the epic will get.
   */
  public actions(marbles: string, actions: { [key: string]: Factory<Actions> }): this {
    this.getActions = helpers => helpers.hot(marbles, actions);
    return this;
  }

  /**
   * Makes the state passed into the action a single, simple state.
   */
  public singleState(state: Factory<DeepPartial<State>>): this {
    this.getState = helpers => helpers.cold('a', { a: state });
    return this;
  }

  /**
   * Sets the states the epic will get.
   */
  public states(marbles: string, actions: { [key: string]: Factory<DeepPartial<State>> }): this {
    this.getState = helpers => helpers.cold(marbles, actions);
    return this;
  }

  /**
   * Adds a stubbed service.
   */
  public service<K extends keyof Dependencies>(name: K, service: Partial<Dependencies[K]>): this {
    this.services[name] = service as Dependencies[K];
    return this;
  }

  /**
   * Runs a test with the set of expectations.
   */
  public test(
    marbles: string = '-',
    expectations: { [key: string]: EpicExpectation<Actions> } = {},
  ) {
    // lots of <any> here. TestScheduler typings are not very good, and
    // we do some patching for concise tests.

    new TestScheduler(
      (
        actual: Array<ISchedulerData<Actions>>,
        expected: Array<ISchedulerData<EpicExpectation<Actions>>>,
      ) => {
        expect(actual).to.have.lengthOf(
          expected.length,
          `Expected to emit ${expected.length} events, but ` +
            `got ${actual.length} (${listActionsIn(actual)})`,
        );

        for (let i = 0; i < expected.length; i++) {
          expect(actual[i].frame).to.equal(
            expected[i].frame,
            `Expected to emit ${getCharacterFor(expected[i])} in frame ${expected[i].frame},` +
              ` but we got it in frame ${actual[i].frame}`,
          );

          const actualData = actual[i].notification;
          const expectedValue = expected[i].notification;

          if (actualData.error) {
            if (!expectedValue.error) {
              throw actualData.error;
            }
            continue;
          }

          if (expectedValue.value instanceof Function) {
            expectedValue.value(actualData.value as any);
          } else {
            expect(actualData.value).to.deep.equal(expectedValue.value);
          }
        }
      },
    ).run(helpers => {
      const output = this.epic(
        this.getActions(helpers).pipe(map(unfactorize)) as any,
        this.getState(helpers).pipe(map(unfactorize)) as any,
        this.services as any,
      );
      helpers.expectObservable(output).toBe(marbles, expectations);
    });
  }

  private getActions: (helpers: any) => Observable<Actions> = () => never();
  private getState: (helpers: any) => Observable<State> = () => never();
}
