export interface ISchedulerData<T> {
  frame: number;
  notification: { value: T; error?: Error };
}

/**
 * Type that describes an action.
 */
export interface IAction<T> {
  payload?: T;
  type: string;
}

/**
 * Expectation passed into the EpicTest.
 */
export type EpicExpectation<Actions> = Actions | ((action: { type: string; payload: any }) => void);

/**
 * Mapps of epic expectations.
 */
export interface IEpicExpectationMap<Actions> {
  [key: string]: EpicExpectation<Actions>;
}
