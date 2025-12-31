"""
Audit Logging Service

Provides comprehensive audit logging for compliance:
- User actions (uploads, analysis, exports)
- Resource access
- API requests
"""

from typing import Optional, Dict, Any
from datetime import datetime
from database.client import get_db


class AuditLogger:
    """Audit logging service for compliance tracking"""
    
    # Action types
    ACTION_UPLOAD = 'upload'
    ACTION_ANALYZE = 'analyze'
    ACTION_EXPORT_PDF = 'export_pdf'
    ACTION_VIEW_REPORT = 'view_report'
    ACTION_DELETE_REPORT = 'delete_report'
    ACTION_LOGIN = 'login'
    ACTION_LOGOUT = 'logout'
    
    # Resource types
    RESOURCE_FILE = 'file'
    RESOURCE_REPORT = 'report'
    RESOURCE_USER = 'user'
    RESOURCE_ORGANIZATION = 'organization'
    
    def __init__(self):
        self.db = get_db()
    
    def log(
        self,
        action: str,
        resource_type: str,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Log an audit event.
        
        Args:
            action: Action type (upload, analyze, export, etc.)
            resource_type: Type of resource affected
            user_id: ID of user performing action
            org_id: Organization ID
            resource_id: ID of affected resource
            details: Additional details (JSON)
            ip_address: Client IP
            user_agent: Client user agent
            
        Returns:
            Created audit log entry
        """
        # Use default user/org if not specified (for anonymous actions)
        if not user_id and self.db._mock_data['users']:
            user_id = self.db._mock_data['users'][0]['id']
        if not org_id and self.db._mock_data['organizations']:
            org_id = self.db._mock_data['organizations'][0]['id']
        
        entry = self.db.log_action(
            user_id=user_id,
            org_id=org_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        print(f"[Audit] {action} on {resource_type} by user {user_id[:8] if user_id else 'anon'}...")
        return entry
    
    def log_file_upload(
        self,
        filename: str,
        file_size: int,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """Log file upload event"""
        return self.log(
            action=self.ACTION_UPLOAD,
            resource_type=self.RESOURCE_FILE,
            details={
                'filename': filename,
                'size_bytes': file_size,
                'timestamp': datetime.now().isoformat()
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    def log_analysis(
        self,
        file_names: list,
        domain: str,
        row_count: int,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Log analysis event"""
        return self.log(
            action=self.ACTION_ANALYZE,
            resource_type=self.RESOURCE_REPORT,
            details={
                'files': file_names,
                'domain': domain,
                'row_count': row_count,
                'timestamp': datetime.now().isoformat()
            },
            ip_address=ip_address
        )
    
    def log_pdf_export(
        self,
        report_id: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Log PDF export event"""
        return self.log(
            action=self.ACTION_EXPORT_PDF,
            resource_type=self.RESOURCE_REPORT,
            resource_id=report_id,
            details={
                'timestamp': datetime.now().isoformat()
            },
            ip_address=ip_address
        )
    
    def get_logs(
        self,
        limit: int = 100,
        action: Optional[str] = None,
        resource_type: Optional[str] = None
    ) -> list:
        """Get audit logs"""
        if self.db._mock_data['organizations']:
            org_id = self.db._mock_data['organizations'][0]['id']
            return self.db.get_audit_logs(
                org_id=org_id,
                limit=limit,
                action=action,
                resource_type=resource_type
            )
        return []


# Singleton instance
_audit_logger: Optional[AuditLogger] = None


def get_audit_logger() -> AuditLogger:
    """Get audit logger singleton"""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = AuditLogger()
    return _audit_logger
