"""add unique constraint doc permission

Revision ID: a1b2c3d4e5f6
Revises: 3ee48d860c90
Create Date: 2026-04-15

"""

from alembic import op

revision = "a1b2c3d4e5f6"
down_revision = "3ee48d860c90"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint(
        "uq_doc_permission",
        "document_permissions",
        ["document_id", "user_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_doc_permission", "document_permissions", type_="unique")
