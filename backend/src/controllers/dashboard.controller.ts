import { Request, Response } from "express";
import { pool } from "../config/DB_connect";

export const getDashboardStats = async (
    req: Request<{}, {}, {}>,
    res: Response
): Promise<Response | void> => {
    try {
        const user_id = req.user?.id;

        if (!user_id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const [
            ownedWorkspacesResult,
            totalProjectsResult,
            assignedTasksResult,
            createdTasksResult,
            upcomingDeadlinesResult,
        ] = await Promise.all([
            // 1. Workspaces owned by user (with member count)
            pool.query(
                `SELECT w.id AS workspace_id, w.name, w.slug, w.created_at,
                        (SELECT COUNT(*)::int FROM workspace_members wm2 WHERE wm2.workspace_id = w.id) AS member_count
                 FROM workspaces w
                 JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = $1
                 WHERE wm.role = 'owner'
                 ORDER BY w.created_at DESC`,
                [user_id]
            ),

            // 2. Total projects user is part of
            pool.query(
                `SELECT COUNT(DISTINCT p.id)::int AS total
                 FROM projects p
                 JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $1`,
                [user_id]
            ),

            // 3. Tasks assigned to user (with status breakdown)
            pool.query(
                `SELECT
                     COUNT(*)::int AS total,
                     COUNT(*) FILTER (WHERE status = 'done')::int AS done,
                     COUNT(*) FILTER (WHERE status = 'in_review')::int AS in_review,
                     COUNT(*) FILTER (WHERE status != 'done' AND due_date IS NOT NULL AND due_date < NOW())::int AS overdue,
                     COUNT(*) FILTER (WHERE status != 'done' AND due_date IS NOT NULL AND due_date >= NOW() AND due_date < NOW() + INTERVAL '3 days')::int AS due_soon
                 FROM tasks
                 WHERE assignee_id = $1`,
                [user_id]
            ),

            // 4. Tasks created by user (with in_review count)
            pool.query(
                `SELECT
                     COUNT(*)::int AS total,
                     COUNT(*) FILTER (WHERE status = 'in_review')::int AS in_review
                 FROM tasks
                 WHERE created_by = $1`,
                [user_id]
            ),

            // 5. Upcoming deadlines (next 5 tasks assigned to user, not done, with due date)
            pool.query(
                `SELECT t.id, t.title, t.status, t.priority, t.due_date,
                        p.name AS project_name, w.name AS workspace_name
                 FROM tasks t
                 JOIN projects p ON p.id = t.project_id
                 JOIN workspaces w ON w.id = p.workspace_id
                 WHERE t.assignee_id = $1
                   AND t.status != 'done'
                   AND t.due_date IS NOT NULL
                 ORDER BY t.due_date ASC
                 LIMIT 5`,
                [user_id]
            ),
        ]);

        const assignedStats = assignedTasksResult.rows[0];
        const createdStats = createdTasksResult.rows[0];

        const completionRate =
            assignedStats.total > 0
                ? parseFloat((assignedStats.done / assignedStats.total).toFixed(2))
                : 0;

        return res.status(200).json({
            owned_workspaces: ownedWorkspacesResult.rows,
            total_projects: totalProjectsResult.rows[0].total,
            assigned_tasks: {
                total: assignedStats.total,
                overdue: assignedStats.overdue,
                due_soon: assignedStats.due_soon,
                in_review: assignedStats.in_review,
                done: assignedStats.done,
            },
            created_tasks: {
                total: createdStats.total,
                in_review: createdStats.in_review,
            },
            upcoming_deadlines: upcomingDeadlinesResult.rows,
            completion_rate: completionRate,
        });
    } catch (error) {
        const err = error as Error;
        console.error("Dashboard stats error:", err);
        return res.status(500).json({ message: err.message });
    }
};
