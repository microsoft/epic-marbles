import { AssertionError } from 'assert';
import { Epic } from 'redux-observable';
import { merge, never, Observable } from 'rxjs';
import { ignoreElements, map, tap } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import { Assertion } from './assertion';
import { EpicExpectation, IAction, IEpicExpectationMap, ISchedulerData } from './types';

export { EpicExpectation, IAction } from './types';

/**
 * Describes a type that either is another type or is a factory function for that type.
 */
export type Factory<T> = T | (() => T);
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
export class EpicTestFactory<Actions extends IAction<any>, State, Dependencies> {
  public test(epic: Epic<Actions, Actions, State, Dependencies>) {
    return new EpicTest<Actions, State, Dependencies>(epic);
  }
}

const unfactorize = <T>(item: Factory<T>): T => (typeof item === 'function' ? item() : item);

/**
 * EpicTest is the test instance.
 */
// tslint:disable-next-line
export class EpicTest<Action extends IAction<any>, State, Dependencies> {
  private services: Partial<Dependencies> = {};

  constructor(private readonly epic: Epic<Action, Action, State>) {}

  /**
   * Sets a single action the epic will get.
   */
  public singleAction(action: Factory<Action>): this {
    this.getActions = helpers => helpers.hot('-a', { a: action });
    return this;
  }

  /**
   * Sets the actions the epic will get. Alias of actions(), but gets aligned
   * correctly.
   */
  public send(marbles: string, actions: { [key: string]: Factory<Action> }): this {
    return this.actions(marbles, actions);
  }

  /**
   * Sets the actions the epic will get.
   */
  public actions(marbles: string, actions: { [key: string]: Factory<Action> }): this {
    this.getActions = helpers => helpers.hot(marbles, actions);
    return this;
  }

  /**
   * Makes the state passed into the action a single, simple state.
   */
  public singleState(state: Factory<DeepPartial<State>>): this {
    this.getState = helpers => helpers.hot('a', { a: state });
    return this;
  }

  /**
   * Sets the states the epic will get.
   */
  public states(marbles: string, actions: { [key: string]: Factory<DeepPartial<State>> }): this {
    this.getState = helpers => helpers.hot(marbles, actions);
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
  public test(marbles: string = '-', expectations: IEpicExpectationMap<Action> = {}) {
    const scheduler = new TestScheduler(
      (
        actual: Array<ISchedulerData<Action>>,
        expected: Array<ISchedulerData<EpicExpectation<Action>>>,
      ) => {
        const assertion = Assertion.create(expectations, expected, actual);
        if (assertion.failed()) {
          throw new AssertionError({
            message: assertion.annotate(),
          });
        }
      },
    );

    // lots of <any> here. TestScheduler typings are not very good, and
    // we do some patching for concise tests.
    scheduler.run(helpers => {
      const state = this.getState(helpers).pipe(map(unfactorize));
      const output = merge(
        this.epic(
          this.getActions(helpers).pipe(map(unfactorize)) as any,
          state as any,
          this.services as any,
        ),
        state.pipe(
          map(unfactorize),
          tap(value => ((state as any).value = value)),
          ignoreElements(),
        ),
      );
      helpers.expectObservable(output).toBe(marbles, expectations);
    });

    return this;
  }
  /**
   * Executes a given callback function
   * @param callback - function to execute
   */
  public after<T>(callback: () => T | Promise<T>) {
    callback();
  }

  private getActions: (helpers: any) => Observable<Action> = () => never();
  private getState: (helpers: any) => Observable<State> = () => never();
}
