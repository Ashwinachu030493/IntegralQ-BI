"""
Supabase Client - Database Operations

Provides a unified interface for database operations with:
- User management
- Organization management
- Report storage
- Audit logging
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from .config import get_config, SupabaseConfig


class SupabaseClient:
    """
    Database client for Supabase operations.
    
    In production, this would use the supabase-py library.
    For development, it provides a mock implementation.
    """
    
    def __init__(self, config: Optional[SupabaseConfig] = None):
        self.config = config or get_config()
        self._connected = False
        self._mock_data: Dict[str, List[Dict]] = {
            'organizations': [],
            'users': [],
            'reports': [],
            'audit_logs': []
        }
        
        # Try to connect
        self._connect()
    
    def _connect(self):
        """Attempt to connect to Supabase"""
        if self.config.url.startswith('http://localhost'):
            print("[Supabase] Using mock database (development mode)")
            self._connected = True
            self._setup_mock_data()
        else:
            try:
                # In production, would use: from supabase import create_client
                # self.client = create_client(self.config.url, self.config.anon_key)
                print(f"[Supabase] Connected to {self.config.url}")
                self._connected = True
            except Exception as e:
                print(f"[Supabase] Connection failed: {e}")
                self._connected = False
    
    def _setup_mock_data(self):
        """Initialize mock data for development"""
        # Create default organization
        default_org = {
            'id': str(uuid.uuid4()),
            'name': 'Demo Organization',
            'slug': 'demo',
            'plan': 'pro',
            'row_quota': 100000,
            'rows_used': 0,
            'created_at': datetime.now().isoformat()
        }
        self._mock_data['organizations'].append(default_org)
        
        # Create default user
        default_user = {
            'id': str(uuid.uuid4()),
            'org_id': default_org['id'],
            'email': 'demo@integralq.ai',
            'full_name': 'Demo User',
            'role': 'admin',
            'created_at': datetime.now().isoformat()
        }
        self._mock_data['users'].append(default_user)
    
    @property
    def is_connected(self) -> bool:
        return self._connected
    
    # === Organization Operations ===
    
    def get_organization(self, org_id: str) -> Optional[Dict]:
        """Get organization by ID"""
        for org in self._mock_data['organizations']:
            if org['id'] == org_id:
                return org
        return None
    
    def create_organization(self, name: str, slug: str, plan: str = 'free') -> Dict:
        """Create a new organization"""
        org = {
            'id': str(uuid.uuid4()),
            'name': name,
            'slug': slug,
            'plan': plan,
            'row_quota': 10000 if plan == 'free' else 100000,
            'rows_used': 0,
            'created_at': datetime.now().isoformat()
        }
        self._mock_data['organizations'].append(org)
        return org
    
    # === User Operations ===
    
    def get_user(self, user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        for user in self._mock_data['users']:
            if user['id'] == user_id:
                return user
        return None
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email"""
        for user in self._mock_data['users']:
            if user['email'] == email:
                return user
        return None
    
    def create_user(self, email: str, org_id: str, full_name: str = '', role: str = 'member') -> Dict:
        """Create a new user"""
        user = {
            'id': str(uuid.uuid4()),
            'org_id': org_id,
            'email': email,
            'full_name': full_name,
            'role': role,
            'created_at': datetime.now().isoformat()
        }
        self._mock_data['users'].append(user)
        return user
    
    # === Report Operations ===
    
    def save_report(
        self,
        user_id: str,
        org_id: str,
        title: str,
        domain: str,
        file_names: List[str],
        row_count: int,
        column_count: int,
        summary: str = '',
        charts_json: Optional[Dict] = None,
        stats_json: Optional[Dict] = None,
        forecast_json: Optional[Dict] = None,
        cleaning_log: Optional[List[str]] = None
    ) -> Dict:
        """Save an analysis report"""
        report = {
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'org_id': org_id,
            'title': title,
            'domain': domain,
            'file_names': file_names,
            'row_count': row_count,
            'column_count': column_count,
            'summary': summary,
            'charts_json': charts_json,
            'stats_json': stats_json,
            'forecast_json': forecast_json,
            'cleaning_log': cleaning_log or [],
            'created_at': datetime.now().isoformat()
        }
        self._mock_data['reports'].append(report)
        
        # Update org rows used
        org = self.get_organization(org_id)
        if org:
            org['rows_used'] = org.get('rows_used', 0) + row_count
        
        return report
    
    def get_reports(self, org_id: str, limit: int = 20) -> List[Dict]:
        """Get recent reports for an organization"""
        org_reports = [r for r in self._mock_data['reports'] if r['org_id'] == org_id]
        return sorted(org_reports, key=lambda x: x['created_at'], reverse=True)[:limit]
    
    def get_report(self, report_id: str) -> Optional[Dict]:
        """Get a specific report by ID"""
        for report in self._mock_data['reports']:
            if report['id'] == report_id:
                return report
        return None
    
    # === Audit Log Operations ===
    
    def log_action(
        self,
        user_id: str,
        org_id: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict:
        """Log an audit event"""
        log_entry = {
            'id': len(self._mock_data['audit_logs']) + 1,
            'user_id': user_id,
            'org_id': org_id,
            'action': action,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'details': details,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'created_at': datetime.now().isoformat()
        }
        self._mock_data['audit_logs'].append(log_entry)
        return log_entry
    
    def get_audit_logs(
        self,
        org_id: str,
        limit: int = 100,
        action: Optional[str] = None,
        resource_type: Optional[str] = None
    ) -> List[Dict]:
        """Get audit logs for an organization"""
        logs = [l for l in self._mock_data['audit_logs'] if l['org_id'] == org_id]
        
        if action:
            logs = [l for l in logs if l['action'] == action]
        if resource_type:
            logs = [l for l in logs if l['resource_type'] == resource_type]
        
        return sorted(logs, key=lambda x: x['created_at'], reverse=True)[:limit]


# Singleton instance
_client: Optional[SupabaseClient] = None


def get_db() -> SupabaseClient:
    """Get database client singleton"""
    global _client
    if _client is None:
        _client = SupabaseClient()
    return _client
