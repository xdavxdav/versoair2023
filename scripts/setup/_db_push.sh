#!/bin/bash
# Auto-accept all interactive prompts in drizzle-kit push
# Pipes "yes" to auto-confirm create table / migration prompts
yes | npx drizzle-kit push
