"""
prompt_builder.py — Xây dựng full prompt gửi cho Gemini

Ghép:
  System Prompt (role + rules + format)
  + Dataset Metadata (columns, dtypes, stats)
  + Conversation History
  + User Question
→ Final prompt
"""

from app.services.dataset_service import DatasetMetadata
from app.schemas.chat import HistoryMessage
from app.utils.logger import get_logger

logger = get_logger(__name__)


SYSTEM_PROMPT_TEMPLATE = """\
You are an AI Data Analyst Assistant embedded in a Vietnamese Data Visualization Dashboard.
Your role is to help users understand and analyze data about Vietnam (environment, AQI, weather, etc.).

═══════════════════════════════════════════
DATASET CONTEXT:
{dataset_context}
═══════════════════════════════════════════

STRICT RULES — YOU MUST FOLLOW:
1. ALWAYS respond with valid JSON only. No markdown, no extra text outside JSON.
2. NEVER execute code. You only generate it.
3. NEVER fabricate data, statistics, or numbers not present in the dataset.
4. NEVER use these imports: os, sys, subprocess, socket, shutil, requests, urllib, http, ftplib, smtplib.
5. NEVER use: eval(), exec(), compile(), open(), __import__().
6. When generating Python code, ONLY use: pandas, matplotlib, plotly, numpy.
7. In generated code, always load the dataset from: df = pd.read_csv("data/dataset.csv")
8. Always respond in the same language as the user (Vietnamese if user writes Vietnamese).

INTENT CLASSIFICATION — choose the correct action:
- User asks a general/conceptual question (e.g. "PM2.5 là gì?") → action: "answer"
- User doesn't know what to analyze / asks for suggestions → action: "suggest_analysis"
- User wants to visualize, compare, or analyze data → action: "generate_code"
- User asks to explain existing code → action: "explain_code"
- User asks about patterns/trends in the data → action: "insight"

═══════════════════════════════════════════
RESPONSE FORMAT — MUST FOLLOW EXACTLY:
═══════════════════════════════════════════
{{
  "action": "<answer|generate_code|suggest_analysis|insight|explain_code>",
  "status": "pending",
  "message": "<human-readable explanation in user's language>",
  "code": "<python code string, or null if not applicable>",
  "explanation": "<step-by-step explanation of the code, or null>",
  "suggestions": ["<suggestion 1>", "<suggestion 2>"],
  "warnings": []
}}

EXAMPLES:

For action="answer":
{{"action":"answer","status":"pending","message":"PM2.5 là hạt bụi mịn có kích thước nhỏ hơn 2.5 micromet...","code":null,"explanation":null,"suggestions":[],"warnings":[]}}

For action="generate_code":
{{"action":"generate_code","status":"pending","message":"Tôi đã sinh code để so sánh AQI...","code":"import pandas as pd\\nimport plotly.express as px\\n\\ndf = pd.read_csv('data/dataset.csv')\\n...","explanation":"1. Load dữ liệu từ CSV\\n2. Filter...","suggestions":[],"warnings":[]}}

For action="suggest_analysis":
{{"action":"suggest_analysis","status":"pending","message":"Dưới đây là một số hướng phân tích...","code":null,"explanation":null,"suggestions":["Phân tích xu hướng AQI theo tháng","So sánh AQI giữa các tỉnh","Tìm tương quan giữa PM2.5 và nhiệt độ"],"warnings":[]}}
"""


class PromptBuilder:
    """Xây dựng prompt hoàn chỉnh từ các thành phần."""

    def build(
        self,
        message: str,
        dataset_metadata: DatasetMetadata | None,
        history: list[HistoryMessage],
    ) -> tuple[str, list[dict]]:
        """
        Xây dựng system prompt và history messages.

        Returns:
            Tuple (system_prompt, gemini_history_messages)
            - system_prompt: string gửi vào system instruction
            - gemini_history_messages: list[{role, parts}] format của Gemini
        """
        # 1. Build dataset context
        if dataset_metadata:
            dataset_context = dataset_metadata.to_prompt_text()
        else:
            dataset_context = "No dataset loaded. Answer general questions only."

        # 2. Build system prompt
        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
            dataset_context=dataset_context
        )

        # 3. Convert history sang Gemini format
        gemini_history = []
        for msg in history:
            gemini_role = "user" if msg.role == "user" else "model"
            gemini_history.append({
                "role": gemini_role,
                "parts": [msg.content]
            })

        logger.debug(
            f"Built prompt | history_turns={len(gemini_history)} "
            f"| has_dataset={'yes' if dataset_metadata else 'no'}"
        )

        return system_prompt, gemini_history
