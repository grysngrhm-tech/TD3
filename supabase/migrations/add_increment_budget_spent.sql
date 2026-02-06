-- Migration: add_increment_budget_spent
-- Description: Atomic budget spent_amount increment RPC to eliminate the read-then-write
-- race condition in updateBudgetSpendForDraw(). Uses UPDATE ... RETURNING for atomicity.

CREATE OR REPLACE FUNCTION increment_budget_spent(
  p_budget_id UUID,
  p_amount NUMERIC
)
RETURNS TABLE(new_spent_amount NUMERIC, current_amount NUMERIC) AS $$
BEGIN
  RETURN QUERY
  UPDATE budgets
  SET spent_amount = COALESCE(spent_amount, 0) + p_amount
  WHERE id = p_budget_id
  RETURNING spent_amount, budgets.current_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
