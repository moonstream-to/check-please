#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

// Version should match the version in package.json
program
  .name("checkpls")
  .description("Check, Please CLI")
  .version("0.1.0")
  .option("-k, --keyfile <file>", "path to account keyfile")
  .option("-p, --password <str>", "password for account keyfile")
  .action((options) => {
    console.log(options);
  });

program.parse(process.argv);
