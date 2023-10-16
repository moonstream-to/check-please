import { terminal } from "terminal-kit";

export function edit(checklistFile: string): void {
  terminal.clear();
  terminal.bold.underline("Check, Please\n\n");
  terminal("Press CTRL+C to exit\n\n");

  terminal("Checklist file: ").cyan(checklistFile).white("\n\n");

  terminal("Press ENTER to add a new item\n");
  terminal("Press SPACE to toggle an item\n");
  terminal("Press BACKSPACE to remove an item\n");
  terminal("Press CTRL+X to save and exit\n\n");

  terminal("Checklist:\n\n");

  terminal.grabInput({ mouse: "button" });

  terminal.on("key", (key: string) => {
    if (key === "CTRL_X") {
      terminal.grabInput(false);
      terminal.clear();
      terminal.bold.underline("Check, Please\n\n");
      terminal("Press CTRL+C to exit\n\n");
      terminal("Checklist file: ").cyan(checklistFile).white("\n\n");
      terminal("Saving checklist...\n");
      terminal("Checklist saved!\n\n");
      terminal("Press ENTER to exit\n");
      terminal.on("key", (key: string) => {
        if (key === "ENTER") {
          terminal.grabInput(false);
          terminal.clear();
          terminal.bold.underline("Check, Please\n\n");
          terminal("Press CTRL+C to exit\n\n");
          terminal("Checklist file: ").cyan(checklistFile).white("\n\n");
          terminal("Goodbye!\n");
          terminal.processExit(0);
        }
      });
    }
  });
}
