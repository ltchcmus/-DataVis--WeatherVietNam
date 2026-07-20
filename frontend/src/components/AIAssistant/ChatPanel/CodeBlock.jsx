import React, { useState } from 'react';
import { aiService } from '../../../services/api';

const CodeBlock = ({ initialCode, conversationId, requestId }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(initialCode || '');
  const [isExecuting, setIsExecuting] = useState(false);
  const [execResult, setExecResult] = useState(null);

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
    <div className="code-block" style={{ marginBottom: '1rem', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
      <div className="code-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#1e1e1e', borderBottom: '1px solid #333' }}>
        <span style={{ color: '#aaa', fontSize: '0.85rem' }}>python</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setIsEditing(!isEditing)} style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', borderRadius: '4px', padding: '2px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>
            {isEditing ? 'View' : 'Edit'}
          </button>
          <button onClick={handleCopy} style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      
      {isEditing ? (
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ width: '100%', minHeight: '200px', background: '#0d0d0d', color: '#d4d4d4', padding: '12px', border: 'none', resize: 'vertical', fontFamily: 'monospace', fontSize: '0.9rem', outline: 'none' }}
        />
      ) : (
        <pre className="code-content" style={{ margin: 0, padding: '12px', overflowX: 'auto', background: '#0d0d0d' }}>
          <code style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#d4d4d4' }}>{code}</code>
        </pre>
      )}

      <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-panel)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
        <button 
          onClick={() => { /* Xử lý loại bỏ code */ setCode(''); setIsEditing(false); }} 
          style={{ background: 'transparent', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}
        >
          Loại bỏ
        </button>
        <button 
          onClick={handleExecute} 
          disabled={isExecuting}
          style={{ background: 'var(--success-color)', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: isExecuting ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {isExecuting ? 'Đang chạy...' : 'Chấp nhận & Thực thi'}
        </button>
      </div>

      {execResult && (
        <div style={{ padding: '12px', backgroundColor: '#000', borderTop: '1px solid #333' }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#aaa', fontSize: '0.85rem' }}>Kết quả:</h4>
          
          {execResult.status === 'approved' && execResult.output_type === 'manual' && (
            <div style={{ color: '#10b981', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
              {execResult.logs?.join('\n') || "✅ Đã phê duyệt code thành công."}
            </div>
          )}

          {execResult.status === 'success' && execResult.output_type === 'chart' && execResult.chart_base64 && (
            <img src={`data:image/png;base64,${execResult.chart_base64}`} alt="Chart result" style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }} />
          )}

          {execResult.status === 'success' && execResult.output_type === 'text' && (
             <pre style={{ margin: 0, color: '#e5e7eb', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
               {execResult.logs?.join('\n') || "Thành công (không có output)"}
             </pre>
          )}

          {execResult.status === 'error' && (
             <pre style={{ margin: 0, color: '#ef4444', whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
               {execResult.error || "Lỗi không xác định"}
             </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default CodeBlock;
