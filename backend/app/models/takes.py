import uuid
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, Text, Integer, Float, Boolean, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import relationship
from app.database import Base

class Take(Base):
    __tablename__ = "takes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    like_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    toxicity_score = Column(Float, nullable=True)
    is_hidden = Column(Boolean, default=False, nullable=False)
    is_flagged = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="takes")
    comments = relationship("Comment", back_populates="take", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="take", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_takes_created_at_desc", created_at.desc()),
    )