// Man pages — short, command-specific. `man elijah` is a separate easter egg
// authored in the same shape so the man command treats it uniformly.
// Facts that have a single source elsewhere (the theme list, Elijah's role)
// are interpolated so this page can't drift from them.
import { ELIJAH } from "@/lib/elijah";
import { VALID_THEMES } from "./helpers";

export const MAN_PAGES: Record<string, string[]> = {
  ls: [
    "LS(1)",
    "    list directory contents",
    "    -a   include entries starting with .",
    "    -l   long listing (perms, owner, size)",
    "    -la  combined.",
  ],
  cd: ["CD(1)", "    change directory.", "    cd ~       go home", "    cd -       previous (not tracked)"],
  cat: ["CAT(1)", "    concatenate and print files.", "    cat file [file ...]"],
  pwd: ["PWD(1)", "    print working directory."],
  echo: ["ECHO(1)", "    print arguments. expands $USER $HOME $PWD $SHELL."],
  history: ["HISTORY(1)", "    list previous commands. sudo passwords excluded."],
  help: ["HELP(1)", "    list public commands."],
  open: [
    "OPEN(1)",
    "    open a window in the desktop. takes an app id.",
    "    open about     /about window",
    "    open /about    same",
  ],
  theme: ["THEME(1)", "    set the appearance theme.", `    themes: ${VALID_THEMES.join(", ")}`],
  whoami: ["WHOAMI(1)", "    print current user."],
  exit: ["EXIT(1)", "    close this terminal."],
  sudo: ["SUDO(1)", "    execute a command as another user.", "    sudo <command>"],
  elijah: [
    "ELIJAH(1)",
    `    ${ELIJAH.role.toLowerCase()}. background in fp&a, cloud spend,`,
    "    forecasting. now building ai-native software-spend tooling.",
    "    side projects: juuls verne (music), wobbles (cat).",
    "",
    "    not slideware. not ai theater. working interfaces, real workflows.",
    "",
    "SEE ALSO  /about, /resume, /projects",
  ],
};
