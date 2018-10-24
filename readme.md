# @mixer/epic-marbles

> This repo is alpha-level stability.

rxjs-style marble testing for your epics. See [the tests for this repository](./src/index.test.ts) (testception!) for an example of what this looks like.

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
