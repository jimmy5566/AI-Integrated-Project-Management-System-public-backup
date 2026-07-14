"""backfill project assignment role id

Revision ID: d9a2f6c1b8e3
Revises: c8f2b1d7e904
Create Date: 2026-05-08 22:18:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "d9a2f6c1b8e3"
down_revision = "c8f2b1d7e904"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'project_assignments'
                  AND column_name = 'role_id'
            ) THEN
                ALTER TABLE project_assignments ADD COLUMN role_id UUID;
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_class r ON r.oid = c.confrelid
                JOIN unnest(c.conkey) WITH ORDINALITY cols(attnum, ord) ON TRUE
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = cols.attnum
                WHERE c.contype = 'f'
                  AND t.relname = 'project_assignments'
                  AND r.relname = 'roles'
                  AND a.attname = 'role_id'
            ) THEN
                ALTER TABLE project_assignments
                ADD CONSTRAINT fk_project_assignments_role_id_roles
                FOREIGN KEY (role_id) REFERENCES roles (id);
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    pass
