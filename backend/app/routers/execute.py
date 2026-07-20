import uuid
import base64
import io
import contextlib
import traceback
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import pandas as pd
import matplotlib.pyplot as plt

from app.schemas.execute import ExecuteRequest, ExecuteResponse
from app.utils.security import validate_code
from app.services.dataset_service import dataset_service
from app.db.database import get_db
from app.db.models import ExecutionLog, Conversation

router = APIRouter(prefix="/execute", tags=["Execute"])

@router.post("", response_model=ExecuteResponse)
async def execute_code(req: ExecuteRequest, db: Session = Depends(get_db)):
    warnings = validate_code(req.code)
    if warnings:
        raise HTTPException(status_code=400, detail="Code contains dangerous patterns")

    df = dataset_service.get_dataframe()
    if df is None:
        raise HTTPException(status_code=500, detail="Dataset not loaded")

    stdout_io = io.StringIO()
    stderr_io = io.StringIO()
    
    plt.close('all')
    
    local_vars = {"df": df.copy(), "pd": pd, "plt": plt}
    
    from app.config import get_settings
    settings = get_settings()

    status = "success"
    output_type = "text"
    chart_base64 = None
    result_str = None
    error_str = None
    
    stdout_val = ""
    stderr_val = ""

    if not settings.enable_auto_execute:
        # User manual execution mode
        status = "approved"
        output_type = "manual"
        stdout_val = "✅ Code đã được phê duyệt! Hệ thống đang cấu hình KHÔNG tự động chạy (ENABLE_AUTO_EXECUTE=false).\nVui lòng copy code và chạy thủ công dưới local (ví dụ lưu vào code.txt và chạy runner.py)."
    else:
        try:
            with contextlib.redirect_stdout(stdout_io), contextlib.redirect_stderr(stderr_io):
                exec(req.code, {}, local_vars)
                
                if plt.get_fignums():
                    buf = io.BytesIO()
                    plt.savefig(buf, format="png", bbox_inches="tight")
                    buf.seek(0)
                    chart_base64 = base64.b64encode(buf.read()).decode("utf-8")
                    output_type = "chart"
                    plt.close('all')
                    
                if 'result' in local_vars and isinstance(local_vars['result'], pd.DataFrame):
                    output_type = "dataframe"
                    result_str = local_vars['result'].to_json(orient='records')
                
        except Exception as e:
            status = "error"
            output_type = "error"
            error_str = traceback.format_exc()
            print(error_str, file=stderr_io)

        stdout_val = stdout_io.getvalue()
        stderr_val = stderr_io.getvalue()

    logs = []
    if stdout_val:
        logs.extend(stdout_val.splitlines())
    if stderr_val:
        logs.extend(stderr_val.splitlines())

    conversation = db.query(Conversation).filter(Conversation.id == req.conversation_id).first()
    if not conversation:
        conversation = Conversation(id=req.conversation_id)
        db.add(conversation)
        db.commit()

    execution_id = str(uuid.uuid4())
    log_entry = ExecutionLog(
        id=execution_id,
        conversation_id=req.conversation_id,
        request_id=req.request_id,
        prompt=req.prompt,
        generated_code=req.code,
        approved_code=req.code,
        output_type=output_type,
        result_json=result_str,
        chart_base64=chart_base64,
        execution_stdout=stdout_val,
        execution_stderr=stderr_val
    )
    db.add(log_entry)
    db.commit()

    return ExecuteResponse(
        execution_id=execution_id,
        status=status,
        output_type=output_type,
        result=result_str,
        chart_base64=chart_base64,
        logs=logs,
        error=error_str
    )
