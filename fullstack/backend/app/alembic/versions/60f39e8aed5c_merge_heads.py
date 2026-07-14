"""merge heads

Revision ID: 60f39e8aed5c
Revises: f4a7b8c9d0e1, 5f377f41d848
Create Date: 2026-05-12

"""
from typing import Sequence, Union

revision: str = "60f39e8aed5c"
down_revision: Union[str, Sequence[str], None] = ("f4a7b8c9d0e1", "5f377f41d848")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
