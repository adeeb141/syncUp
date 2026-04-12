-- Migration: Add review_remarks column to tasks table
-- Run this against your PostgreSQL database

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS review_remarks TEXT DEFAULT NULL;
