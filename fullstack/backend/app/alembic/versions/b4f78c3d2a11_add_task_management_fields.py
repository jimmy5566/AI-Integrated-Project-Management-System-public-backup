"""add task management fields

Revision ID: b4f78c3d2a11
Revises: c069018ea5e2
Create Date: 2026-05-06 16:40:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b4f78c3d2a11"
down_revision = "c069018ea5e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("project_tasks", sa.Column("parent_task_id", sa.Uuid(), nullable=True))
    op.add_column("project_tasks", sa.Column("due_date", sa.Date(), nullable=True))
    op.add_column("project_tasks", sa.Column("assigned_role_id", sa.Uuid(), nullable=True))
    op.add_column("project_tasks", sa.Column("allocated_hours", sa.Numeric(8, 2), nullable=True))
    op.add_column("project_tasks", sa.Column("subcontractor_id", sa.Uuid(), nullable=True))
    op.add_column("project_tasks", sa.Column("subcontractor_status", sa.String(length=50), nullable=True))
    op.add_column("project_tasks", sa.Column("subcontractor_ordered_date", sa.Date(), nullable=True))

    op.create_foreign_key(
        "fk_project_tasks_parent_task_id_project_tasks",
        "project_tasks",
        "project_tasks",
        ["parent_task_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_project_tasks_assigned_role_id_roles",
        "project_tasks",
        "roles",
        ["assigned_role_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_project_tasks_subcontractor_id_subcontractors",
        "project_tasks",
        "subcontractors",
        ["subcontractor_id"],
        ["id"],
    )

    op.execute(
        """
        UPDATE project_tasks
        SET subcontractor_status = 'N/A'
        WHERE subcontractor_status IS NULL
        """
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_project_tasks_subcontractor_id_subcontractors",
        "project_tasks",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_project_tasks_assigned_role_id_roles",
        "project_tasks",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_project_tasks_parent_task_id_project_tasks",
        "project_tasks",
        type_="foreignkey",
    )

    op.drop_column("project_tasks", "subcontractor_ordered_date")
    op.drop_column("project_tasks", "subcontractor_status")
    op.drop_column("project_tasks", "subcontractor_id")
    op.drop_column("project_tasks", "allocated_hours")
    op.drop_column("project_tasks", "assigned_role_id")
    op.drop_column("project_tasks", "due_date")
    op.drop_column("project_tasks", "parent_task_id")
