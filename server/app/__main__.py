from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import insert, select, update, func
from sqlalchemy.orm import Session

from app.internal.ai import AI, get_ai
from app.internal.data import DOCUMENT_1, DOCUMENT_2
from app.internal.db import Base, SessionLocal, engine, get_db

import app.models as models
import app.schemas as schemas


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


@app.websocket("/ws")
async def websocket(websocket: WebSocket, ai: AI = Depends(get_ai)):
    await websocket.accept()
    while True:
        try:
            """
            The AI doesn't expect to receive any HTML.
            You can call ai.review_document to receive suggestions from the LLM.
            Remember, the output from the LLM will not be deterministic, so you may want to validate the output before sending it to the client.
            """
            document = await websocket.receive_text()
            print("Received data via websocket")
        except WebSocketDisconnect:
            break
        except Exception as e:
            print(f"Error occurred: {e}")
            continue


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
