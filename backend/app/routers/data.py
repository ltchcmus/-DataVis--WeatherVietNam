from fastapi import APIRouter, HTTPException
from typing import Any, Dict
from app.services.dataset_service import dataset_service

router = APIRouter(prefix="/data", tags=["Data"])

@router.get("")
def get_data_metadata():
    metadata = dataset_service.get_metadata()
    if not metadata:
        raise HTTPException(status_code=500, detail="Dataset not loaded")
        
    df = dataset_service.get_dataframe()
    preview = []
    if df is not None:
        preview = df.head(5).to_dict(orient="records")
        
    return {
        "dataset_id": metadata.name,
        "row_count": metadata.row_count,
        "columns": [col["name"] for col in metadata.columns],
        "preview": preview
    }
