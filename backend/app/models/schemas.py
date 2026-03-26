from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum
from uuid import uuid4


class LLMProvider(str, Enum):
    OPENAI = "openai"
    GEMINI = "gemini"
    CLAUDE = "claude"


class DiscussionMode(str, Enum):
    SEQUENTIAL = "sequential"
    DEBATE = "debate"
    VOTE = "vote"
    SINGLE = "single"


class AgentConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    persona: str
    provider: LLMProvider
    model: str
    api_key_encrypted: str = ""
    sequence_order: int = 0
    tools: list[str] = []
    temperature: float = 0.7
    supports_vision: bool = False


class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    role: str
    agent_name: Optional[str] = None
    content: str
    timestamp: str
    token_count: int = 0
    cost_usd: float = 0.0
    branch_id: Optional[str] = None


class ChatRequest(BaseModel):
    session_id: str
    user_message: str
    agent_ids: list[str]
    mode: DiscussionMode = DiscussionMode.SEQUENTIAL
    target_agent_id: Optional[str] = None
    max_debate_rounds: int = 3
    branch_from_message_id: Optional[str] = None
    image_base64: Optional[str] = None


class WorkflowTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    description: str
    agent_configs: list[AgentConfig]
    mode: DiscussionMode
    max_debate_rounds: int = 3


class PromptTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    category: str
    persona: str
    recommended_model: str
    recommended_tools: list[str] = []
