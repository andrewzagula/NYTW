#!/usr/bin/env node
import { Command } from "commander";
import { login } from "./commands/login.js";
import { init } from "./commands/init.js";
import { runCommitGate } from "./hooks/commit.js";

const program = new Command();

program
  .name("walkthru")
  .description("Comprehension gate for git commits")
  .version("0.1.0");

program
  .command("login")
  .description("Authenticate with GitHub")
  .action(login);

program
  .command("init")
  .description("Install the Walkthru commit hook in the current repo")
  .action(init);

const hook = program.command("hook").description("Internal hook runners (called by git)");

hook
  .command("commit-msg <msg-file>")
  .description("Run the comprehension gate")
  .action(runCommitGate);

program.parse();
