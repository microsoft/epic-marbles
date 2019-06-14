import { Epic } from 'redux-observable';
import { interval, of, throwError } from 'rxjs';
import { filter, ignoreElements, map, switchMap, switchMapTo, take } from 'rxjs/operators';
import { SinonStub } from 'sinon';
import { ActionType, createStandardAction, isActionOf } from 'typesafe-actions';

export const dependencyCaller = createStandardAction('DEPENDENCY_CALL')<string>();
export const yellAction = createStandardAction('YELL')<string>();
export const didYellAction = createStandardAction('DID_YELL')<string>();

export type Actions = ActionType<
  typeof dependencyCaller | typeof yellAction | typeof didYellAction
>;

export interface IState {
  foo: string;
}

export interface IDependencies {
  dep: SinonStub;
}

export const yellEpic: Epic<Actions> = actions =>
  actions.pipe(
    filter(isActionOf(yellAction)),
    map(action => didYellAction(action.payload.toUpperCase())),
  );

export const extraYellingEpic: Epic<Actions> = actions =>
  actions.pipe(
    filter(isActionOf(yellAction)),
    switchMap(action =>
      of(
        didYellAction(action.payload.toUpperCase()),
        didYellAction((action.payload + action.payload).toUpperCase()),
      ),
    ),
  );

export const callDependencyEpic: Epic<Actions, Actions, IState, IDependencies> = (
  actions,
  _state,
  { dep },
) =>
  actions.pipe(
    filter(isActionOf(dependencyCaller)),
    map(action => dep(action.payload)),
    ignoreElements(),
  );

export const yellFromStateEpic: Epic<Actions, Actions, IState> = (_actions, state) =>
  state.pipe(map(s => didYellAction(s.foo.toUpperCase())));

export const getsStateCurrentValue: Epic<Actions, Actions, IState> = (actions, state) =>
  actions.pipe(
    switchMapTo(
      interval(1).pipe(
        map(() => didYellAction(state.value.foo.toUpperCase())),
        take(2),
      ),
    ),
  );

export const errorEpic: Epic<Actions, Actions, IState> = actions =>
  actions.pipe(switchMapTo(throwError({ message: 'oh no!', name: 'SomeError' })));
