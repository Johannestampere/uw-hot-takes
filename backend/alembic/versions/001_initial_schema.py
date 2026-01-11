from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('username', sa.String(50), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('google_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    op.create_index('ix_users_google_id', 'users', ['google_id'], unique=True)

    op.create_table(
        'takes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('like_count', sa.Integer(), default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('toxicity_score', sa.Float(), nullable=True),
        sa.Column('is_hidden', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_flagged', sa.Boolean(), default=False, nullable=False),
    )
    op.create_index('ix_takes_user_id', 'takes', ['user_id'])
    op.create_index('ix_takes_created_at_desc', 'takes', [sa.text('created_at DESC')])

    op.create_table(
        'likes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('take_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('takes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_likes_take_id', 'likes', ['take_id'])
    op.create_unique_constraint('uq_likes_take_user', 'likes', ['take_id', 'user_id'])

    op.create_table(
        'comments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('take_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('takes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('comments.id'), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('toxicity_score', sa.Float(), nullable=True),
        sa.Column('is_hidden', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_flagged', sa.Boolean(), default=False, nullable=False),
    )
    op.create_index('ix_comments_take_id', 'comments', ['take_id'])
    op.create_index('ix_comments_take_created', 'comments', ['take_id', sa.text('created_at DESC')])

    op.create_table(
        'reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('target_type', sa.String(20), nullable=False),
        sa.Column('target_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('reporter_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

def downgrade() -> None:
    op.drop_table('reports')
    op.drop_table('comments')
    op.drop_table('likes')
    op.drop_table('takes')
    op.drop_table('users')