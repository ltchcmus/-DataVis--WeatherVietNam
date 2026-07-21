import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Play, X, Edit2 } from 'lucide-react';
import { aiService } from '../../../services/api';

const CodeBlock = ({ initialCode, conversationId, requestId }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(initialCode || '');
  const [isExecuting, setIsExecuting] = useState(false);
  const [execResult, setExecResult] = useState(null);
  const [enableAutoExecute, setEnableAutoExecute] = useState(true);

  React.useEffect(() => {
    aiService.getConfig().then(data => {
      if (data && data.enable_auto_execute === false) {
        setEnableAutoExecute(false);
      }
    }).catch(e => console.error(e));
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setExecResult(null);
    try {
      const res = await aiService.executeCode({
        code: code,
        conversation_id: conversationId,
        request_id: requestId,
        prompt: "User manually executed code"
      });
      setExecResult(res);
    } catch (err) {
      setExecResult({ status: 'error', error: err.response?.data?.detail || err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="code-block-premium">
      <div className="code-block-header">
        <span>python</span>
        <div className="code-block-actions">
          <button onClick={() => setIsEditing(!isEditing)} title="Edit Code">
            <Edit2 size={14} /> {isEditing ? 'View' : 'Edit'}
          </button>
          <button onClick={handleCopy} title="Copy Code">
            {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      
      <div className="code-block-content-wrapper" style={{ margin: 0 }}>
        {isEditing ? (
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ 
              width: '100%', minHeight: '250px', background: '#0F172A', color: '#E2E8F0', 
              padding: '1rem', border: 'none', resize: 'vertical', 
              fontFamily: "'Consolas', monospace", fontSize: '0.9rem', outline: 'none' 
            }}
          />
        ) : (
          <SyntaxHighlighter
            language="python"
            style={vscDarkPlus}
            customStyle={{ margin: 0, padding: '1rem', background: '#0F172A', fontSize: '0.9rem' }}
          >
            {code}
          </SyntaxHighlighter>
        )}
      </div>

      <div className="code-block-footer">
        <button 
          className="btn-reject"
          onClick={() => { setCode(''); setIsEditing(false); }} 
        >
          <X size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }}/> Loại bỏ
        </button>
        <button 
          className="btn-approve"
          onClick={handleExecute} 
          disabled={isExecuting}
          style={!enableAutoExecute ? { backgroundColor: '#F59E0B', color: 'white' } : {}}
        >
          {enableAutoExecute ? <Play size={16} fill="currentColor" /> : <Check size={16} />}
          {isExecuting ? 'Đang xử lý...' : (enableAutoExecute ? 'Chấp nhận & Thực thi' : 'Phê duyệt Code (Manual)')}
        </button>
      </div>

      {!enableAutoExecute && !execResult && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEF3C7', borderTop: '1px solid #FDE68A', color: '#92400E', fontSize: '0.85rem' }}>
          <strong>Lưu ý:</strong> Tính năng tự động chạy code đang TẮT. Vui lòng bấm <strong>Phê duyệt Code</strong>, sau đó copy nội dung bên trên vào <code>runner/code.txt</code> và chạy lệnh <code>python runner/runner.py</code> trên máy của bạn.
        </div>
      )}

      {execResult && (
        <div style={{ padding: '1rem', backgroundColor: '#FFFFFF', borderTop: '1px solid var(--ai-border-color)' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--ai-text-secondary)', fontSize: '0.85rem' }}>Kết quả thực thi:</h4>
          
          {execResult.status === 'approved' && execResult.output_type === 'manual' && (
            <div style={{ color: '#10b981', whiteSpace: 'pre-wrap', fontSize: '0.9rem', fontWeight: '500' }}>
              {execResult.logs?.join('\n') || "✅ Đã phê duyệt code thành công."}
            </div>
          )}

          {execResult.status === 'success' && execResult.output_type === 'chart' && execResult.chart_base64 && (
            <img src={`data:image/png;base64,${execResult.chart_base64}`} alt="Chart result" style={{ maxWidth: '100%', height: 'auto', borderRadius: '0.5rem', border: '1px solid var(--ai-border-color)', marginTop: '0.5rem' }} />
          )}

          {execResult.status === 'success' && execResult.output_type === 'text' && (
             <pre style={{ margin: 0, color: 'var(--ai-text-primary)', whiteSpace: 'pre-wrap', fontSize: '0.85rem', background: '#F8FAFC', padding: '0.75rem', borderRadius: '0.375rem' }}>
               {execResult.logs?.join('\n') || "Thành công (không có output)"}
             </pre>
          )}

          {execResult.status === 'error' && (
             <pre style={{ margin: 0, color: '#EF4444', whiteSpace: 'pre-wrap', fontSize: '0.85rem', background: '#FEF2F2', padding: '0.75rem', borderRadius: '0.375rem' }}>
               {execResult.error || "Lỗi không xác định"}
             </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default CodeBlock;
