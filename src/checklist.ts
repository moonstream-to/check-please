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

export interface InputStep extends BaseStep {
  stepType: "manual";

  // The value that the executor should input.
  value?: any;
}

export interface ViewStep extends BaseStep {
  stepType: "view";

  // The chainID of the chain that the view call should be executed on.
  chainID: string;

  // The address of the contract that the view call should be executed on.
  to: string;

  // The ABI of the method that should be called.
  methodABI: object;

  // The parameters that should be passed to the method.
  params: any[];

  // The output of the view call (to be populated once it has been executed).
  output?: any;

  // The block hash at which the view call was executed (to be populated once it has been executed).
  blockHash?: string;
}

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
  methodABI?: object;

  // The transaction hash for the transaction (to be populated once it has been executed).
  txHash?: string;
}

export interface MethodCallStep extends BaseStep {
  stepType: "call";

  // The chainID of the chain that the transaction should be executed on.
  chainID: string;

  // The address of the contract that the transaction should be executed on.
  to: string;

  // The ABI of the method that should be called.
  methodABI: object;

  // The parameters that should be passed to the method.
  params: any[];

  // The value to be sent with the transaction. These should be denominated in the smallest denomination
  // of the chain's native token. For example, on Ethereum, Wei.
  value?: string;

  // The transaction hash for the transaction (to be populated once it has been executed).
  txHash?: string;

  // The output, if any, of the method call (to be populated once it has been executed).
  output?: any;
}

// Step is the union of all the step types. They can be distinguished using the "stepType" property.
export type Step = InputStep | ViewStep | RawStep | MethodCallStep;

export function isStepComplete(step: Step): boolean {
  switch (step.stepType) {
    case "manual":
      return step.value !== undefined;
    case "view":
      return step.output !== undefined;
    case "raw":
      return step.txHash !== undefined;
    case "call":
      return step.txHash !== undefined;
  }
}

export interface Checklist {
  requester: string;
  description?: string;
  steps: Step[];
}
