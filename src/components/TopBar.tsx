import { useEffect, useRef, useState } from 'react';
import { requestExport } from '../exportImage';
import { usePlanner } from '../store';
import {
  CubeIcon,
  DownloadIcon,
  HelpIcon,
  LogoMark,
  NewFileIcon,
  PlanIcon,
  RedoIcon,
  SparklesIcon,
  UndoIcon,
  UploadIcon,
} from './icons';

function formatTime(ts: number | null): string {
  if (!ts) return '自动保存已开启';
  try {
    return new Date(ts).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '已保存';
  }
}

function safeFileName(name: string): string {
  return (name || 'room-plan').replace(/[\\/:*?"<>|]+/g, '_').trim();
}

export default function TopBar() {
  const project = usePlanner((s) => s.project);
  const view = usePlanner((s) => s.view);
  const saving = usePlanner((s) => s.saving);
  const savedAt = usePlanner((s) => s.savedAt);
  const past = usePlanner((s) => s.past.length);
  const future = usePlanner((s) => s.future.length);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const setProjectName = usePlanner((s) => s.setProjectName);
  const setView = usePlanner((s) => s.setView);
  const undo = usePlanner((s) => s.undo);
  const redo = usePlanner((s) => s.redo);
  const newProject = usePlanner((s) => s.newProject);
  const loadSample = usePlanner((s) => s.loadSample);
  const importProject = usePlanner((s) => s.importProject);
  const setHelpOpen = usePlanner((s) => s.setHelpOpen);
  const notify = usePlanner((s) => s.notify);

  useEffect(() => {
    if (!exportOpen) return;
    const close = (event: PointerEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) setExportOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [exportOpen]);

  const handleExport = () => {
    const data = {
      version: 1,
      app: 'roomly',
      exportedAt: new Date().toISOString(),
      project: usePlanner.getState().project,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeFileName(project.name)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('户型已导出为 JSON 文件');
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const input =
        parsed && typeof parsed === 'object' && 'project' in (parsed as Record<string, unknown>)
          ? (parsed as Record<string, unknown>).project
          : parsed;
      importProject(input);
    } catch {
      notify('导入失败：无法解析 JSON 文件');
    }
  };

  return (
    <header className="topbar">
      <div className="brand">
        <LogoMark size={32} />
        <div className="brand-text">
          <div className="brand-name">栖居</div>
          <div className="brand-sub">ROOMLY</div>
        </div>
      </div>

      <div className="project-title">
        <div className="project-kicker">当前户型</div>
        <input
          className="project-name-input"
          value={project.name}
          maxLength={60}
          spellCheck={false}
          aria-label="户型名称"
          onFocus={() => usePlanner.getState().checkpoint()}
          onChange={(e) => setProjectName(e.target.value, true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
      </div>

      <div className="topbar-center">
        <div className="segmented view-segmented">
          <button
            className={view === '2d' ? 'active' : ''}
            onClick={() => setView('2d')}
            title="平面编辑 (1)"
          >
            <PlanIcon size={16} />
            <span>2D 平面</span>
          </button>
          <button
            className={view === '3d' ? 'active' : ''}
            onClick={() => setView('3d')}
            title="3D 预览 (2)"
          >
            <CubeIcon size={16} />
            <span>3D 预览</span>
          </button>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="history-group">
          <button
            className="icon-btn"
            onClick={undo}
            disabled={past === 0}
            title="撤销 (⌘Z)"
            aria-label="撤销"
          >
            <UndoIcon size={17} />
          </button>
          <button
            className="icon-btn"
            onClick={redo}
            disabled={future === 0}
            title="重做 (⇧⌘Z)"
            aria-label="重做"
          >
            <RedoIcon size={17} />
          </button>
        </div>

        <div className="topbar-divider" />

        <div className="file-group">
          <button className="text-btn" onClick={newProject} title="新建空白户型">
            <NewFileIcon size={16} />
            <span>新建</span>
          </button>
          <button className="text-btn" onClick={loadSample} title="载入示例户型">
            <SparklesIcon size={16} />
            <span>示例</span>
          </button>
          <button
            className="text-btn"
            onClick={() => fileRef.current?.click()}
            title="导入 JSON 户型"
          >
            <UploadIcon size={16} />
            <span>导入</span>
          </button>
          <div className="export-wrap" ref={exportRef}>
            <button
              className={`text-btn${exportOpen ? ' active' : ''}`}
              onClick={() => setExportOpen((open) => !open)}
              title="导出户型"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
            >
              <DownloadIcon size={16} />
              <span>导出</span>
            </button>
            {exportOpen && (
              <div className="export-menu" role="menu">
                <button
                  role="menuitem"
                  onClick={() => {
                    setExportOpen(false);
                    requestExport('png');
                  }}
                >
                  图片 PNG
                  <span>当前视图</span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setExportOpen(false);
                    requestExport('pdf');
                  }}
                >
                  PDF 文档
                  <span>A4 排版</span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setExportOpen(false);
                    handleExport();
                  }}
                >
                  JSON 备份
                  <span>可重新导入</span>
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = '';
            }}
          />
        </div>

        <div className="topbar-divider" />

        <div className={`save-chip${saving ? ' saving' : ''}`} title="编辑会自动保存在浏览器本地">
          <span className="save-dot" />
          <span>{saving ? '保存中…' : `已保存 ${formatTime(savedAt)}`}</span>
        </div>

        <button
          className="icon-btn help-btn"
          onClick={() => setHelpOpen(true)}
          title="使用说明与快捷键"
          aria-label="帮助"
        >
          <HelpIcon size={18} />
        </button>
      </div>
    </header>
  );
}
