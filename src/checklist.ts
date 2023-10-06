/**
 * @file Defines the checklist data structure and exports functions that are useful when parsing
 * and executing checklists.
 *
 * @module checklist
 */

import { AbiFunctionFragment } from "web3";

/**
 * BaseStep defines the fields that all steps share.
 */
export interface BaseStep {
  // String identifying the person who should execute this step.
  executor: string;

  // A string identifying this step. The stepIDs of different steps should be distinct from each other.
  stepID: string;

  // A human-friendly description of this step.
  description?: string;

  // A list of stepIDs of the steps that this step depends on.
  // Each step type has different rules that determine whether it is complete. Check the isStepComplete
  // method to see the criteria.
  dependsOn: string[];
}

/**
 * InputStep represents a *Check, Please* step that calls for user input from its executor.
 */
export interface InputStep extends BaseStep {
  stepType: "manual";

  // The value that the executor should input.
  value?: any;
}

/**
 * ViewStep represents a *Check, Please* step that calls for the result of the execution of a view
 * method on a smart contract.
 *
 * ViewSteps can interpolate the results of other steps into their parameters.
 */
export interface ViewStep extends BaseStep {
  stepType: "view";

  // The chainID of the chain that the view call should be executed on.
  chainID: string;

  // The address of the contract that the view call should be executed on.
  to: string;

  // The ABI of the method that should be called.
  methodABI: AbiFunctionFragment;

  // The parameters that should be passed to the method. These can be Handlebars.js templates, which will be
  // populated using the execution context created by generateExecutionContext below.
  params: string[];

  // The output of the view call (to be populated once it has been executed).
  output?: any;

  // The block number at which the view call was executed (to be populated once it has been executed).
  blockNumber?: string;

  // The block hash of the block number at which the view call was executed (to be populated once it has been executed).
  blockHash?: string;
}

/**
 * RawStep represents a *Check, Please* step that calls for the execution of a raw transaction - i.e.
 * the execution of a transaction from its calldata.
 *
 * RawSteps do not support the interpolation of results of other steps into their calldata.
 */
export interface RawStep extends BaseStep {
  stepType: "raw";

  // The chainID of the chain that the transaction should be executed on.
  chainID: string;

  // The address of the contract that the transaction should be executed on.
  to: string;

  // The calldata for the transaction.
  calldata: string;

  // The value to be sent with the transaction. These should be denominated in the smallest denomination
  // of the chain's native token. For example, on Ethereum, Wei.
  value?: string;

  // The ABI of the method that should be called. If provided, this is only used for display purposes.
  methodABI?: AbiFunctionFragment;

  // The transaction hash for the transaction (to be populated once it has been executed).
  txHash?: string;

  // true if the transaction was successful, false otherwise (to be populated once it has been executed).
  success?: boolean;
}

/**
 * MethodCallStep represents a *Check, Please* step that requires the executor to submit a transaction
 * that invokes a function on a smart contract.
 *
 * MethodCallSteps can interpolate the results of other steps into their parameters.
 */

export interface MethodStep extends BaseStep {
  stepType: "method";

  // The chainID of the chain that the transaction should be executed on.
  chainID: string;

  // The address of the contract that the transaction should be executed on.
  to: string;

  // The ABI of the method that should be called.
  methodABI: AbiFunctionFragment;

  // The parameters that should be passed to the method. These can be Handlebars.js templates, which will be
  // populated using the execution context created by generateExecutionContext below.
  params: string[];

  // The value to be sent with the transaction. These should be denominated in the smallest denomination
  // of the chain's native token. For example, on Ethereum, Wei.
  value?: string;

  // The transaction hash for the transaction (to be populated once it has been executed).
  txHash?: string;

  // true if the transaction was successful, false otherwise (to be populated once it has been executed).
  success?: boolean;

  // The output, if any, of the method call (to be populated once it has been executed).
  output?: any;
}

/**
 * Step is the union of all the step types. They can be distinguished using the "stepType" property.
 * This is a discriminated union consisting of all the step types that are recognized by *Check, Please*.
 */
export type Step = InputStep | ViewStep | RawStep | MethodStep;

export function isStepComplete(step: Step): boolean {
  switch (step.stepType) {
    case "manual":
      return step.value !== undefined;
    case "view":
      return step.output !== undefined;
    case "raw":
      return step.txHash !== undefined;
    case "method":
      return step.txHash !== undefined;
  }
}

/**
 * Checklist represents a *Check, Please* checklist.
 */
export interface Checklist {
  requester: string;
  description?: string;
  steps: Step[];
  complete?: boolean;
}

/**
 * StepResult represents the result of running a step. It definitely indicated whether the execution
 * was successful or not, and if the step contains some kind of output, it is included under the "value"
 * key.
 */
export interface StepResult {
  success?: boolean;
  value?: any;
  executing?: boolean;
}

/**
 * ExecutionContext represents a context in which steps on a Checklist can be executed. It contains
 * StepResults corresponding to the results of all completed steps in the Checklist.
 * These can be used by steps which are being executed to interpolate data from previous steps into
 * their parameters.
 * Parameter interpolations are expected to be handlebars.js templates which are applied to the
 * ExecutionContext object
 */
export type ExecutionContext = { [k: string]: StepResult };

/**
 * checkStepIDs validates that:
 * 1. The steps in a checklist have distinct IDs
 * 2. That no step declared a dependency that doesn't match one of the defined stepIDs
 * @param checklist - the checklist whose steps to validate
 * @returns true if the stepIDs in the checklist are valid and false otherwise.
 */
