-- Migration: add_budget_status_trigger
-- Description: Apply the budget recalculation trigger that fires when draw_requests.status changes
-- This trigger recalculates ALL budget spent_amounts for lines in a draw when status
-- changes to/from 'approved'/'paid'/'funded', providing a database-level safety net.

CREATE OR REPLACE FUNCTION update_budgets_on_draw_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only fire if status changed to or from a "counted" status
    IF (OLD.status IS DISTINCT FROM NEW.status) AND
       (OLD.status IN ('approved', 'paid', 'funded') OR
        NEW.status IN ('approved', 'paid', 'funded')) THEN

        -- Recalculate ALL budgets for lines in this draw
        UPDATE budgets b
        SET spent_amount = (
            SELECT COALESCE(SUM(drl.amount_requested), 0)
            FROM draw_request_lines drl
            JOIN draw_requests dr ON drl.draw_request_id = dr.id
            WHERE drl.budget_id = b.id
            AND dr.status IN ('approved', 'paid', 'funded')
        )
        WHERE b.id IN (
            SELECT DISTINCT budget_id
            FROM draw_request_lines
            WHERE draw_request_id = NEW.id
            AND budget_id IS NOT NULL
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_budgets_on_draw_status
    AFTER UPDATE ON draw_requests
    FOR EACH ROW EXECUTE FUNCTION update_budgets_on_draw_status_change();
