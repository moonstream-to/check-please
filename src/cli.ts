#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "fs";

import { Command } from "commander";

import { edit } from "./tui";

const program = new Command();

// Version should match the version in package.json
program.name("checkpls").description("Check, Please CLI").version("0.1.0");

program
  .command("edit")
  .description("Create a checklist")
  .option("-c, --checklist <file>", "path to checklist JSON file")
  .action((options) => {
    if (!options.checklist) {
      console.error("Missing required argument: -c/--checklist");
      process.exit(1);
    }
    if (!existsSync(options.checklist)) {
      console.warn(`Creating checklist file at: ${options.checklist}`);
      writeFileSync(options.checklist, JSON.stringify({}));
    }

    edit(options.checklist);
  });

program
  .command("execute")
  .description("Execute a checklist")
  .option("-c, --checklist <file>", "path to checklist file")
  .option("-k, --keyfile <file>", "path to account keyfile")
  .option("-p, --password <str>", "password for account keyfile")
  .action((options) => {
    if (!options.checklist) {
      console.error("Missing required argument: -c/--checklist");
      process.exit(1);
    }
    if (!existsSync(options.checklist)) {
      console.error(`Checklist file not found: ${options.checklist}`);
      process.exit(1);
    }
    const checklistRaw = readFileSync(options.checklist);
    const checklist = JSON.parse(checklistRaw.toString());

    console.log(JSON.stringify(checklist, null, 4));
  });

program.parse(process.argv);
