"""Add unique constraint for project status names

Revision ID: e3f4a5b6c7d8
Revises: 9dffc568fec6
Create Date: 2026-05-12 11:25:00.000000

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "e3f4a5b6c7d8"
down_revision = "9dffc568fec6"
branch_labels = None
depends_on = None


def upgrade():
    # Keep the oldest row for each status name, point projects at it, then
    # remove duplicates before enforcing uniqueness.
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                status_name,
                first_value(id) OVER (
                    PARTITION BY status_name
                    ORDER BY id
                ) AS keep_id,
                row_number() OVER (
                    PARTITION BY status_name
                    ORDER BY id
                ) AS row_num
            FROM project_status_types
        )
        UPDATE projects
        SET current_status_id = ranked.keep_id
        FROM ranked
        WHERE projects.current_status_id = ranked.id
          AND ranked.row_num > 1
        """
    )
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                row_number() OVER (
                    PARTITION BY status_name
                    ORDER BY id
                ) AS row_num
            FROM project_status_types
        )
        DELETE FROM project_status_types
        USING ranked
        WHERE project_status_types.id = ranked.id
          AND ranked.row_num > 1
        """
    )
    op.create_unique_constraint(
        "uq_project_status_types_status_name",
        "project_status_types",
        ["status_name"],
    )


def downgrade():
    op.drop_constraint(
        "uq_project_status_types_status_name",
        "project_status_types",
        type_="unique",
    )
