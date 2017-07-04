/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayCompatMutations
 * @flow
 * @format
 */

'use strict';

const invariant = require('invariant');
const warning = require('warning');

const {
  getRelayClassicEnvironment,
  getRelayModernEnvironment,
} = require('RelayCompatEnvironment');
const {applyOptimisticMutation, commitMutation} = require('RelayRuntime');

import type {ConcreteOperationDefinition} from 'ConcreteQuery';
import type {Disposable} from 'RelayCombinedEnvironmentTypes';
import type {CompatEnvironment} from 'RelayCompatTypes';
import type {Environment as ClassicEnvironment} from 'RelayEnvironmentTypes';
import type {OptimisticMutationConfig} from 'applyRelayModernOptimisticMutation';
import type {MutationConfig} from 'commitRelayModernMutation';

const RelayCompatMutations = {
  commitUpdate<T>(
    environment: CompatEnvironment,
    config: MutationConfig<T>,
  ): Disposable {
    const relayStaticEnvironment = getRelayModernEnvironment(environment);
    if (relayStaticEnvironment) {
      return commitMutation(relayStaticEnvironment, config);
    } else {
      const relayClassicEnvironment = getRelayClassicEnvironment(environment);
      invariant(
        relayClassicEnvironment,
        'RelayCompatMutations: Expected an object that conforms to the ' +
          '`RelayEnvironmentInterface`, got `%s`.',
        environment,
      );
      return commitRelayClassicMutation(
        // getRelayClassicEnvironment returns a RelayEnvironmentInterface
        // (classic APIs), but we need the modern APIs on old core here.
        (relayClassicEnvironment: $FixMe),
        config,
      );
    }
  },

  applyUpdate(
    environment: CompatEnvironment,
    config: OptimisticMutationConfig,
  ): Disposable {
    const relayStaticEnvironment = getRelayModernEnvironment(environment);
    if (relayStaticEnvironment) {
      return applyOptimisticMutation(relayStaticEnvironment, config);
    } else {
      const relayClassicEnvironment = getRelayClassicEnvironment(environment);
      invariant(
        relayClassicEnvironment,
        'RelayCompatMutations: Expected an object that conforms to the ' +
          '`RelayEnvironmentInterface`, got `%s`.',
        environment,
      );
      return applyRelayClassicMutation(
        // getRelayClassicEnvironment returns a RelayEnvironmentInterface
        // (classic APIs), but we need the modern APIs on old core here.
        (relayClassicEnvironment: $FixMe),
        config,
      );
    }
  },
};

function commitRelayClassicMutation<T>(
  environment: ClassicEnvironment,
  {
    configs,
    mutation,
    onCompleted,
    onError,
    optimisticResponse,
    variables,
    uploadables,
  }: MutationConfig<T>,
): Disposable {
  const {getOperation} = environment.unstable_internal;
  const operation = getOperation(mutation);
  // TODO: remove this check after we fix flow.
  if (typeof optimisticResponse === 'function') {
    warning(
      false,
      'RelayCompatMutations: Expected `optimisticResponse` to be an object, ' +
        'received a function.',
    );
    optimisticResponse = optimisticResponse();
  }
  if (optimisticResponse) {
    optimisticResponse = validateOptimisticResponse(
      operation,
      optimisticResponse,
    );
  }

  return environment.sendMutation({
    configs: configs || [],
    operation,
    onCompleted,
    onError,
    optimisticResponse,
    variables,
    uploadables,
  });
}

function applyRelayClassicMutation(
  environment: ClassicEnvironment,
  {configs, mutation, optimisticResponse, variables}: OptimisticMutationConfig,
): Disposable {
  const {getOperation} = environment.unstable_internal;
  const operation = getOperation(mutation);

  // RelayClassic can't update anything without response.
  if (!optimisticResponse) {
    return {dispose: () => {}};
  }

  optimisticResponse = validateOptimisticResponse(
    operation,
    optimisticResponse,
  );
  return environment.applyMutation({
    configs: configs || [],
    operation,
    optimisticResponse,
    variables,
  });
}

function validateOptimisticResponse(
  operation: ConcreteOperationDefinition,
  optimisticResponse: Object,
): Object {
  if (
    operation.node.kind === 'Mutation' &&
    operation.node.calls &&
    operation.node.calls.length === 1
  ) {
    const mutationRoot = operation.node.calls[0].name;
    if (optimisticResponse[mutationRoot]) {
      return optimisticResponse[mutationRoot];
    } else {
      warning(
        false,
        'RelayCompatMutations: Expected result from `optimisticResponse`' +
          'to contain the mutation name `%s` as a property, got `%s`',
        mutationRoot,
        optimisticResponse,
      );
    }
  }
  return optimisticResponse;
}

module.exports = RelayCompatMutations;
