-- Migration: Upgrade tickets table schema and create ticket_assignments audit table
-- This script adds missing columns to the existing tickets table
-- and creates a new ticket_assignments table for tracking assignment history

-- First, add missing columns to the existing tickets table
-- These are safe to run even if columns already exist (if clause prevents errors)

ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general',
ADD COLUMN IF NOT EXISTS assignee_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS requester_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS sla_target_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS team VARCHAR(100),
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'portal',
ADD COLUMN IF NOT EXISTS reporter_id INTEGER REFERENCES users(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets(status);
CREATE INDEX IF NOT EXISTS tickets_priority_idx ON tickets(priority);
CREATE INDEX IF NOT EXISTS tickets_assignee_idx ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS tickets_created_at_idx ON tickets(created_at);

-- Create the ticket_assignments table for assignment history/audit trail
CREATE TABLE IF NOT EXISTS ticket_assignments (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  assigned_from INTEGER REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

-- Create indexes for ticket_assignments
CREATE INDEX IF NOT EXISTS ticket_assignments_ticket_idx ON ticket_assignments(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_assignments_assigned_to_idx ON ticket_assignments(assigned_to);
