"""
DomainDetector - Python port of TypeScript domain detection.

Detects data domain based on column names and content patterns.
"""

import pandas as pd
from typing import Dict, Any, List


class DomainDetector:
    """Detects the domain of data based on column patterns."""
    
    # Domain keyword patterns
    DOMAIN_PATTERNS = {
        'finance': [
            'revenue', 'profit', 'expense', 'budget', 'cost', 'price',
            'amount', 'balance', 'transaction', 'invoice', 'payment',
            'credit', 'debit', 'tax', 'gross', 'net', 'margin'
        ],
        'hr': [
            'employee', 'salary', 'department', 'hire', 'manager',
            'position', 'title', 'role', 'team', 'staff', 'worker',
            'performance', 'review', 'tenure', 'payroll', 'benefits'
        ],
        'education': [
            'student', 'grade', 'course', 'teacher', 'class',
            'subject', 'score', 'exam', 'semester', 'enrollment',
            'gpa', 'attendance', 'curriculum', 'academic'
        ],
        'biology': [
            'gene', 'protein', 'cell', 'species', 'dna', 'rna',
            'sequence', 'mutation', 'organism', 'sample', 'experiment',
            'concentration', 'ph', 'assay', 'culture'
        ]
    }
    
    def detect(self, data: Dict[str, Any]) -> str:
        """
        Detect domain from cleaned data.
        
        Args:
            data: Cleaned data dict from UniversalCleaner
            
        Returns:
            Domain string: 'finance', 'hr', 'education', 'biology', or 'general'
        """
        headers = [h.lower() for h in data.get('headers', [])]
        
        if not headers:
            return 'general'
        
        # Score each domain
        scores = {}
        for domain, patterns in self.DOMAIN_PATTERNS.items():
            score = 0
            for pattern in patterns:
                for header in headers:
                    if pattern in header:
                        score += 1
            scores[domain] = score
        
        # Find highest scoring domain
        if scores:
            best_domain = max(scores, key=scores.get)
            if scores[best_domain] >= 2:  # Minimum threshold
                return best_domain
        
        return 'general'
    
    def detect_from_dataframe(self, df: pd.DataFrame) -> str:
        """Detect domain directly from DataFrame."""
        data = {
            'headers': df.columns.tolist()
        }
        return self.detect(data)
