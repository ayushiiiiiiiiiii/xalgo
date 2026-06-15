import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useGame } from '../context/GameContext';

export const IsolatedEditor = () => {
  const { currentMatch, runDiagnostics, submitSolution, updateMyCode, showSummaryModal } = useGame();
  const [editorLanguage] = useState('cpp');
  const editorRef = useRef(null);

  const initialCodeRef = useRef(currentMatch?.myCode || '');

  const isReadOnly = showSummaryModal || !!currentMatch?.hasSubmitted;
  const canSubmit = currentMatch?.myProgress === 10 && !currentMatch?.hasSubmitted && !showSummaryModal;
  
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly: isReadOnly });
    }
  }, [isReadOnly]);

  useEffect(() => {
    if (editorRef.current && currentMatch?.myCode) {
      const currentVal = editorRef.current.getValue();
      if (!currentVal || currentVal.trim() === '') {
        editorRef.current.setValue(currentMatch.myCode);
      }
    }
  }, [currentMatch?.myCode]);

  if (!currentMatch) return null;

  const handleEditorChange = (value) => {
    if (value !== undefined) {
      updateMyCode(value);
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    monaco.editor.defineTheme('cyber-obsidian', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'F9FAFB', background: '050505' },
        { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '2563EB', fontStyle: 'bold' },
        { token: 'number', foreground: '10B981' },
        { token: 'string', foreground: '10B981' },
        { token: 'delimiter', foreground: '6B7280' },
        { token: 'variable', foreground: 'F9FAFB' }
      ],
      colors: {
        'editor.background': '#050505',
        'editor.foreground': '#F9FAFB',
        'editorLineNumber.foreground': '#1F2937',
        'editorLineNumber.activeForeground': '#2563EB',
        'editor.selectionBackground': '#2563EB33',
        'editor.lineHighlightBackground': '#ffffff08'
      }
    });
    monaco.editor.setTheme('cyber-obsidian');

    editor.updateOptions({ readOnly: isReadOnly });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      const code = editor.getValue();
      runDiagnostics(code, 'cpp');
    });
  };

  const handleRunDiagnostics = () => {
    const code = editorRef.current ? editorRef.current.getValue() : currentMatch.myCode;
    runDiagnostics(code, editorLanguage);
  };

  const handleSubmit = () => {
    
    if (editorRef.current) {
      updateMyCode(editorRef.current.getValue());
    }
    submitSolution();
  };

  return (
    <div className="relative flex flex-col h-full bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
      {}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/35 to-transparent z-10" />
      
      {}
      <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs text-[#6B7280] tracking-wider uppercase font-semibold">
            Runtime Environment
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isReadOnly && (
            <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              Read Only
            </span>
          )}
          <div className="bg-white/[0.02] border border-white/10 text-blue-400 rounded-md text-xs px-3.5 py-1.5 tracking-wider font-bold shadow-sm">
            Language: C++
          </div>
        </div>
      </div>

      {}
      <div className="flex-1 min-h-[350px] relative">
        <Editor
          height="100%"
          language={editorLanguage}
          defaultValue={initialCodeRef.current}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            fontFamily: "ui-monospace, Consolas, 'SF Mono', monospace",
            minimap: { enabled: false },
            padding: { top: 16, bottom: 16 },
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto'
            },
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            lineNumbersMinChars: 3,
            wordWrap: 'on',
            tabSize: 4,
            insertSpaces: true,
            autoIndent: 'full',
            formatOnType: true,
            readOnly: isReadOnly
          }}
        />
      </div>

      {}
      <div className="border-t border-white/10 bg-white/[0.01] flex flex-col h-60">
        
        {}
        <div className="flex items-center justify-between px-6 py-2.5 bg-white/[0.02] border-b border-white/10">
          <span className="text-xs text-[#6B7280] tracking-wider font-bold">
            Test Case Results
          </span>
          <span className="text-xs text-blue-500 font-semibold">
            {currentMatch.myProgress}/10 Passed
          </span>
        </div>

        {}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-[#6B7280] space-y-1.5 scrollbar-thin scrollbar-[#223147]/30 select-text">
          {currentMatch.logs?.map((log, index) => {
            let textColor = 'text-[#6B7280]';
            if (log.includes('[ERROR]') || log.includes('❌')) textColor = 'text-red-500 font-semibold';
            if (log.includes('[SUCCESS]') || log.includes('✔')) textColor = 'text-emerald-500 font-semibold';
            if (log.includes('[SYSTEM]')) textColor = 'text-[#F9FAFB]';
            if (log.includes('[TELEMETRY]')) textColor = 'text-blue-400';
            if (log.includes('[GAME]')) textColor = 'text-[#9CA3AF]';
            if (log.includes('[WINNER]') || log.includes('👑')) textColor = 'text-yellow-400 font-bold';
            return (
              <div key={index} className={textColor}>
                &gt; {log}
              </div>
            );
          })}
        </div>

        {}
        <div className="p-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-between gap-4">
          <button
            onClick={handleRunDiagnostics}
            disabled={isReadOnly}
            className={`flex-1 glow-btn bg-white/[0.01] text-[#F9FAFB] border border-white/10 py-2.5 px-4 rounded-xl text-xs tracking-wider transition flex items-center justify-center gap-1.5 shadow-sm ${
              isReadOnly
                ? 'opacity-40 cursor-not-allowed border-white/5'
                : 'hover:bg-white/[0.08] hover:border-white/20 cursor-pointer'
            }`}
          >
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Run Code <span className="text-[#6B7280] text-[10px] ml-1">Ctrl+Enter</span>
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex-1 font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition flex items-center justify-center gap-1.5 ${
              currentMatch.hasSubmitted
                ? 'opacity-60 cursor-not-allowed bg-emerald-950/20 text-[#10B981] border border-emerald-500/30 shadow-none'
                : !canSubmit
                ? 'opacity-40 cursor-not-allowed bg-white/[0.01] text-[#6B7280] border border-white/10'
                : 'glow-btn bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer shadow-[0_4px_20px_rgba(16,185,129,0.25)]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {currentMatch.hasSubmitted ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              )}
            </svg>
            {currentMatch.hasSubmitted 
              ? 'Solution Submitted ✓' 
              : !canSubmit 
              ? 'Pass All Tests to Submit' 
              : 'Submit Code'}
          </button>
        </div>

      </div>

    </div>
  );
};

export default IsolatedEditor;
