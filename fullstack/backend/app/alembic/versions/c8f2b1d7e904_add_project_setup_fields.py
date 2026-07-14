"""add project setup fields

Revision ID: c8f2b1d7e904
Revises: b4f78c3d2a11
Create Date: 2026-05-08 22:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c8f2b1d7e904"
down_revision = "b4f78c3d2a11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("contract_title", sa.String(length=255), nullable=True))
    op.add_column("projects", sa.Column("agent", sa.String(length=255), nullable=True))
    op.add_column("projects", sa.Column("job_title", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "job_title")
    op.drop_column("projects", "agent")
    op.drop_column("projects", "contract_title")
