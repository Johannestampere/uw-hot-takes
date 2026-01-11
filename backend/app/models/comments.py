import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, Text, Float, Boolean, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import relationship
from app.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    take_id = Column(UUID(as_uuid=True), ForeignKey("takes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("comments.id"), nullable=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    toxicity_score = Column(Float, nullable=True)
    is_hidden = Column(Boolean, default=False, nullable=False)
    is_flagged = Column(Boolean, default=False, nullable=False)

    take = relationship("Take", back_populates="comments")
    user = relationship("User", back_populates="comments")
    parent = relationship("Comment", remote_side=[id], backref="replies")

    __table_args__ = (
        Index("ix_comments_take_created", take_id, created_at.desc()),
    )
