"""Add project milestone progress

Revision ID: f4a7b8c9d0e1
Revises: e3f4a5b6c7d8
Create Date: 2026-05-12 12:05:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f4a7b8c9d0e1"
down_revision = "e3f4a5b6c7d8"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "project_milestones",
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_check_constraint(
        "ck_project_milestones_progress_range",
        "project_milestones",
        "progress >= 0 AND progress <= 100",
    )
    op.execute(
        """
        UPDATE project_milestones
        SET progress = CASE WHEN is_complete THEN 100 ELSE 0 END
        """
    )


def downgrade():
    op.drop_constraint(
        "ck_project_milestones_progress_range",
        "project_milestones",
        type_="check",
    )
    op.drop_column("project_milestones", "progress")
