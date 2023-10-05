import { assert } from "chai";

import {
  BaseStep,
  Checklist,
  cycles,
  InputStep,
  isStepComplete,
  MethodCallStep,
  nextSteps,
  RawStep,
  Step,
  ViewStep,
} from "../checklist";

function baseStep(): BaseStep {
  return {
    stepID: "lol",
    executor: "friend",
    dependsOn: [],
  };
}

describe("isStepComplete", function () {
  it("handles InputSteps correctly", function () {
    const step: InputStep = {
      ...baseStep(),
      stepType: "manual",
    };

    assert.notExists(step.value, "step should not yet have a value");
    assert.isFalse(
      isStepComplete(step),
      "step should not be complete without a value"
    );

    step.value = "hello";
    assert.isTrue(
      isStepComplete(step),
      "step should be complete once it has a value"
    );
  });

  it("handles ViewSteps correctly", function () {
    const step: ViewStep = {
      ...baseStep(),
      stepType: "view",
      chainID: "1",
      to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      methodABI: {
        inputs: [],
        name: "decimals",
        outputs: [
          {
            name: "",
            type: "uint256",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
      params: [],
    };

    assert.notExists(step.output, "step should not yet have an output");
    assert.isFalse(
      isStepComplete(step),
      "step should not be complete without an output"
    );

    step.output = "6";
    assert.isTrue(
      isStepComplete(step),
      "step should be complete once it has an output"
    );
  });

  it("handles RawSteps correctly", function () {
    const step: RawStep = {
      ...baseStep(),
      stepType: "raw",
      chainID: "1",
      to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      calldata:
        "a9059cbb000000000000000000000000000000000000000000000000000000000000dead00000000000000000000000000000000000000000000000000000000000f4240",
      methodABI: {
        inputs: [
          {
            name: "recipient",
            type: "address",
          },
          {
            name: "amount",
            type: "uint256",
          },
        ],
        name: "transfer",
        outputs: [
          {
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "nonpayable",
        type: "function",
      },
      value: "0",
    };

    assert.notExists(step.txHash, "step should not yet have a txHash");
    assert.isFalse(
      isStepComplete(step),
      "step should not be complete without a txHash"
    );

    step.txHash = "0x0";
    assert.isTrue(
      isStepComplete(step),
      "step should be complete once it has a txHash"
    );
  });

  it("handles MethodCallSteps correctly", function () {
    const step: MethodCallStep = {
      ...baseStep(),
      stepType: "call",
      chainID: "1",
      to: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      methodABI: {
        inputs: [
          {
            name: "recipient",
            type: "address",
          },
          {
            name: "amount",
            type: "uint256",
          },
        ],
        name: "transfer",
        outputs: [
          {
            name: "",
            type: "bool",
          },
        ],
        stateMutability: "nonpayable",
        type: "function",
      },
      params: ["0xdead", "1000000"],
      value: "0",
    };

    assert.notExists(step.txHash, "step should not yet have a txHash");
    assert.isFalse(
      isStepComplete(step),
      "step should not be complete without a txHash"
    );

    step.txHash = "0x0";
    assert.isTrue(
      isStepComplete(step),
      "step should be complete once it has a txHash"
    );
  });
});

describe("nextSteps", function () {
  it("handles fresh, linear checklists correctly", function () {
    const checklist: Checklist = {
      requester: "0xdead",
      steps: [
        {
          stepType: "manual",
          executor: "friend",
          stepID: "a",
          dependsOn: [],
        },
        {
          stepType: "manual",
          executor: "friend",
          stepID: "b",
          dependsOn: ["a"],
        },
        {
          stepType: "manual",
          executor: "friend",
          stepID: "c",
          dependsOn: ["b"],
        },
      ],
    };

    const next = nextSteps(checklist);
    assert.deepEqual(
      next.map((step) => step.stepID),
      ["a"]
    );
  });

  it("handles linear checklists with a completed step correctly", function () {
    const checklist: Checklist = {
      requester: "0xdead",
      steps: [
        {
          stepType: "manual",
          executor: "friend",
          stepID: "a",
          dependsOn: [],
          value: "1",
        },
        {
          stepType: "manual",
          executor: "friend",
          stepID: "b",
          dependsOn: ["a"],
        },
        {
          stepType: "manual",
          executor: "friend",
          stepID: "c",
          dependsOn: ["b"],
        },
      ],
    };

    const next = nextSteps(checklist);
    assert.deepEqual(
      next.map((step) => step.stepID),
      ["b"]
    );
  });

  it("handles linear checklists with a completed INTERMEDIATE step correctly", function () {
    const checklist: Checklist = {
      requester: "0xdead",
      steps: [
        {
          stepType: "manual",
          executor: "friend",
          stepID: "a",
          dependsOn: [],
        },
        {
          stepType: "manual",
          executor: "friend",
          stepID: "b",
          dependsOn: ["a"],
          value: "rofl",
        },
        {
          stepType: "manual",
          executor: "friend",
          stepID: "c",
          dependsOn: ["b"],
        },
      ],
    };

    const next = nextSteps(checklist);
    assert.deepEqual(
      next.map((step) => step.stepID),
      ["a"]
    );
  });
});

describe("cycles", function () {
  it("detects trivial cycles in checklist steps", function () {
    let steps: Step[] = [
      {
        stepType: "manual",
        executor: "friend",
        stepID: "a",
        dependsOn: ["b"],
      },
      {
        stepType: "manual",
        executor: "friend",
        stepID: "b",
        dependsOn: ["a"],
      },
    ];

    const result = cycles(steps);
    const stepIDs = result.map((step) => step.stepID);

    assert.deepEqual(stepIDs, ["a", "b"]);
  });

  it("does not detect cycles in cycle-free checklist steps", function () {
    let steps: Step[] = [
      {
        stepType: "manual",
        executor: "friend",
        stepID: "a",
        dependsOn: [],
      },
      {
        stepType: "manual",
        executor: "friend",
        stepID: "b",
        dependsOn: ["a"],
      },
      {
        stepType: "manual",
        executor: "friend",
        stepID: "c",
        dependsOn: ["b"],
      },
      {
        stepType: "manual",
        executor: "friend",
        stepID: "d",
        dependsOn: ["a"],
      },
    ];

    const result = cycles(steps);
    const stepIDs = result.map((step) => step.stepID);

    assert.deepEqual(stepIDs, []);
  });

  it("detects complex cycles in checklist steps", function () {
    let steps: Step[] = [
      {
        stepType: "manual",
        executor: "friend",
        stepID: "a",
        dependsOn: [],
      },
      {
        stepType: "manual",
        executor: "friend",
        stepID: "b",
        dependsOn: ["a"],
      },
      {
        stepType: "manual",
        executor: "friend",
        stepID: "c",
        dependsOn: ["b"],
      },
      {
        stepType: "manual",
        executor: "friend",
        stepID: "d",
        dependsOn: ["a"],
      },
      {
        stepType: "manual",
        executor: "friend",
        stepID: "e",
        dependsOn: ["d", "f"],
      },
      {
        stepType: "manual",
        executor: "friend",
        stepID: "f",
        dependsOn: ["d", "g"],
      },
      {
        stepType: "manual",
        executor: "friend",
        stepID: "g",
        dependsOn: ["d", "e"],
      },
    ];

    const result = cycles(steps);
    const stepIDs = result.map((step) => step.stepID);

    assert.deepEqual(stepIDs, ["e", "f", "g"]);
  });
});
