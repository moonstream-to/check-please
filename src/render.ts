import { Terminal } from "terminal-kit";

import {
  Checklist,
  InputStep,
  MethodStep,
  RawStep,
  ViewStep,
  Step,
} from "./checklist";

export const DEFAULT_WIDTH = 100;

export interface RenderOptions {
  width?: number;
}

export function render(
  terminal: Terminal,
  checklist: Checklist,
  opts: RenderOptions
): void {
  checklist.steps.forEach((step) => renderStep(terminal, step, opts));
}

export function renderStep(
  terminal: Terminal,
  step: Step,
  opts: RenderOptions
): void {
  let rows: string[][] = [["ID", step.stepID]];
  if (step.description) {
    rows.push(["Description", step.description]);
  }

  terminal.table(rows, {
    hasBorder: true,
    width: Math.floor((opts.width || DEFAULT_WIDTH) * 0.8),
    fit: true,
    contentHasMarkup: true,
    firstColumnTextAttr: { bgColor: "blue" },
    firstRowTextAttr: { bgColor: "blue" },
  });
}
