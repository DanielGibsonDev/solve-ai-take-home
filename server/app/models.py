from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from app.internal.db import Base


class EventType(str, enum.Enum):
    """Types of audit events that can be tracked"""
    SAVE = "save"
    CREATE_VERSION = "create_version"


class Document(Base):
    __tablename__ = "document"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    versions = relationship("DocumentVersion", back_populates="document")


class DocumentVersion(Base):
    __tablename__ = "document_version"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("document.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = Column(String, default="Daniel", nullable=False)
    
    document = relationship("Document", back_populates="versions")


class AuditEvent(Base):
    __tablename__ = "audit_event"
    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(Enum(EventType), nullable=False)
    user_name = Column(String, default="Daniel", nullable=False)
    document_id = Column(Integer, ForeignKey("document.id"), nullable=False)
    version_id = Column(Integer, ForeignKey("document_version.id"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    lines_changed = Column(Integer, nullable=True)  # Only for save events
    content_snapshot = Column(String, nullable=False)  # Full content at this point


# Include your models here, and they will automatically be created as tables in the database on start-up
