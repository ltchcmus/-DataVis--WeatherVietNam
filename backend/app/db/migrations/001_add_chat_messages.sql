-- Migration 001: Thêm bảng chat_messages + cột title cho conversations
-- Chạy lệnh này trên Supabase SQL Editor

-- 1. Thêm cột title vào conversations (để hiển thị trên sidebar)
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS title TEXT;

-- 2. Tạo bảng chat_messages để lưu từng tin nhắn trong conversation
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content         TEXT NOT NULL,
    action          VARCHAR(30),            -- answer | generate_code | suggest_analysis | insight | explain_code
    code            TEXT,                   -- Python code do AI sinh (nếu có)
    explanation     TEXT,                   -- Giải thích code (nếu có)
    suggestions     TEXT,                   -- JSON array string của gợi ý (khi action=suggest_analysis)
    request_id      TEXT,                   -- Link tới execution_logs.request_id
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index để query nhanh theo conversation
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created
    ON public.chat_messages(conversation_id, created_at ASC);

-- 4. RLS: cho phép service role access (nếu dùng Supabase RLS)
-- ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
-- (Uncomment nếu cần bảo mật theo user)
