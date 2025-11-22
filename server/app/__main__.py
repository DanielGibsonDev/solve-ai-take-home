from contextlib import asynccontextmanager
import json
import re
from html.parser import HTMLParser

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import insert, select, update, func
from sqlalchemy.orm import Session

from app.internal.ai import AI, get_ai
from app.internal.data import DOCUMENT_1, DOCUMENT_2
from app.internal.db import Base, SessionLocal, engine, get_db

import app.models as models
import app.schemas as schemas


class HTMLTextExtractor(HTMLParser):
    """Extract plain text from HTML"""
    def __init__(self):
        super().__init__()
        self.text = []
    
    def handle_data(self, data):
        self.text.append(data)
    
    def get_text(self):
        return ' '.join(self.text)


def strip_html(html_content: str) -> str:
    """Strip HTML tags and return plain text"""
    extractor = HTMLTextExtractor()
    extractor.feed(html_content)
    text = extractor.get_text()
    # Clean up extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def validate_ai_response(data):
    """
    Validate AI response structure to handle non-deterministic LLM outputs.
    
    We check for required fields but remain flexible to allow the AI some creativity.
    In production, we'd add:
    - Field type validation (severity: "high" | "medium" | "low")
    - Content sanitization (prevent injection attacks)
    - Schema validation with Pydantic
    
    Args:
        data: The AI response dictionary to validate
    
    Returns:
        tuple: (is_valid: bool, error_message: str)
    """
    if not isinstance(data, dict):
        return False, "Response is not a JSON object"
    
    if "issues" not in data:
        return False, "Missing 'issues' key"
    
    if not isinstance(data["issues"], list):
        return False, "'issues' must be an array"
    
    # Validate each issue has minimum required fields
    for i, issue in enumerate(data["issues"]):
        if not isinstance(issue, dict):
            return False, f"Issue {i} is not an object"
        
        # Check for critical fields
        required_fields = ["description", "suggestion"]
        missing_fields = [f for f in required_fields if f not in issue]
        if missing_fields:
            return False, f"Issue {i} missing required fields: {', '.join(missing_fields)}"
        
        # Validate field types for critical fields
        if not isinstance(issue.get("description"), str) or not issue.get("description").strip():
            return False, f"Issue {i} has invalid or empty 'description'"
        
        if not isinstance(issue.get("suggestion"), str) or not issue.get("suggestion").strip():
            return False, f"Issue {i} has invalid or empty 'suggestion'"
        
        # Optional: validate severity if present
        if "severity" in issue and issue["severity"] not in ["high", "medium", "low"]:
            return False, f"Issue {i} has invalid severity: must be 'high', 'medium', or 'low'"
    
    return True, ""


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Create the database tables
    Base.metadata.create_all(bind=engine)
    # Insert seed data
    with SessionLocal() as db:
        # Create documents
        db.execute(insert(models.Document).values(id=1, content=DOCUMENT_1))
        db.execute(insert(models.Document).values(id=2, content=DOCUMENT_2))
        
        # Create initial version 1 for each document
        db.execute(insert(models.DocumentVersion).values(
            document_id=1, 
            version_number=1, 
            content=DOCUMENT_1
        ))
        db.execute(insert(models.DocumentVersion).values(
            document_id=2, 
            version_number=1, 
            content=DOCUMENT_2
        ))
        
        db.commit()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security Configuration
# Maximum document length to prevent DoS attacks and excessive API costs
MAX_DOCUMENT_LENGTH = 50000  # ~50KB of text (typical patent is 5-20KB)
MIN_DOCUMENT_LENGTH = 50      # Minimum for meaningful AI review

# Security Note: Prompt Injection and AI Safety
# ------------------------------------------------
# We implement multiple layers of defense against prompt injection and malformed AI outputs:
#
# 1. Input Validation:
#    - HTML stripping prevents markup injection
#    - Length limits prevent DoS attacks
#    - Content is treated as data, not instructions in the AI prompt
#
# 2. AI Prompt Design:
#    - System role separation (harder to override than user-only prompts)
#    - Clear task definition limits AI behavior
#    - JSON format enforcement with response_format parameter
#
# 3. Output Validation:
#    - Structured validation of AI responses (see validate_ai_response)
#    - Required field checking
#    - Type validation for critical fields
#
# 4. Error Handling:
#    - Graceful degradation on malformed responses
#    - No sensitive error details exposed to client
#
# Production Improvements:
# - Rate limiting per user/IP
# - Content filtering for suspicious patterns (e.g., "ignore previous instructions")
# - Input sanitization to remove potential injection attempts
# - User authentication and audit logging
# - Monitoring and alerting for unusual patterns
# - Output sanitization to prevent XSS


