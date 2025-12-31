# IntegralQ-BI: Process-Aware AI Analytics Platform

**IntegralQ-BI** is a local-first, AI-powered business intelligence platform designed to transform raw Excel/CSV data into executive-grade insights. It leverages a local Large Language Model (**Gemma 3**) to provide narrative analysis without data ever leaving your machine.

![Platform Screenshot](./src/assets/react.svg) *(Replace with actual screenshot)*

## 🚀 Key Features

*   **Secure Local AI**: Uses **Ollama (Gemma 3)** for 100% private data analysis. No data is sent to the cloud.
*   **Intelligent Transformation**:
    *   **Universal Cleaner**: Auto-detects and repairs Excel date formatting bugs (serial numbers to ISO dates).
    *   **Domain Detector**: Automatically identifies data context (HR, Finance, Sales) and applies specialized Standard Operating Procedures (SOPs).
*   **Advanced Analytics**:
    *   **Statistical Engine**: Calculates correlations, R², and regression models.
    *   **Forecast Engine**: Generates 6-month predictive trends for time-series data.
*   **Executive Reporting**:
    *   **Dynamic Dashboards**: Glassmorphism UI with interactive charts.
    *   **PDF Export**: Generates academic-grade technical reports with "Bottom Line Up Front" (BLUF) summaries.

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript, Vite
*   **Styling**: Vanilla CSS (Glassmorphism design system)
*   **AI/LLM**: Ollama (Local), Gemma 3 (Model)
*   **Visualization**: Recharts
*   **PDF Engine**: html2canvas + jsPDF

## 🏁 Getting Started

### Prerequisites

1.  **Node.js** (v18+)
2.  **Ollama**: [Download Here](https://ollama.com/)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-org/integralq-bi.git
    cd integralq-bi
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Prepare the AI Model**:
    Ensure Ollama is running and pull the required model:
    ```bash
    ollama serve
    ollama pull gemma3:4b
    ```

4.  **Start the Platform**:
    ```bash
    npm run dev
    ```

### ⚡ Configuration

*   **Vite Proxy**: Configured in `vite.config.ts` to route `/api/ollama` requests to `localhost:11434`, resolving Cross-Origin (CORS) issues.
*   **LLM Bridge**: Located in `src/engine/llm/LLMBridge.ts`, centrally managing AI prompts and failovers.

## 🛡️ Security & Privacy

*   **Local-First Design**: All processing happens in the browser or via local API.
*   **Sanitization**: Input files are validated for extension (csv/xlsx) and MIME type.
*   **Private**: Your data is never trained on or stored externally.

---

**Version**: v4.0 Enterprise
**License**: Proprietary / Internal Use Only
