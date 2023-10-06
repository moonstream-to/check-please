/**
 * @file Defines functions that complete each type of step. Each completer takes an execution context
 * and a step as an input, and returns an asynchronous function which:
 * 1. mutates the step to complete it
 * 2. mutates the execution context to record the result of the step
 *
 * @module completers
 */

import Handlebars from "handlebars";
import { Address, PayableCallOptions, Transaction, Web3 } from "web3";

import {
  ExecutionContext,
  InputStep,
  MethodStep,
  RawStep,
  StepResult,
  ViewStep,
} from "./checklist";
import { exec } from "child_process";

export function completeInputStep(
  executionContext: ExecutionContext,
  step: InputStep
): (value: string) => Promise<void> {
  return async function (value: string) {
    if (executionContext[step.stepID] === undefined) {
      executionContext[step.stepID] = { executing: true };
    }

    step.value = value;
    executionContext[step.stepID] = { success: true, value, executing: false };
  };
}

export function completeMethodStep(
  executionContext: ExecutionContext,
  step: MethodStep
): (
  sender: Address,
  web3: Web3,
  userTxConfig?: PayableCallOptions
) => Promise<void> {
  return async function (sender: Address, web3: Web3, userTxConfig?: object) {
    if (executionContext[step.stepID] === undefined) {
      executionContext[step.stepID] = { executing: true };
    }

    const chainIDRaw = await web3.eth.getChainId();
    const chainID: string = chainIDRaw.toString();
    if (chainID !== step.chainID) {
      throw new Error(
        `You are attempting to submit this transaction on the wrong chain: step = ${step.chainID}, actual = ${chainID}`
      );
    }

    const contractABI = [step.methodABI];
    const methodSignature = web3.eth.abi.encodeFunctionSignature(
      step.methodABI
    );
    const contract = new web3.eth.Contract(contractABI, step.to);
    let txConfig: PayableCallOptions = {};
    if (userTxConfig !== undefined) {
      txConfig = { ...userTxConfig };
    }
    txConfig.from = sender;
    txConfig.value = step.value;

    let args: string[] = [];
    for (let param of step.params) {
      const paramTemplate = Handlebars.compile(param);
      args.push(paramTemplate(executionContext));
    }

    // @ts-ignore
    const methodTransaction = contract.methods[methodSignature](...args);

    methodTransaction
      .send(txConfig)
      .once("transactionHash", function (hash) {
        step.txHash = hash.toString();
      })
      .on("error", function (error) {
        step.output = error.toJSON();
      });

    await methodTransaction;

    executionContext[step.stepID] = {
      success: true,
      value: step.output,
      executing: false,
    };
  };
}

export function completeRawStep(
  executionContext: ExecutionContext,
  step: RawStep
): (
  sender: Address,
  web3: Web3,
  userTxConfig?: PayableCallOptions
) => Promise<void> {
  return async function (
    sender: Address,
    web3: Web3,
    userTxConfig?: PayableCallOptions
  ) {
    if (executionContext[step.stepID] === undefined) {
      executionContext[step.stepID] = { executing: true };
    }

    let transaction: Transaction = {
      from: sender,
      to: step.to,
      data: step.calldata,
      value: step.value,
      chainId: step.chainID,
    };

    if (userTxConfig !== undefined) {
      transaction = { ...transaction, ...userTxConfig };
    }

    const signedTransaction = await web3.eth.signTransaction(transaction);
    const txHash = await web3.eth.sendSignedTransaction(signedTransaction.raw);

    step.txHash = txHash.toString();
    step.success = true;

    executionContext[step.stepID] = {
      success: true,
      executing: false,
    };
  };
}

export function completeViewStep(
  executionContext: ExecutionContext,
  step: ViewStep
): (web3: Web3, blockNumber: string) => Promise<void> {
  return async function (web3: Web3, blockNumber: string) {
    if (executionContext[step.stepID] === undefined) {
      executionContext[step.stepID] = { executing: true };
    }

    const chainIDRaw = await web3.eth.getChainId();
    const chainID: string = chainIDRaw.toString();
    if (chainID !== step.chainID) {
      throw new Error(
        `You are attempting to query the wrong chain: step = ${step.chainID}, actual = ${chainID}`
      );
    }

    const contractABI = [step.methodABI];
    const methodSignature = web3.eth.abi.encodeFunctionSignature(
      step.methodABI
    );
    const contract = new web3.eth.Contract(contractABI, step.to);

    let args: string[] = [];
    for (let param of step.params) {
      const paramTemplate = Handlebars.compile(param);
      args.push(paramTemplate(executionContext));
    }

    // @ts-ignore
    const methodTransaction = contract.methods[methodSignature](...args);

    const block = await web3.eth.getBlock(blockNumber);
    const result = await methodTransaction.call(undefined, block.number);

    step.output = result;
    step.blockNumber = blockNumber.toString();
    step.blockHash = block.hash ? block.hash.toString() : "unknown";

    executionContext[step.stepID] = {
      success: true,
      value: step.output,
      executing: false,
    };
  };
}
