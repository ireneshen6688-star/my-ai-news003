-- Migration 003: Add PayPal subscription tracking to users

ALTER TABLE users ADD COLUMN paypal_subscription_id TEXT; -- PayPal subscription ID (I-XXXX)
