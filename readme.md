# @mixer/epic-marbles

rxjs-style marble testing for your epics. See [the tests for this repository](./src/index.test.ts) (testception!) for an example of what this looks like.

## Example

```ts
import { EpicTestFactory } from '@mixer/epic-marbles';
import { expect } from 'chai';

import { greeterActions } from './greeter.actions';
import { greetingEpic } from './greeter.epics';

const epic = new EpicTestFactory<RootActions, IState, IDependencies>();

it('says hello', () =>
  epic
    // pass your epic function right in!
    .test(greetingEpic)
    // easily mock your dependent services
    .service('greeter', mockGreeterService)
    // set up your state changes
    .states('-a-b', {
      a: { user: 'bob' },
      b: { user: 'jim' },
    })
    // send an action:
    .send('-a', {
      a: doGreeting(),
    })
    // expect that your epic emits actions
    .test('-a-b', {
      // match simple actions
      a: greeterActions.greet({ name: 'bob' }),
      // or define custom callbacks to run
      b: action => {
        expect(action).to.deep.equal(greeterActions.greet({ name: 'jim' }));
        expect(mockGreeterService.hello).to.have.been.calledTwice;
      },
    }));
```

## Error Output

Errors look something like this:

```
Expected: -(a b) ----(c d)
Actual:   -(a ?1)----(c d)

Expectations:
  ✔ a@1: DID_SAY "HELLO"
  ✖ b@1: DID_SAY "wut"
  ✔ c@6: DID_SAY "BYE"
  ✔ d@6: DID_SAY "BYEBYE"

Unmatched/Extraneous Actions:
  ?1@1: DID_SAY "HELLOHELLO"
```

First, you'll see a marble representation of the expected and the actual timeline. The characters in these timelines will match the expectation passed to `.test()`, and any unknown actions will be prefixed with `?`.

The, the list of expectations are shown, along with any extra actions that were unexpected. In this test, we matched all but one of our expectations. Here, we missed one expected action, and had an extra one in its place.

## API

### `EpicTest.singleAction(action)`

Schedules a single action to be fired into the epic under test.

### `EpicTest.singleState(states)`

Sets the Redux state to test against. This won't change for the duration of the test.

### `EpicTest.send(marbles, actions)`

Schedules a list of actions to be sent. Marbles is an rxjs marble string, see the syntax for this [here](https://github.com/ReactiveX/rxjs/blob/master/docs_app/content/guide/testing/marble-testing.md#marble-syntax). All syntax is fully supported.

The second parameter should map the marble characters to actions to send at that time. For example:

```js
.send('-a--(bc)', {
  a: firstAction(),
  b: secondAction(),
  c: thirdAction(),
})
```

### `EpicTest.states(marbles, states)`

Schedules a list of state changes to occur. Marbles is an rxjs marble string, see the syntax for this [here](https://github.com/ReactiveX/rxjs/blob/master/docs_app/content/guide/testing/marble-testing.md#marble-syntax). All syntax is fully supported.

The second parameter should map the marble characters to a list of states to send at that time.

### `EpicTest.service(serviceName, mock)`

Mocks one of the service passed as the third arguments to your epics. Pairs well with [Sinon.js](https://sinonjs.org/). Note that all your services should return either a plain value or Observable. Marble testing is synchronous, so asynchronous functions like callbacks or promises [won't wor](https://github.com/ReactiveX/rxjs/blob/master/docs_app/content/guide/testing/marble-testing.md#you-cant-directly-test-rxjs-code-that-consumes-promises-or-uses-any-of-the-other-schedulers-eg-asapscheduler).

```js
import { of } from 'rxjs';

// ...
.service('greeter', {
  greet: (name: string) => of(`Hello ${name}`),
})
```

### `EpicTest.test(marbles, expectations)`

Assets that the given set of actions are output from your test. Marbles is an rxjs marble string, see the syntax for this [here](https://github.com/ReactiveX/rxjs/blob/master/docs_app/content/guide/testing/marble-testing.md#marble-syntax). All syntax is fully supported. If you don't expect anything from the test, you can omit both arguments or call it with an empty marble list, such as `.test('---')`.

The second parameter should map the marble characters to a list of expectations. These should be either action objects, which we'll check for deep equality against what the epic outputs, or functions that take the action as an output and check against it. For example:

```js
.test('-a-b', {
  // match simple actions
  a: greeterActions.greet({ name: 'bob' }),
  // or define custom callbacks to run
  b: action => {
    expect(action).to.deep.equal(greeterActions.greet({ name: 'jim' }));
    expect(mockGreeterService.hello).to.have.been.calledTwice;
  },
})
```
