-- Migration: Add follow_up_history column to members table
-- This column was already present in visitors table but missing from members.
-- It stores the follow-up history entries as a JSONB array.

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS follow_up_history JSONB DEFAULT '[]';
