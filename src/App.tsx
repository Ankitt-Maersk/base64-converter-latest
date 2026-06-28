import { useState, useRef, useCallback } from 'react';
import {
  FileText,
  ImageIcon,
  Tag,
  Download,
  ZoomIn,
  ZoomOut,
  Printer,
  RotateCcw,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
  X,
} from 'lucide-react';

type Format = 'pdf' | 'png' | 'zpl';
type ZplStep = 1 | 2;

interface OutputState {
  type: 'pdf' | 'png' | 'zpl-text' | 'zpl-image';
  url?: string;
  text?: string;
  error?: string;
}

export default function App() {
  const [format, setFormat] = useState<Format>('pdf');
  const [input, setInput] = useState('');
  const [zoom, setZoom] = useState(100);
  const [output, setOutput] = useState<OutputState | null>(null);
  const [zplStep, setZplStep] = useState<ZplStep>(1);
  const [zplText, setZplText] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const cleanBase64 = (raw: string) => raw.replace(/\s+/g, '').replace(/^data:[^;]+;base64,/, '');

  const handleConvert = useCallback(async () => {
    const b64 = cleanBase64(input.trim());
    if (!b64) return;

    setIsConverting(true);
    setOutput(null);

    try {
      if (format === 'pdf') {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setOutput({ type: 'pdf', url });
      } else if (format === 'png') {
        const url = `data:image/png;base64,${b64}`;
        setOutput({ type: 'png', url });
      } else if (format === 'zpl') {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const text = new TextDecoder('utf-8').decode(bytes);
        setZplText(text);
        setZplStep(1);
        setOutput({ type: 'zpl-text', text });
      }
    } catch {
      setOutput({ type: 'pdf', error: 'Invalid Base64 data. Please check your input.' });
    } finally {
      setIsConverting(false);
    }
  }, [format, input]);

  const handleZplPreview = useCallback(async () => {
    if (!zplText) return;
    setIsConverting(true);
    try {
      const res = await fetch('https://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'image/png' },
        body: zplText,
      });
      if (!res.ok) throw new Error('Labelary API error');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setZplStep(2);
      setOutput({ type: 'zpl-image', url });
    } catch {
      setOutput({ type: 'zpl-text', text: zplText, error: 'Could not render ZPL preview. Check network or ZPL syntax.' });
    } finally {
      setIsConverting(false);
    }
  }, [zplText]);

  const handleDownload = () => {
    if (!output?.url) return;
    const ext = output.type === 'pdf' ? 'pdf' : 'png';
    const a = document.createElement('a');
    a.href = output.url;
    a.download = `converted.${ext}`;
    a.click();
  };

  const handlePrint = () => {
    if (!output?.url) return;
    const win = window.open('', '_blank');
    if (!win) return;
    if (output.type === 'pdf') {
      win.document.write(`<html><body style="margin:0"><embed src="${output.url}" width="100%" height="100%" type="application/pdf"/></body></html>`);
    } else {
      win.document.write(`<html><body style="margin:0;text-align:center"><img src="${output.url}" style="max-width:100%"/></body></html>`);
    }
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const handleCopy = async () => {
    if (!output?.text) return;
    await navigator.clipboard.writeText(output.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInput('');
    setOutput(null);
    setZplText('');
    setZplStep(1);
    setZoom(100);
  };

  const formatCards = [
    { id: 'pdf' as Format, label: 'PDF', title: 'PDF Document', desc: 'Decode Base64 PDF and view inline', Icon: FileText },
    { id: 'png' as Format, label: 'PNG', title: 'PNG Image', desc: 'Decode Base64 image data into a viewer', Icon: ImageIcon },
    { id: 'zpl' as Format, label: 'ZPL', title: 'ZPL Label', desc: 'Decode Base64 \u2192 ZPL \u2192 render label preview', Icon: Tag },
  ];

  const hasPreview = output && !output.error && (output.url || (output.type === 'zpl-text' && output.text));
  const showToolbar = hasPreview && (output.type !== 'zpl-text');

  return (
    <div className="min-h-screen bg-[#F0F4F7] font-maersk-text">
      {/* Header */}
      <header className="bg-[#0073AB] border-b border-[#005E8C]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={`${import.meta.env.BASE_URL}images/MAERSK.png`} alt="Maersk" className="h-7 w-auto object-contain" />
            <span className="text-sm font-semibold tracking-[0.08em] text-white uppercase font-maersk-headline">Maersk</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white/90" />
            <span className="text-[15px] tracking-[0.15em] font-medium text-white uppercase font-maersk-headline">Base64 Converter</span>
            <span className="text-xs text-white/90 font-maersk-text">Powered by Maersk</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-white border border-[#D0DDE8] rounded-full px-3 py-1 mb-5">
            <span className="text-[#0073AB]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.5 9.5H2L8 14l-2.5 7.5L12 17l6.5 4.5L16 14l6-4.5h-7.5Z"/></svg>
            </span>
            <span className="text-[11px] font-medium text-[#4A6278] tracking-wide">Logistics utility &middot; Base64 toolkit</span>
          </div>
          <h1 className="text-[2.6rem] font-bold leading-tight text-[#00243D] mb-3 font-maersk-headline">
            Decode Base64 to{' '}
            <span className="text-[#0073AB]">PDF, PNG</span>{' '}
            or{' '}
            <span className="text-[#0073AB]">ZPL.</span>
          </h1>
          <p className="text-[#4A6278] text-base max-w-xl leading-relaxed">
            Paste a raw Base64 payload, pick a target format and preview the result &mdash; all client-side, no upload required.
          </p>
        </div>

        {/* Format selector */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {formatCards.map(({ id, label, title, desc, Icon }) => (
            <button
              key={id}
              onClick={() => { setFormat(id); setOutput(null); setZplStep(1); setZplText(''); }}
              className={`relative text-left p-5 rounded-xl border-2 transition-all duration-200 bg-white group ${
                format === id
                  ? 'border-[#0073AB] shadow-md shadow-[#0073AB]/10'
                  : 'border-[#DDE6EF] hover:border-[#A0BDD0]'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${format === id ? 'bg-[#0073AB]/10' : 'bg-[#F0F4F7] group-hover:bg-[#E6EFF5]'} transition-colors`}>
                  <Icon size={18} className={format === id ? 'text-[#0073AB]' : 'text-[#6B8CA4]'} />
                </div>
                <span className={`text-[11px] font-bold tracking-widest ${format === id ? 'text-[#0073AB]' : 'text-[#8AA4B8]'}`}>{label}</span>
              </div>
              <p className={`text-sm font-semibold mb-1 ${format === id ? 'text-[#00243D]' : 'text-[#2D4A5E]'}`}>{title}</p>
              <p className="text-[12px] text-[#6B8CA4] leading-snug">{desc}</p>
              {format === id && (
                <span className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-[#0073AB]" />
              )}
            </button>
          ))}
        </div>

        {/* Input panel */}
        <div className="bg-white rounded-xl border border-[#DDE6EF] p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} className="text-[#0073AB]" />
            <span className="text-xs font-semibold text-[#4A6278] tracking-wide">
              Base64 input for{' '}
              <span className="text-[#0073AB] font-bold">{format.toUpperCase()}</span>
            </span>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste your raw Base64 string here&#8230;"
            className="w-full h-36 bg-[#F7FAFC] border border-[#DDE6EF] rounded-lg px-4 py-3 text-sm font-mono text-[#2D4A5E] placeholder-[#A0B4C4] resize-y focus:outline-none focus:border-[#0073AB] focus:ring-2 focus:ring-[#0073AB]/10 transition-all"
          />
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <button
                onClick={handleConvert}
                disabled={!input.trim() || isConverting}
                className="flex items-center gap-2 bg-[#0073AB] hover:bg-[#005E8C] disabled:bg-[#A0BDD0] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 shadow-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.5 9.5H2L8 14l-2.5 7.5L12 17l6.5 4.5L16 14l6-4.5h-7.5Z"/></svg>
                {isConverting ? 'Converting...' : 'Convert'}
              </button>
              {input && (
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1.5 text-sm text-[#6B8CA4] hover:text-[#00243D] transition-colors"
                >
                  <RotateCcw size={13} />
                  Clear
                </button>
              )}
            </div>
            <span className="text-[11px] text-[#8AA4B8] tabular-nums">{input.length.toLocaleString()} chars</span>
          </div>
        </div>

        {/* ZPL stepper */}
        {format === 'zpl' && output?.type === 'zpl-text' && !output.error && (
          <div className="flex items-center gap-3 mb-5 bg-white border border-[#DDE6EF] rounded-xl px-5 py-4 shadow-sm">
            <div className={`flex items-center gap-2 text-sm font-medium ${zplStep >= 1 ? 'text-[#0073AB]' : 'text-[#8AA4B8]'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${zplStep >= 1 ? 'bg-[#0073AB] text-white' : 'bg-[#DDE6EF] text-[#8AA4B8]'}`}>1</span>
              Base64 &rarr; ZPL
            </div>
            <ChevronRight size={14} className="text-[#A0BDD0]" />
            <div className={`flex items-center gap-2 text-sm font-medium ${zplStep >= 2 ? 'text-[#0073AB]' : 'text-[#8AA4B8]'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${zplStep >= 2 ? 'bg-[#0073AB] text-white' : 'bg-[#DDE6EF] text-[#8AA4B8]'}`}>2</span>
              ZPL &rarr; Label Preview
            </div>
            <div className="ml-auto">
              <button
                onClick={handleZplPreview}
                disabled={isConverting}
                className="flex items-center gap-2 bg-[#00243D] hover:bg-[#003A5C] disabled:bg-[#8AA4B8] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
              >
                <ImageIcon size={13} />
                {isConverting ? 'Rendering...' : 'Render Label Preview'}
              </button>
            </div>
          </div>
        )}

        {/* Output panel */}
        {output && (
          <div className="bg-white rounded-xl border border-[#DDE6EF] shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#EEF2F6] bg-[#F7FAFC]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#00243D] tracking-wide uppercase">
                  {output.type === 'pdf' && 'PDF Preview'}
                  {output.type === 'png' && 'PNG Preview'}
                  {output.type === 'zpl-text' && 'ZPL Source'}
                  {output.type === 'zpl-image' && 'Label Preview'}
                </span>
                {output.error && (
                  <span className="flex items-center gap-1 text-[11px] text-red-500 font-medium">
                    <AlertCircle size={11} /> Error
                  </span>
                )}
              </div>
              {showToolbar && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setZoom(z => Math.max(25, z - 25))} className="p-1.5 rounded hover:bg-[#E6EFF5] transition-colors text-[#4A6278]" title="Zoom out">
                    <ZoomOut size={14} />
                  </button>
                  <span className="text-[11px] tabular-nums font-semibold text-[#4A6278] w-10 text-center">{zoom}%</span>
                  <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="p-1.5 rounded hover:bg-[#E6EFF5] transition-colors text-[#4A6278]" title="Zoom in">
                    <ZoomIn size={14} />
                  </button>
                  <div className="w-px h-4 bg-[#DDE6EF] mx-1" />
                  <button onClick={handlePrint} className="p-1.5 rounded hover:bg-[#E6EFF5] transition-colors text-[#4A6278]" title="Print">
                    <Printer size={14} />
                  </button>
                  <button onClick={handleDownload} className="flex items-center gap-1.5 text-[11px] font-semibold bg-[#0073AB] hover:bg-[#005E8C] text-white px-3 py-1.5 rounded-lg ml-1 transition-colors" title="Download">
                    <Download size={12} />
                    Download
                  </button>
                </div>
              )}
              {output.type === 'zpl-text' && !output.error && (
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-[11px] font-semibold border border-[#DDE6EF] hover:border-[#0073AB] hover:text-[#0073AB] text-[#4A6278] px-3 py-1.5 rounded-lg transition-all">
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy ZPL'}
                </button>
              )}
            </div>

            {/* Content */}
            <div ref={previewRef} className="relative min-h-[320px] bg-[#F0F4F7] flex items-start justify-center overflow-auto p-6">
              {output.error ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                    <X size={18} className="text-red-400" />
                  </div>
                  <p className="text-sm font-medium text-red-600">{output.error}</p>
                </div>
              ) : output.type === 'pdf' && output.url ? (
                <div className="w-full" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}>
                  <iframe
                    src={output.url}
                    title="PDF Preview"
                    className="w-full rounded-lg shadow-md bg-white"
                    style={{ height: '600px', border: 'none' }}
                  />
                </div>
              ) : output.type === 'png' && output.url ? (
                <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}>
                  <img
                    src={output.url}
                    alt="PNG Preview"
                    className="rounded-lg shadow-md max-w-full object-contain bg-white"
                    style={{ maxHeight: '600px' }}
                  />
                </div>
              ) : output.type === 'zpl-text' && output.text ? (
                <pre className="w-full text-xs font-mono text-[#2D4A5E] bg-white rounded-lg border border-[#DDE6EF] p-5 overflow-auto max-h-[500px] leading-relaxed whitespace-pre-wrap break-all shadow-sm">
                  {output.text}
                </pre>
              ) : output.type === 'zpl-image' && output.url ? (
                <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}>
                  <img
                    src={output.url}
                    alt="ZPL Label Preview"
                    className="rounded-lg shadow-md bg-white object-contain"
                    style={{ maxHeight: '600px' }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
