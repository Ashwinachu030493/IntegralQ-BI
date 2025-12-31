"""
Supabase Database Configuration

Set these environment variables:
- SUPABASE_URL: Your Supabase project URL
- SUPABASE_KEY: Your Supabase anon/public key
- SUPABASE_SERVICE_KEY: Your Supabase service role key (for admin operations)
"""

import os
from dataclasses import dataclass
from typing import Optional

# Try to load from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


@dataclass
class SupabaseConfig:
    """Supabase configuration"""
    url: str
    anon_key: str
    service_key: Optional[str] = None
    
    @classmethod
    def from_env(cls) -> 'SupabaseConfig':
        """Load configuration from environment variables"""
        url = os.getenv('SUPABASE_URL')
        anon_key = os.getenv('SUPABASE_KEY')
        service_key = os.getenv('SUPABASE_SERVICE_KEY')
        
        if not url or not anon_key:
            raise ValueError(
                "Missing Supabase configuration. "
                "Set SUPABASE_URL and SUPABASE_KEY environment variables."
            )
        
        return cls(url=url, anon_key=anon_key, service_key=service_key)
    
    @classmethod
    def mock(cls) -> 'SupabaseConfig':
        """Create mock configuration for development"""
        return cls(
            url='http://localhost:54321',
            anon_key='mock-anon-key',
            service_key='mock-service-key'
        )


# Default configuration (uses mock if env vars not set)
def get_config() -> SupabaseConfig:
    """Get Supabase configuration"""
    try:
        return SupabaseConfig.from_env()
    except ValueError:
        print("[Supabase] Using mock configuration (no env vars set)")
        return SupabaseConfig.mock()
