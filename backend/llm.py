import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class LLMFactory:
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "mock").lower()
        
        # SMART KEY SELECTION
        if self.provider == "openai":
            self.api_key = os.getenv("OPENAI_API_KEY")
            self.model_name = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        elif self.provider == "claude":
            self.api_key = os.getenv("ANTHROPIC_API_KEY")
            self.model_name = os.getenv("CLAUDE_MODEL", "claude-3-opus-20240229")
        elif self.provider == "gemini":
            self.api_key = os.getenv("GOOGLE_API_KEY")
            self.model_name = os.getenv("GEMINI_MODEL", "gemini-pro")
        elif self.provider == "ollama":
            self.api_key = None 
            self.model_name = os.getenv("OLLAMA_MODEL", "llama3")
        else:
            self.api_key = None
            self.model_name = "mock"

        print(f"🧠 AI Engine initialized: {self.provider.upper()} (Model: {self.model_name})")

    # --- NEW: GENERIC CHAT METHOD ---
    def chat(self, prompt: str):
        """
        Directly queries the LLM with a specific prompt (Used for RAG/Chat)
        """
        try:
            if self.provider == "openai":
                return self._chat_openai(prompt)
            elif self.provider == "claude":
                return self._chat_claude(prompt)
            elif self.provider == "gemini":
                return self._chat_gemini(prompt)
            elif self.provider == "ollama":
                return self._chat_ollama(prompt)
            else:
                return "Mock Chat: I see you are asking about data. (Configure a real provider to chat!)"
        except Exception as e:
            print(f"❌ Chat Error: {e}")
            return "I'm having trouble connecting to my brain right now."

    def generate_executive_summary(self, filename: str, stats: dict, domain: str):
        # Validate Key Existence
        if self.provider not in ["ollama", "mock"] and not self.api_key:
            return self._error_response(f"Missing API Key for {self.provider.upper()}. Check .env file.")

        prompt = self._build_prompt(filename, stats, domain)
        
        # Re-use the chat method for simplicity, but format as bullets
        raw_text = self.chat(prompt)
        
        # Format for UI
        if isinstance(raw_text, dict): return raw_text # Handle error response
        
        bullets = [line.strip('- *').strip() for line in raw_text.split('\n') if line.strip()]
        return {
            "title": f"Executive Summary ({self.provider.upper()})",
            "summary": bullets[:3]
        }

    def _build_prompt(self, filename, stats, domain):
        return f"""
        You are a Senior Data Analyst.
        CONTEXT:
        - Domain: {domain}
        - File: {filename}
        - Rows: {stats.get('rowCount', 0)}
        - Key Columns: {', '.join(stats.get('numericColumns', [])[:5])}

        TASK:
        Write exactly 3 distinct, professional bullet points summarizing this dataset. 
        Focus on potential insights based on the column names.
        Return ONLY the 3 bullets, nothing else.
        """

    # --- PROVIDER IMPLEMENTATIONS ---

    def _chat_openai(self, prompt):
        from openai import OpenAI
        client = OpenAI(api_key=self.api_key)
        response = client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content

    def _chat_claude(self, prompt):
        import anthropic
        client = anthropic.Anthropic(api_key=self.api_key)
        message = client.messages.create(
            model=self.model_name,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        return message.content[0].text

    def _chat_gemini(self, prompt):
        import google.generativeai as genai
        genai.configure(api_key=self.api_key)
        model = genai.GenerativeModel(self.model_name)
        response = model.generate_content(prompt)
        return response.text

    def _chat_ollama(self, prompt):
        url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False
        }
        response = requests.post(url, json=payload)
        return response.json().get('response', '')

    def _error_response(self, error_msg):
        return {
            "title": "AI Generation Failed",
            "summary": ["Configuration Error", str(error_msg)]
        }

# Singleton Instance
llm_service = LLMFactory()
