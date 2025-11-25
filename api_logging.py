

from database.crud import log_activity as crud_log_activity, log_error as crud_log_error
from sqlalchemy.orm import Session

def log_activity(db: Session, user_id: str, log_level_id: str, http_method_id: str, endpoint: str, status_code: int, execution_time_ms: int, ip_address: str = None, user_agent: str = None, log_id: str = None):
    return crud_log_activity(db, user_id, log_level_id, http_method_id, endpoint, status_code, execution_time_ms, ip_address, user_agent, log_id)

def log_error(db: Session, log_id: str, error_message: str, stack_trace: str = None):
    return crud_log_error(db, log_id, error_message, stack_trace)