export function checkStepIDs(checklist: Checklist): boolean {
  let stepIDs: { [k: string]: boolean } = {};

  // Check that stepIDs are unique.
  for (let step of checklist.steps) {
    if (stepIDs[step.stepID]) {
      return false;
    }

    stepIDs[step.stepID] = true;
  }

  // Check that no step depends on steps that don't exist.
  for (let step of checklist.steps) {
    for (let dependencyID of step.dependsOn) {
      if (stepIDs[dependencyID] === undefined) {
        return false;
      }
    }
  }

  return true;
}

/**
 * cycles checks if there are any cycles in the dependency graph of the steps in this checklist.
 * This is done by imposing a level to stages in this checklist. The level of steps with no dependencies
 * is 1. The level of a step with dependencies is 1 + the maximum level of any of its dependencies.
 * In the even of a circular dependency, there will come a point in this calculation where we cannot
 * assign a level to any remainint stage. In this event, we will raise an error.
 *
 * @param steps
 * @returns a list of steps that are part of cycles
 */
export function cycles(steps: Step[]): Step[] {
  const levels: { [k: string]: number } = {};
  calculateLevels(steps, 1, levels);

  const unlevelledSteps = steps.filter(
    (step) => levels[step.stepID] === undefined
  );

  return unlevelledSteps;
}

/**
 * nextLevel calculates the steps that comprise the level of the step dependency graph that comes after
 * the levels already represented in the levels object.
 * @param steps - list of steps to impose levels on
 * @param levels - levels that have already been imposed
 * @returns list of steps that comprise the next level
 */
function nextLevel(steps: Step[], levels: { [k: string]: number }): Step[] {
  let levelSteps: Step[] = [];

  for (let step of steps) {
    if (levels[step.stepID] === undefined) {
      if (step.dependsOn.every((dependencyID) => !!levels[dependencyID])) {
        levelSteps.push(step);
      }
    }
  }

  return levelSteps;
}

/**
 * calculateLevels imposes a level structure on the steps in a list. This is done by mutating the
 * levels object passed to the function.
 * @param steps - the steps to impose a level structure on
 * @param currentLevel - current level (used in recursive calls to calculateLevels); first call sets the lowest level in the structure
 * @param levels - the levels that have already been calculated (used in recursive calls to calculate levels); first call should be an empty object
 * @returns nothing, mutates the levels object
 */
function calculateLevels(
  steps: Step[],
  currentLevel: number,
  levels: { [k: string]: number }
): void {
  if (currentLevel === undefined) {
    currentLevel = 1;
  }
  if (levels === undefined) {
    levels = {};
  }

  let levelSteps = nextLevel(steps, levels);
  if (levelSteps.length === 0) {
    return;
  }

  for (let step of levelSteps) {
    levels[step.stepID] = currentLevel;
  }

  return calculateLevels(
    steps.filter((step) => levels[step.stepID] === undefined),
    currentLevel + 1,
    levels
  );
}

/**
 * nextSteps returns the steps that are ready to be executed next, based on the steps that have already
 * been completed.
 * @param checklist - the checklist whose steps to check
 * @returns list of steps that can be executed next based on prior completions
 */
export function nextSteps(checklist: Checklist): Step[] {
  let completeSteps: { [k: string]: Step } = {};
  let incompleteSteps: Step[] = [];
  let nextSteps: Step[] = [];

  const levels: { [k: string]: number } = {};
  calculateLevels(checklist.steps, 1, levels);

  // Make a shallow copy because we will sort.
  let steps = [...checklist.steps];
  steps.sort((a, b) => {
    if (levels[a.stepID] < levels[b.stepID]) {
      return -1;
    } else if (levels[a.stepID] > levels[b.stepID]) {
      return 1;
    }
    return 0;
  });

  for (let step of steps) {
    if (isStepComplete(step)) {
      completeSteps[step.stepID] = step;
    } else {
      incompleteSteps.push(step);
    }
  }

  let transitiveDependencies: { [k: string]: string[] } = {};
  for (let step of steps) {
    transitiveDependencies[step.stepID] = [...step.dependsOn];
    for (let dependency of step.dependsOn) {
      transitiveDependencies[step.stepID] = transitiveDependencies[
        step.stepID
      ].concat(transitiveDependencies[dependency] || []);
    }
  }

  for (let step of incompleteSteps) {
    let dependenciesComplete = true;

    for (let dependencyID of transitiveDependencies[step.stepID] || []) {
      if (!completeSteps[dependencyID]) {
        dependenciesComplete = false;
        break;
      }
    }

    if (dependenciesComplete) {
      nextSteps.push(step);
    }
  }

  return nextSteps;
}

/**
 * Generates an execution context which is used to interpolate parameters into steps (ViewStep, MethodCallSteps).
 * @param checklist - checklist being executed
 * @returns execution context -
 */
export function generateExecutionContext(
  checklist: Checklist
): ExecutionContext {
  let completeSteps = checklist.steps.filter(isStepComplete);
  let context: { [k: string]: StepResult } = {};

  completeSteps.forEach((step) => {
    switch (step.stepType) {
      case "manual":
        context[step.stepID] = {
          success: true,
          value: step.value,
          executing: false,
        };
        break;
      case "view":
        context[step.stepID] = {
          success: true,
          value: step.output,
          executing: false,
        };
        break;
      case "raw":
        context[step.stepID] = {
          success: step.success !== undefined ? step.success : false,
          value: step.txHash,
          executing: false,
        };
        break;
      case "method":
        context[step.stepID] = {
          success: step.success !== undefined ? step.success : false,
          value: step.output,
          executing: false,
        };
        break;
    }
  });

  return context;
}
