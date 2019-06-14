import { AssertionError, deepStrictEqual, strictEqual } from 'assert';
import * as figures from 'figures';
import { inspect } from 'util';
import { AssertionTimeline, ITimelineRecord } from './assertion-timeline';
import { EpicExpectation, IAction, IEpicExpectationMap, ISchedulerData } from './types';

interface IActualEntry<T> {
  didMatchExpected: boolean;
  value: T;
  error?: Error;
}

interface IExpectedEntry<T> {
  expectation: EpicExpectation<T>;
  matched: boolean;
}

/**
 * An Assertion compares and diffs sets of expected actions.
 */
export class Assertion<Action extends IAction<any>> {
  /**
   * Creates a new Assertion be comparing the two sets of actions.
   */
  public static create<ActionType extends IAction<any>>(
    expectedMap: IEpicExpectationMap<ActionType>,
    expected: Array<ISchedulerData<EpicExpectation<ActionType>>>,
    actual: Array<ISchedulerData<ActionType>>,
  ): Assertion<ActionType> {
    const expectedTimeline = new AssertionTimeline<IExpectedEntry<ActionType>>();
    for (const entry of expected) {
      expectedTimeline.add(
        entry.frame,
        Assertion.getKeyForExpectation(expectedMap, entry.notification.value),
        { matched: false, expectation: entry.notification.value },
      );
    }

    const actualTimeline = new AssertionTimeline<IActualEntry<ActionType>>();

    for (const entry of actual) {
      const idealMatch = expectedTimeline.items.find(
        e => e.frame === entry.frame && !e.value.matched && !Assertion.tryAssertEquals(e, entry),
      );

      const timelineEntry: IActualEntry<ActionType> = {
        didMatchExpected: !!idealMatch,
        error: entry.notification.error,
        value: entry.notification.value,
      };

      if (idealMatch) {
        idealMatch.value.matched = true;
        actualTimeline.add(
          entry.frame,
          Assertion.getKeyForExpectation(expectedMap, idealMatch.value.expectation),
          timelineEntry,
        );
        continue;
      }

      const anyMatch = expectedTimeline.items.find(e => !this.tryAssertEquals(e, entry));
      const anyMatchKey = anyMatch
        ? Assertion.getKeyForExpectation(expectedMap, anyMatch.value.expectation)
        : entry.notification.error
          ? `!${actualTimeline.items.length}`
          : `?${actualTimeline.items.length}`;
      actualTimeline.add(entry.frame, anyMatchKey, timelineEntry);
    }

    return new Assertion(expectedTimeline, actualTimeline);
  }

  private static stringifyError(error: Error) {
    if (!error) {
      return inspect(error);
    }

    if (error.stack) {
      return error.stack;
    }

    if (error.message) {
      return `${error.name}: ${error.message}`;
    }

    return inspect(error);
  }

  private static stringifyExpectation<T extends IAction<any>>(expectation: EpicExpectation<T>) {
    return typeof expectation === 'function'
      ? '<test function>'
      : Assertion.stringifyAction(expectation);
  }

  private static stringifyAction<T extends IAction<any>>(action: T) {
    return action && typeof action.type === 'string'
      ? `${action.type} ${JSON.stringify(action.payload)}`
      : inspect(action);
  }

  private static getKeyForExpectation<T>(
    map: IEpicExpectationMap<T>,
    expectation: EpicExpectation<T>,
  ) {
    for (const key of Object.keys(map)) {
      if (map[key] === expectation) {
        return key;
      }
    }

    return '?';
  }

  private static tryAssertEquals<T>(
    expected: ITimelineRecord<IExpectedEntry<T>>,
    actual: ISchedulerData<T>,
  ): AssertionError | void {
    try {
      Assertion.assertEquals(expected, actual);
    } catch (e) {
      return e;
    }
  }

  private static assertEquals<T>(
    expected: ITimelineRecord<IExpectedEntry<T>>,
    actual: ISchedulerData<T>,
  ): void {
    strictEqual(actual.notification.error, undefined, 'Expected to not have an error');

    if (expected.value.expectation instanceof Function) {
      expected.value.expectation(actual.notification.value as any);
    } else {
      deepStrictEqual(actual.notification.value, expected.value.expectation);
    }
  }
  protected constructor(
    private readonly expected: AssertionTimeline<IExpectedEntry<Action>>,
    private readonly actual: AssertionTimeline<IActualEntry<Action>>,
  ) {}

  /**
   * Returns whether the assertion failed.
   */
  public failed() {
    return (
      this.expected.items.some(e => !e.value.matched) ||
      this.actual.items.some(i => !i.value.didMatchExpected)
    );
  }

  /**
   * Pretty-prints an annotate assertion error message.
   */
  public annotate() {
    const { expected, actual } = this;
    const [expectedStr, actualStr] = AssertionTimeline.printAll([expected, actual]);
    const error = ['', `Expected: ${expectedStr}`, `Actual:   ${actualStr}`, '', 'Expectations:'];

    for (const entry of expected.items) {
      const prefix = `${entry.key}@${entry.frame}:`;
      const content = Assertion.stringifyExpectation(entry.value.expectation);
      error.push(`  ${entry.value.matched ? figures.tick : figures.cross} ${prefix} ${content}`);
    }

    const extraneous = actual.items.filter(e => !e.value.didMatchExpected);
    if (extraneous.length) {
      error.push('', 'Unmatched/Extraneous Actions:');
      for (const entry of extraneous) {
        if (entry.value.error) {
          error.push(
            `  ${entry.key}@${entry.frame}: ${Assertion.stringifyError(entry.value.error)}`,
          );
        } else {
          error.push(
            `  ${entry.key}@${entry.frame}: ${Assertion.stringifyAction(entry.value.value)}`,
          );
        }
      }
    }

    return error.join('\r\n');
  }
}
