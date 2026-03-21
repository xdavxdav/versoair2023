#!/usr/bin/env expect -f
# Auto-accept all "create table" prompts in drizzle-kit push
set timeout 120
spawn npx drizzle-kit push
# For each interactive prompt, press Enter to accept the first option (create table)
while {1} {
  expect {
    "create table" {
      send "\r"
    }
    "Yes, I want to" {
      send "\r"
    }
    "abort" {
      send "\r"
    }
    eof {
      break
    }
    timeout {
      break
    }
  }
}
