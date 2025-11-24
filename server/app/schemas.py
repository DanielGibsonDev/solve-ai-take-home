from pydantic import BaseModel, ConfigDict
from datetime import datetime
from app.models import EventType


class DocumentBase(BaseModel):
    content: str


class DocumentRead(DocumentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class DocumentVersionBase(BaseModel):
    content: str


class DocumentVersionRead(DocumentVersionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    version_number: int
    created_at: datetime
    created_by: str


class DocumentVersionCreate(BaseModel):
    pass  # No fields needed - will copy from current active version


class AuditEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: EventType
    user_name: str
    document_id: int
    version_id: int
    timestamp: datetime
    lines_changed: int | None


class ContentSnapshotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    content_snapshot: str