@app.websocket("/ws")
async def websocket(websocket: WebSocket, ai: AI = Depends(get_ai)):
    await websocket.accept()
    
    while True:
        try:
            # Receive HTML content from client
            html_document = await websocket.receive_text()
            print(f"Received document, length: {len(html_document)}")
            
            # Strip HTML to get plain text
            plain_text = strip_html(html_document)
            
            # Length validation - prevent DoS and ensure meaningful content
            if not plain_text or len(plain_text.strip()) < MIN_DOCUMENT_LENGTH:
                await websocket.send_json({
                    "status": "error",
                    "message": f"Document content is too short for meaningful AI review (minimum {MIN_DOCUMENT_LENGTH} characters)"
                })
                continue
            
            if len(plain_text) > MAX_DOCUMENT_LENGTH:
                await websocket.send_json({
                    "status": "error",
                    "message": f"Document too long (maximum {MAX_DOCUMENT_LENGTH} characters). Please shorten your document."
                })
                continue
            
            print(f"Stripped HTML, plain text length: {len(plain_text)}")
            
            # Send processing status
            await websocket.send_json({
                "status": "processing",
                "message": "AI is reviewing your document..."
            })
            
            # Accumulate AI response chunks
            accumulated_json = ""
            
            try:
                # Stream AI suggestions
                async for chunk in ai.review_document(plain_text):
                    if chunk:
                        accumulated_json += chunk
                
                # Try to parse the complete JSON
                try:
                    suggestions = json.loads(accumulated_json)
                    
                    # Validate AI response structure
                    is_valid, error_msg = validate_ai_response(suggestions)
                    if not is_valid:
                        raise ValueError(f"Invalid AI response structure: {error_msg}")
                    
                    # Translate "paragraph" to "claim" for better UX (patent-specific terminology)
                    # The AI returns "paragraph" but users expect "claim" for patent documents
                    if "issues" in suggestions:
                        for issue in suggestions["issues"]:
                            if "paragraph" in issue:
                                issue["claim"] = issue.pop("paragraph")
                    
                    # Send successful response
                    await websocket.send_json({
                        "status": "success",
                        "data": suggestions
                    })
                    print(f"Sent {len(suggestions.get('issues', []))} suggestions to client")
                    
                except json.JSONDecodeError as e:
                    print(f"JSON parse error: {e}")
                    print(f"Accumulated JSON: {accumulated_json[:200]}...")
                    
                    await websocket.send_json({
                        "status": "error",
                        "message": "AI response was malformed. Please try again."
                    })
                    
                except ValueError as e:
                    print(f"Validation error: {e}")
                    await websocket.send_json({
                        "status": "error",
                        "message": f"AI response validation failed: {str(e)}"
                    })
            
            except Exception as e:
                print(f"AI processing error: {e}")
                await websocket.send_json({
                    "status": "error",
                    "message": "Error processing document with AI"
                })
        
        except WebSocketDisconnect:
            print("WebSocket disconnected")
            break
        
        except Exception as e:
            print(f"Unexpected error: {e}")
            try:
                await websocket.send_json({
                    "status": "error",
                    "message": "An unexpected error occurred"
                })
            except:
                break


# Version endpoints
@app.get("/document/{document_id}/versions")
def get_versions(
    document_id: int, db: Session = Depends(get_db)
) -> list[schemas.DocumentVersionRead]:
    """Get all versions for a document"""
    versions = db.scalars(
        select(models.DocumentVersion)
        .where(models.DocumentVersion.document_id == document_id)
        .order_by(models.DocumentVersion.version_number)
    ).all()
    return versions


@app.get("/document/{document_id}/version/{version_id}")
def get_version(
    document_id: int, version_id: int, db: Session = Depends(get_db)
) -> schemas.DocumentVersionRead:
    """Get a specific version of a document"""
    version = db.scalar(
        select(models.DocumentVersion).where(
            models.DocumentVersion.id == version_id,
            models.DocumentVersion.document_id == document_id
        )
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


@app.post("/document/{document_id}/version")
def create_version(
    document_id: int, db: Session = Depends(get_db)
) -> schemas.DocumentVersionRead:
    """Create a new version by copying the latest version's content"""
    # Get the document to ensure it exists
    document = db.scalar(select(models.Document).where(models.Document.id == document_id))
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get the highest version number for this document
    max_version = db.scalar(
        select(func.max(models.DocumentVersion.version_number))
        .where(models.DocumentVersion.document_id == document_id)
    )
    
    # Get the latest version's content
    latest_version = db.scalar(
        select(models.DocumentVersion)
        .where(models.DocumentVersion.document_id == document_id)
        .order_by(models.DocumentVersion.version_number.desc())
    )
    
    if not latest_version:
        raise HTTPException(status_code=404, detail="No versions found for document")
    
    new_version_number = (max_version or 0) + 1
    
    # Create new version
    new_version = models.DocumentVersion(
        document_id=document_id,
        version_number=new_version_number,
        content=latest_version.content
    )
    db.add(new_version)
    db.commit()
    db.refresh(new_version)
    
    return new_version


@app.put("/document/{document_id}/version/{version_id}")
def update_version(
    document_id: int,
    version_id: int,
    version_data: schemas.DocumentVersionBase,
    db: Session = Depends(get_db)
) -> schemas.DocumentVersionRead:
    """Update a specific version's content"""
    version = db.scalar(
        select(models.DocumentVersion).where(
            models.DocumentVersion.id == version_id,
            models.DocumentVersion.document_id == document_id
        )
    )
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    version.content = version_data.content
    db.commit()
    db.refresh(version)
    
    return version
