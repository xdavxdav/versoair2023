const fs = require("node:fs");
const path = require("node:path");

const lockRoot = path.resolve(process.cwd(), ".agent-task-locks");
const [command, ...args] = process.argv.slice(2);

function normalizeFiles(value) {
  return (value || "")
    .split(",")
    .map((file) => file.trim().replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, ""))
    .filter(Boolean)
    .sort();
}

function readLock(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function ensureLockRoot() {
  fs.mkdirSync(lockRoot, { recursive: true });
}

function listLocks() {
  ensureLockRoot();
  return fs.readdirSync(lockRoot)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readLock(path.join(lockRoot, name)))
    .filter(Boolean);
}

function overlaps(left, right) {
  return left.some((file) =>
    right.some((other) =>
      file === other ||
      file.startsWith(`${other}/`) ||
      other.startsWith(`${file}/`)
    )
  );
}

if (command === "claim") {
  const agent = args[0];
  const taskId = args[1];
  const filesFlag = args.indexOf("--files");
  const files = normalizeFiles(filesFlag >= 0 ? args.slice(filesFlag + 1).join(",") : "");

  if (!agent || !taskId || files.length === 0) {
    console.error("Usage: agent-task-lock.cjs claim <agent> <task-id> --files <comma-separated-paths>");
    process.exit(1);
  }

  ensureLockRoot();
  const lockFile = path.join(lockRoot, `${taskId.replace(/[^a-zA-Z0-9_-]/g, "-")}.json`);
  if (fs.existsSync(lockFile)) {
    console.error(`Task already claimed: ${taskId}`);
    process.exit(2);
  }

  for (const lock of listLocks()) {
    if (overlaps(files, lock.files)) {
      console.error(`File conflict with ${lock.agent}/${lock.taskId}: ${files.join(", ")}`);
      process.exit(3);
    }
  }

  const lock = {
    agent,
    taskId,
    files,
    claimedAt: new Date().toISOString(),
  };
  fs.writeFileSync(lockFile, `${JSON.stringify(lock, null, 2)}\n`, { flag: "wx" });
  console.log(`Claimed ${taskId} by ${agent}`);
  console.log(files.join("\n"));
} else if (command === "release") {
  const taskId = args[0];
  if (!taskId) {
    console.error("Usage: agent-task-lock.cjs release <task-id>");
    process.exit(1);
  }

  const lockFile = path.join(lockRoot, `${taskId.replace(/[^a-zA-Z0-9_-]/g, "-")}.json`);
  if (!fs.existsSync(lockFile)) {
    console.log(`No active claim: ${taskId}`);
  } else {
    fs.unlinkSync(lockFile);
    console.log(`Released ${taskId}`);
  }
} else if (command === "list" || !command) {
  const locks = listLocks();
  if (locks.length === 0) {
    console.log("No active task claims");
  } else {
    for (const lock of locks) {
      console.log(`${lock.taskId}\t${lock.agent}\t${lock.files.join(",")}`);
    }
  }
} else {
  console.error("Usage: agent-task-lock.cjs <claim|release|list>");
  process.exit(1);
}
