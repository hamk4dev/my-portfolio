'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Terminal, Monitor, ChevronRight, CornerDownLeft, Home, Search, List, ArrowLeft, Cpu, Layout, Rocket, Loader2, ShieldCheck, BookOpen } from 'lucide-react';
import ContactHub from '@/components/ContactHub';
import EmailAuthAnalyzer from '@/components/EmailAuthAnalyzer';
import GlobalTurnstileGate from '@/components/GlobalTurnstileGate';
import WebSecurityScanner from '@/components/WebSecurityScanner';
import { scannerAllowedTargets } from '@/data/scanner-policy';
import { initialVFS } from '@/data/vfs';
import { getNodeAtPath, resolvePath, renderDocumentContent } from '@/lib/utils';
import {
  callGemini,
  runBackendWebScan,
  runEmailAuthAnalysis,
  checkIPReputationOnBackend,
  getSystemHealthOnBackend,
} from '@/services/api';

export default function PortfolioOS() {
  const vfs = initialVFS;
  const [currentPath, setCurrentPath] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  
  const [isGenerating, setIsGenerating] = useState(true); 
  const [aiSummary, setAiSummary] = useState(null);
  const [summaryCache, setSummaryCache] = useState({});

  const [showPitchModal, setShowPitchModal] = useState(false);
  const [pitchContent, setPitchContent] = useState('');
  const [isGeneratingPitch, setIsGeneratingPitch] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  const [splitRatio, setSplitRatio] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const mainContainerRef = useRef(null);
  const [time, setTime] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [siteAccessMode, setSiteAccessMode] = useState('verifying');
  const [turnstileReopenSignal, setTurnstileReopenSignal] = useState(0);
  const [viewportState, setViewportState] = useState({ width: 0, isTouch: false });

  const [history, setHistory] = useState([
    { id: 0, type: 'system', text: 'Init.CV v1.0.0 initialized.' },
    { id: 1, type: 'system', text: 'Ketik "help" untuk melihat daftar perintah.' }
  ]); 
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [inputValue, setInputValue] = useState('');
  const [activeTask, setActiveTask] = useState('Menyiapkan antarmuka...');
  
  const endOfTerminalRef = useRef(null);
  const terminalViewportRef = useRef(null);
  const previewViewportRef = useRef(null);
  const inputRef = useRef(null);

  const queueTerminalScroll = () => {
    setTimeout(() => {
      const terminalViewport = terminalViewportRef.current;
      if (!terminalViewport) return;
      terminalViewport.scrollTo({
        top: terminalViewport.scrollHeight,
        behavior: 'smooth',
      });
    }, 100);
  };

  const focusTerminalInput = (force = false) => {
    if (!inputRef.current) return;
    if (force || (typeof window !== 'undefined' && window.innerWidth >= 768)) {
      try {
        inputRef.current.focus({ preventScroll: true });
      } catch {
        inputRef.current.focus();
      }
    }
  };

  useEffect(() => {
    const bootTimer = setTimeout(() => {
      setIsGenerating(false);
      setActiveTask(null);
    }, 350);

    return () => clearTimeout(bootTimer);
  }, []);

  useEffect(() => {
    const terminalViewport = terminalViewportRef.current;
    if (!terminalViewport) return;
    terminalViewport.scrollTo({
      top: terminalViewport.scrollHeight,
      behavior: 'smooth',
    });
  }, [history]);

  useEffect(() => {
    if (!isGenerating && !activeTask) {
      focusTerminalInput();
      queueTerminalScroll();
    }
  }, [isGenerating, activeTask]);

  useEffect(() => {
    const previewViewport = previewViewportRef.current;
    if (!previewViewport) return;

    previewViewport.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  }, [selectedNode?.path, selectedNode?.name, currentPath.join('/')]);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncViewportState = () => {
      const width = typeof window !== 'undefined' ? window.innerWidth : 0;
      const isTouch =
        typeof window !== 'undefined' &&
        (
          window.matchMedia?.('(pointer: coarse)')?.matches ||
          navigator.maxTouchPoints > 0
        );

      setViewportState({ width, isTouch: Boolean(isTouch) });
    };

    syncViewportState();
    window.addEventListener('resize', syncViewportState);

    return () => {
      window.removeEventListener('resize', syncViewportState);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getSystemHealthOnBackend()
      .then((data) => {
        if (isMounted) {
          setSystemHealth(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSystemHealth(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshSystemHealth = () => {
    getSystemHealthOnBackend()
      .then((data) => {
        setSystemHealth(data);
      })
      .catch(() => {
        setSystemHealth(null);
      });
  };

  const requestFullAccess = () => {
    setTurnstileReopenSignal((value) => value + 1);
  };

  const formattedTimeWITA = time
    ? time.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : '--:--:--';

  const updateSplitRatio = (clientX, clientY) => {
    if (!mainContainerRef.current) return;
    const rect = mainContainerRef.current.getBoundingClientRect();
    const isDesktop = window.innerWidth >= 768;

    if (isDesktop) {
      let newRatio = ((clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.max(20, Math.min(newRatio, 80)));
    } else {
      let newRatio = ((clientY - rect.top) / rect.height) * 100;
      setSplitRatio(Math.max(20, Math.min(newRatio, 80)));
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    updateSplitRatio(e.clientX, e.clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    updateSplitRatio(touch.clientX, touch.clientY);
  };

  const handleDragEnd = () => setIsDragging(false);

  const MAX_DAILY_CALLS = 50;
  const AI_USAGE_STORAGE_KEY = 'portfolio_ai_usage_v2';
  const getAiQuotaExceededMessage = () => 'Batas penggunaan AI untuk hari ini sudah tercapai. Coba lagi besok.';

  const getAiUsageSnapshot = () => {
    const today = new Date().toDateString();
    const usage = JSON.parse(localStorage.getItem(AI_USAGE_STORAGE_KEY) || '{}');

    if (usage.date !== today || !Number.isFinite(usage.count)) {
      return { date: today, count: 0 };
    }

    return {
      date: today,
      count: usage.count,
    };
  };

  const hasRemainingAiQuota = () => {
    try {
      return getAiUsageSnapshot().count < MAX_DAILY_CALLS;
    } catch {
      return true;
    }
  };

  const recordAiUsage = () => {
    try {
      const usage = getAiUsageSnapshot();
      localStorage.setItem(
        AI_USAGE_STORAGE_KEY,
        JSON.stringify({
          date: usage.date,
          count: usage.count + 1,
        })
      );
    } catch {}
  };

  // Client guard only. API routes still enforce server-side validation and rate limiting.
  const getVfsContext = (node, path = '') => {
    let context = '';
    if (node.type === 'file') {
       if (path.endsWith('.html')) return '';
       context += `\n[File: /${path}]\n${node.content}\n`;
    } else if (node.type === 'dir') {
       Object.entries(node.children).forEach(([key, child]) => {
         if (!key.startsWith('.')) {
           context += getVfsContext(child, path ? `${path}/${key}` : key);
         }
       });
    }
    return context;
  };

  const getPortfolioAiContext = () => getVfsContext(vfs).slice(0, 7000);
  const getTerminalAiContext = () => getVfsContext(vfs).slice(0, 4200);
  const isAiAvailable = systemHealth?.services?.ai;
  const hasProtectedAccess = siteAccessMode === 'verified';

  const getAccessLockedMessage = (feature = 'Fitur ini') =>
    `${feature} belum tersedia untuk sesi ini. Muat ulang halaman atau coba lagi sebentar lagi.`;
  const getAiUnavailableMessage = () => 'Fitur AI sedang tidak tersedia saat ini.';

  const getAiErrorMessage = (error) => {
    if (error?.status === 413) return 'Permintaan AI terlalu panjang. Coba ringkas isi yang diminta.';
    if (error?.status === 429) return 'Permintaan AI sedang padat. Coba lagi beberapa saat lagi.';
    if (error?.status === 504) return 'Layanan AI memerlukan waktu lebih lama dari biasanya. Coba lagi sebentar lagi.';
    if (error?.status === 403) return getAccessLockedMessage('Fitur AI');
    return getAiUnavailableMessage();
  };


  const getTerminalToolError = (tool, message) => `${tool} error: ${message}`;

  const getTerminalSystemErrorMessage = () => 'Permintaan belum dapat diproses saat ini. Coba lagi sebentar lagi.';
  const getAllowedWebscanTargetsMessage = () =>
    scannerAllowedTargets.map((target) => `- ${target.hostname}`).join('\n');

  const getWebscanErrorMessage = (error) => {
    if (error?.code === 'DOMAIN_NOT_ALLOWED') {
      return `Website ini dibatasi dan tidak diizinkan untuk scanning langsung.\n\nDaftar website demo yang diizinkan:\n${getAllowedWebscanTargetsMessage()}`;
    }

    if (error?.status === 429) {
      return 'Scanner sedang padat. Coba lagi beberapa saat lagi.';
    }

    return 'Scanner belum dapat dijalankan saat ini. Coba lagi sebentar lagi.';
  };

  const getMailauthErrorMessage = (error) => {
    if (error?.code === 'DOMAIN_NOT_ALLOWED') {
      return 'Domain ini perlu ditinjau lebih dulu. Gunakan panel analyzer untuk melihat detail dan mengirim permintaan izin.';
    }

    if (error?.status === 429) {
      return 'Analyzer sedang padat. Coba lagi beberapa saat lagi.';
    }

    return 'Analyzer belum dapat dijalankan saat ini. Coba lagi sebentar lagi.';
  };


  const handleGeneratePitch = () => {
    setShowPitchModal(true);
    setCopyFeedback('');
    const canReusePitch = pitchContent && !/^(Fitur AI|Kuota AI|Permintaan AI|Elevator Pitch belum tersedia|Batas penggunaan AI)/.test(pitchContent);
    if (canReusePitch) return;

    if (!hasProtectedAccess) {
      setPitchContent(getAccessLockedMessage('Fitur AI')); 
      return;
    }

    if (isAiAvailable === false) {
      setPitchContent(getAiUnavailableMessage());
      return;
    }
    
    if (!hasRemainingAiQuota()) {
      setPitchContent(getAiQuotaExceededMessage());
      return;
    }

    setIsGeneratingPitch(true);
    const portfolioData = getPortfolioAiContext();
    const prompt = `Berdasarkan data portfolio berikut:\n${portfolioData}\n\nBuatkan sebuah "Elevator Pitch" atau paragraf persuasif singkat (maksimal 2-3 paragraf) yang menjelaskan mengapa saya (pemilik portfolio ini) adalah kandidat yang sangat berharga untuk direkrut.`;

    const systemInstruction = `Kamu adalah representasi profesional dari pemilik portfolio.
ATURAN SANGAT KETAT:
1. LANGSUNG berikan isi pitch. DILARANG KERAS menggunakan kalimat basa-basi pengantar/penutup.
2. Gunakan bahasa Indonesia formal, elegan, dan to the point.
3. Jangan menggunakan banyak simbol markdown.`;

    callGemini(prompt, systemInstruction)
      .then(res => {
        recordAiUsage();
        setPitchContent(res);
      })
      .catch(err => setPitchContent(getAiErrorMessage(err)))
      .finally(() => setIsGeneratingPitch(false));
  };

  const executeCommand = (cmdString) => {
    const trimmedCmd = cmdString.trim();
    if (!trimmedCmd) return;

    const newId = Date.now();
    const promptStr = `hamk4dev@portfolio:~${currentPath.length > 0 ? '/' + currentPath.join('/') : ''}$ ${trimmedCmd}`;
    
    let newHistory = [...history, { id: newId, type: 'input', text: promptStr }];
    
    if (commandHistory[commandHistory.length - 1] !== trimmedCmd) {
      setCommandHistory([...commandHistory, trimmedCmd]);
    }
    setHistoryIndex(-1);

    const args = trimmedCmd.split(' ').filter(Boolean);
    const cmd = args[0].toLowerCase();

    const print = (text, type = 'output') => {
      newHistory.push({ id: Date.now() + Math.random(), type, text });
    };

    try {
      switch (cmd) {
        case 'help':
          print('===================================================');
          print('                 DAFTAR PERINTAH OS');
          print('===================================================');
          
          print('\n[ NAVIGASI & SISTEM ]');
          print('  help     : Menampilkan pesan bantuan ini');
          print('  clear    : Membersihkan layar terminal');
          print('  pwd      : Menampilkan path direktori saat ini');
          print('  ls       : Menampilkan isi direktori');
          print('  cd <dir> : Berpindah direktori (contoh: cd projects)');
          print('  back     : Kembali ke direktori sebelumnya');
          print('  tree     : Menampilkan struktur pohon direktori');
          
          print('\n[ MANAJEMEN FILE ]');
          print('  cat <file>: Menampilkan isi file di terminal');
          print('  open <file>: Membuka file di panel GUI sebelah kanan');
          print('  search   : Mencari file atau teks tertentu');
          
          print('\n[ UTILITIES & AI ]');
          print('  ai <msg> : Mengobrol dengan AI Copilot Portfolio');
          print('  whoami   : Menampilkan identitas OS dan Jaringan Anda');
          
          print('\n[ SECURITY TOOLS ]');
          print('  webscan <url>   : Menjalankan Web Security Scanner (CLI Mode)');
          print('  mailauth <domain>: Menjalankan Email Auth Analyzer (CLI Mode)');
          print('  open tools/webscan.app : Membuka Web Security Scanner di panel GUI');
          print('  open tools/mailauth.app: Membuka Email Auth Analyzer di panel GUI');
          print('===================================================');
          break;

        case 'pwd':
          print(`/${currentPath.join('/')}`);
          break;

        case 'ls': {
          const targetPath = args[1] ? resolvePath(currentPath, args[1]) : currentPath;
          const node = getNodeAtPath(vfs, targetPath);
          if (!node) {
            print(`ls: tidak dapat mengakses '${args[1]}': Direktori tidak ditemukan`, 'error');
          } else if (node.type === 'file') {
            print(args[1]);
          } else {
            const children = Object.keys(node.children).filter(k => !k.startsWith('.'));
            if (children.length === 0) print('(direktori kosong)');
            else print(children.join('  '));
          }
          break;
        }

        case 'cd': {
          if (!args[1]) {
            setCurrentPath([]);
            break;
          }
          const targetPath = resolvePath(currentPath, args[1]);
          const node = getNodeAtPath(vfs, targetPath);
          if (!node) {
            print(`cd: ${args[1]}: Direktori tidak ditemukan`, 'error');
          } else if (node.type === 'file') {
            print(`cd: ${args[1]}: Bukan sebuah direktori`, 'error');
          } else {
            setCurrentPath(targetPath);
            setSelectedNode(null);
            setAiSummary(null);
          }
          break;
        }

        case 'back': {
          if (selectedNode) {
            setSelectedNode(null);
            setAiSummary(null);
          } else if (currentPath.length > 0) {
            setCurrentPath(currentPath.slice(0, -1));
            setSelectedNode(null);
            setAiSummary(null);
          }
          break;
        }

        case 'clear':
          newHistory = [];
          break;

        case 'cat': {
          if (!args[1]) {
            print('cat: membutuhkan argumen nama file', 'error');
            break;
          }
          const targetPath = resolvePath(currentPath, args[1]);
          const node = getNodeAtPath(vfs, targetPath);
          if (!node) {
            print(`cat: ${args[1]}: File tidak ditemukan`, 'error');
          } else if (node.type === 'dir') {
            print(`cat: ${args[1]}: Adalah sebuah direktori`, 'error');
          } else {
            print(node.content);
          }
          break;
        }

        case 'open': {
          if (!args[1]) {
            print('open: membutuhkan argumen nama file', 'error');
            break;
          }
          const targetPath = resolvePath(currentPath, args[1]);
          const node = getNodeAtPath(vfs, targetPath);
          const fileName = targetPath[targetPath.length - 1];
          
          if (!node) {
            print(`open: ${args[1]}: File tidak ditemukan`, 'error');
          } else if (node.type === 'dir') {
            print(`open: ${args[1]}: Gunakan 'cd' untuk membuka direktori`, 'error');
          } else if (fileName.startsWith('.')) {
             print(`open: ${args[1]}: Permission denied (File system dilindungi)`, 'error');
          } else {
            print(`Membuka ${fileName} di panel GUI...`);
            setSelectedNode({ name: fileName, path: targetPath.join('/'), ...node });
          }
          break;
        }

        case 'tree': {
          const MAX_DEPTH = 3; 
          let nodeCount = 0;
          const MAX_NODES = 50; 

          const printTree = (node, prefix = '', isLast = true, currentDepth = 0) => {
            if (currentDepth > MAX_DEPTH || nodeCount > MAX_NODES) return;
            nodeCount++;
            if (node.name !== 'root') {
              print(`${prefix}${isLast ? '\\-- ' : '|-- '}${node.name || 'node'}`);
            } else {
              print('.');
            }
            if (node.type === 'dir') {
              const childrenKeys = Object.keys(node.children).filter(k => !k.startsWith('.'));
              childrenKeys.forEach((key, index) => {
                const childPrefix = node.name === 'root' ? '' : prefix + (isLast ? '    ' : '|   ');
                printTree({name: key, ...node.children[key]}, childPrefix, index === childrenKeys.length - 1, currentDepth + 1);
              });
            }
          };
          printTree(vfs);
          if (nodeCount > MAX_NODES) print('... (tampilan dipotong untuk alasan keamanan)');
          break;
        }

        case 'whoami': {
          print('Sedang memproses...', 'system');
          if (!hasProtectedAccess) {
            print(getTerminalToolError('whoami', getAccessLockedMessage('Fitur ini')), 'error');
            break;
          }
          const userAgent = navigator.userAgent;
          let osName = "Unknown OS";
          if (userAgent.indexOf("Win") !== -1) osName = "Windows";
          if (userAgent.indexOf("Mac") !== -1) osName = "MacOS";
          if (userAgent.indexOf("X11") !== -1) osName = "UNIX";
          if (userAgent.indexOf("Linux") !== -1) osName = "Linux";
          if (userAgent.indexOf("Android") !== -1) osName = "Android";
          if (userAgent.indexOf("like Mac") !== -1) osName = "iOS";

          let browserName = "Unknown Browser";
          if (userAgent.match(/edg/i)) browserName = "Microsoft Edge";
          else if (userAgent.match(/opr\//i) || userAgent.match(/opera/i)) browserName = "Opera";
          else if (userAgent.match(/chrome|chromium|crios/i)) browserName = "Google Chrome";
          else if (userAgent.match(/firefox|fxios/i)) browserName = "Mozilla Firefox";
          else if (userAgent.match(/safari/i)) browserName = "Apple Safari";
          else if (userAgent.match(/trident/i)) browserName = "Internet Explorer";

          const lang = navigator.language || 'Unknown';
          const screenRes = `${window.screen.width}x${window.screen.height}`;

          checkIPReputationOnBackend()
            .then(data => {
              const info = [
                `[ USER IDENTIFICATION ]`,
                `Session     : browser_client`,
                `Access      : interactive`,
                ``,
                `[ NETWORK INFO ]`,
                `IP Address  : ${data.ip || 'Unknown'}`,
                `Country     : ${data.country || 'Unknown'}`,
                `Threat Score: ${typeof data.score === 'number' ? data.score : 0}`,
                `Provider    : ${data.provider || 'Unknown'}`,
                `Status      : ${data.isMalicious ? 'POTENSI MALICIOUS' : 'NORMAL'}`,
                ``,
                `[ SYSTEM INFO ]`,
                `OS          : ${osName}`,
                `Browser     : ${browserName}`,
                `Resolution  : ${screenRes}`,
                `Language    : ${lang}`
              ].join('\n');
              setHistory(prev => [...prev, { id: Date.now(), type: 'output', text: info }]);
              queueTerminalScroll();
            })
            .catch(() => {
              const fallbackInfo = [
                `[ NETWORK INFO ]`,
                `Status      : LAYANAN INSPEKSI TIDAK TERSEDIA`,
                `IP Address  : Tidak dapat diverifikasi`,
                `Provider    : Tidak tersedia`,
                ``,
                `[ SYSTEM INFO ]`,
                `OS          : ${osName}`,
                `Browser     : ${browserName}`,
                `Resolution  : ${screenRes}`,
                `Language    : ${lang}`
              ].join('\n');
              setHistory(prev => [...prev, { id: Date.now(), type: 'output', text: fallbackInfo }]);
              queueTerminalScroll();
            });
          break;
        }

        case 'webscan': {
          if (!args[1]) {
             print('webscan: masukkan target URL. Contoh: webscan demo.owasp-juice.shop', 'error');
             break;
          }
          let target = args[1];
          if (!target.startsWith('http')) target = 'https://' + target;

          if (!hasProtectedAccess) {
             print(getTerminalToolError('webscan', getAccessLockedMessage('Fitur ini')), 'error');
             break;
          }

          setIsGenerating(true);
          setActiveTask('Sedang memproses...');

          runBackendWebScan(target).then(res => {
             let output = [`\n[ TARGET: ${res.target} ]\n`];
             output.push(`[ HASIL AKHIR ]`);
             output.push(`Skor Keamanan : ${res.score}/100`);
             output.push(`Grade Keseluruhan : ${res.grade}`);
             output.push(`Ringkasan      : ${res.summary}`);
             output.push(`\n[ UNIT YANG DIUJI ]`);
             res.categories?.forEach((category) => {
                output.push(`${category.name} : ${category.score}/${category.maxScore} (${category.status})`);
             });
             output.push(`\n[ LOG TEMUAN ]`);
             res.issues.forEach(i => {
                output.push(`[${i.severity}] ${i.name}`);
             });
             setHistory(prev => [...prev, { id: Date.now(), type: 'output', text: output.join('\n') }]);
          }).catch(err => {
             setHistory(prev => [
               ...prev,
               { id: Date.now(), type: 'error', text: getTerminalToolError('webscan', getWebscanErrorMessage(err)) },
             ]);
          }).finally(() => {
             setIsGenerating(false);
             setActiveTask(null); 
             queueTerminalScroll();
          });
          break;
        }

        case 'mailauth': {
          if (!args[1]) {
             print('mailauth: masukkan domain. Contoh: mailauth cloudflare.com', 'error');
             break;
          }

          if (!hasProtectedAccess) {
             print(getTerminalToolError('mailauth', getAccessLockedMessage('Fitur ini')), 'error');
             break;
          }

          setIsGenerating(true);
          setActiveTask('Sedang memproses...');

          runEmailAuthAnalysis(args[1]).then(res => {
             let output = [`\n[ TARGET: ${res.domain} ]\n`];
             output.push('[ HASIL AKHIR ]');
             output.push(`SPF           : ${res.spf.status} (${res.spf.verdict})`);
             output.push(`DMARC         : ${res.dmarc.status} (${res.dmarc.verdict})`);
             output.push(`Resolver SPF  : ${res.resolvers?.spf || 'system'}`);
             output.push(`Resolver DMARC: ${res.resolvers?.dmarc || 'system'}`);
             output.push(`Ringkasan     : ${res.summary}`);
             output.push('\n[ RAW DNS ]');

             const spfRecords = res.rawDnsRecords?.spfTxtRecords || [];
             const dmarcRecords = res.rawDnsRecords?.dmarcTxtRecords || [];

             if (spfRecords.length) {
               spfRecords.forEach((record, index) => {
                 output.push(`SPF TXT #${index + 1} : ${record}`);
               });
             } else {
               output.push('SPF TXT       : Tidak ada record TXT yang dikembalikan');
             }

             if (dmarcRecords.length) {
               dmarcRecords.forEach((record, index) => {
                 output.push(`DMARC TXT #${index + 1}: ${record}`);
               });
             } else {
               output.push('DMARC TXT     : Tidak ada record TXT yang dikembalikan');
             }

             setHistory(prev => [...prev, { id: Date.now(), type: 'output', text: output.join('\n') }]);
          }).catch(err => {
             setHistory(prev => [
               ...prev,
               { id: Date.now(), type: 'error', text: getTerminalToolError('mailauth', getMailauthErrorMessage(err)) },
             ]);
          }).finally(() => {
             setIsGenerating(false);
             setActiveTask(null);
             queueTerminalScroll();
          });
          break;
        }

        case 'ai': {
          if (!args[1]) {
            print('ai: masukkan pesan. Contoh: ai apa saja skill yang dimiliki?', 'error');
            break;
          }
          if (!hasProtectedAccess) {
             print(getTerminalToolError('ai', getAccessLockedMessage('Fitur AI')), 'error');
             break;
          }
          if (isAiAvailable === false) {
             print(getTerminalToolError('ai', getAiUnavailableMessage()), 'error');
             break;
          }
          const prompt = args.slice(1).join(' ');
          
          if (prompt.length > 320) {
             print(getTerminalToolError('ai', 'Pesan terlalu panjang. Maksimal 320 karakter.'), 'error');
             break;
          }

          if (!hasRemainingAiQuota()) {
             print(getTerminalToolError('ai', getAiQuotaExceededMessage()), 'error');
             break;
          }

          setIsGenerating(true);
          setActiveTask('AI sedang memproses...');
          
          const portfolioData = getTerminalAiContext();
          const strictSystemPrompt = `
Kamu adalah AI Copilot khusus untuk "Init.CV".
Tugas utamamu HANYA menjawab pertanyaan seputar pemilik portfolio ini.

ATURAN SANGAT KETAT:
1. Basis Pengetahuan: Kamu HANYA boleh menggunakan informasi dari "DATA PORTFOLIO" yang diberikan pada prompt pengguna.
2. Pembatasan Scope: JANGAN PERNAH menjawab pertanyaan umum.
3. Format Jawaban: Jawab langsung ke intinya, profesional, singkat, bahasa Indonesia.
4. DILARANG menggunakan simbol markdown tebal/bintang.
`;

          const aiPrompt = `DATA PORTFOLIO:\n${portfolioData}\n\nPERTANYAAN PENGGUNA:\n${prompt}`;

          callGemini(aiPrompt, strictSystemPrompt)
            .then(res => {
              recordAiUsage();
              setHistory(prev => [...prev, { id: Date.now(), type: 'ai_output', text: res }]);
            })
            .catch(err => {
              setHistory(prev => [...prev, { id: Date.now(), type: 'error', text: getTerminalToolError('ai', getAiErrorMessage(err)) }]);
            })
            .finally(() => {
               setIsGenerating(false);
               setActiveTask(null);
               queueTerminalScroll();
            });
          break;
        }

        case 'search': {
          if (!args[1]) {
             print('search: membutuhkan kata kunci pencarian', 'error');
             break;
          }
          const keyword = args.slice(1).join(' ').toLowerCase();
          if (keyword.length > 50) {
             print('search: Kata kunci terlalu panjang.', 'error');
             break;
          }
          const results = [];
          
          const searchNode = (node, path) => {
            if (results.length > 20) return; 

            if (node.type === 'file') {
              if (!path.split('/').pop().startsWith('.') && (path.toLowerCase().includes(keyword) || (node.content && node.content.toLowerCase().includes(keyword)))) {
                results.push(path);
              }
            } else if (node.type === 'dir') {
               Object.entries(node.children).forEach(([key, child]) => {
                  if (!key.startsWith('.')) {
                     searchNode(child, path ? `${path}/${key}` : key);
                  }
               });
            }
          };
          
          searchNode(vfs, '');
          if (results.length > 0) {
            print(`Ditemukan ${results.length} kecocokan:`);
            results.forEach(r => print(`- /${r}`));
          } else {
            print('Tidak ada file atau konten yang cocok ditemukan.');
          }
          break;
        }

        default:
          print(`Perintah tidak ditemukan: ${cmd}. Ketik "help" untuk bantuan.`, 'error');
      }
    } catch (err) {
      print(getTerminalSystemErrorMessage(), 'error');
    }
    setHistory(newHistory);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      executeCommand(inputValue);
      setInputValue('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIndex = historyIndex + 1;
        if (nextIndex < commandHistory.length) {
          setHistoryIndex(nextIndex);
          setInputValue(commandHistory[commandHistory.length - 1 - nextIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const prevIndex = historyIndex - 1;
        setHistoryIndex(prevIndex);
        setInputValue(commandHistory[commandHistory.length - 1 - prevIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const args = inputValue.split(' ');
      const lastWord = args[args.length - 1];
      const currentNode = getNodeAtPath(vfs, currentPath);
      
      if (currentNode && currentNode.type === 'dir') {
        const matches = Object.keys(currentNode.children).filter(k => k.startsWith(lastWord));
        if (matches.length === 1) {
          args[args.length - 1] = matches[0];
          setInputValue(args.join(' '));
        }
      }
    }
  };

  const handleGuiAction = (action, target) => {
    if (action === 'cd') {
      executeCommand(`cd ${target}`);
    } else if (action === 'open') {
      setAiSummary(null);
      executeCommand(`open ${target}`);
    } else if (action === 'home') {
      executeCommand('cd /');
    } else if (action === 'back') {
      executeCommand('back');
    }
  };

  const currentDirNode = getNodeAtPath(vfs, currentPath);
  const currentDirEntries =
    currentDirNode?.type === 'dir'
      ? Object.entries(currentDirNode.children).filter(([name]) => !name.startsWith('.'))
      : [];
  const currentDirectoryName = currentPath.length === 0 ? 'root' : currentPath[currentPath.length - 1];
  const pathDisplay = currentPath.length === 0 ? '~' : `~/${currentPath.join('/')}`;
  const selectedNodeCacheKey = selectedNode?.path ?? selectedNode?.name ?? '';
  const isContactApp = selectedNode?.app === 'contact-hub';
  const isEmailAuthApp = selectedNode?.app === 'email-auth-analyzer';
  const isScannerApp = selectedNode?.app === 'web-security-scanner';
  const isAppNode = isContactApp || isEmailAuthApp || isScannerApp;
  const isBooksDirectory = currentDirectoryName === 'books';
  const isSmartphoneViewport =
    viewportState.isTouch &&
    viewportState.width > 0 &&
    viewportState.width < 768;
  const useFocusedToolLayout = Boolean(selectedNode) && isSmartphoneViewport;

  return (
    <div className="flex flex-col h-[100svh] md:h-[100dvh] bg-slate-950 text-slate-300 font-sans overflow-hidden">
      <GlobalTurnstileGate
        onVerified={refreshSystemHealth}
        onAccessStateChange={setSiteAccessMode}
        reopenSignal={turnstileReopenSignal}
      />
      
      <header className="flex items-center justify-between px-3 sm:px-4 py-3 bg-slate-900 border-b border-slate-800 shadow-sm z-10 shrink-0">
        <div className="flex items-center space-x-2 overflow-hidden">
          <Monitor className="w-5 h-5 text-emerald-400 shrink-0" />
          <h1 className="font-semibold text-slate-200 tracking-wide truncate text-sm sm:text-base">Init.CV <span className="hidden sm:inline">v1.0.0</span></h1>
          
          <button
             onClick={handleGeneratePitch}
             className="ml-2 sm:ml-4 flex items-center bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs border border-indigo-500/30 font-medium transition-colors shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] whitespace-nowrap"
          >
             <Rocket className="w-3.5 h-3.5 sm:mr-1.5" /> <span className="hidden sm:inline">Elevator Pitch</span><span className="sm:hidden ml-1">Pitch</span>
          </button>
        </div>
        
        <div className="hidden sm:flex items-center space-x-3 text-[10px] lg:text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-md border border-slate-700/80 shrink-0 shadow-inner">
          <div className="flex items-center text-emerald-400">
            <Cpu className="w-3.5 h-3.5 mr-1.5 opacity-80" />
            <span className="font-semibold tracking-widest">SYS: ACTIVE</span>
          </div>
          <div className="w-px h-3 bg-slate-700/80"></div>
          <div className="flex items-center text-blue-400">
            <Layout className="w-3.5 h-3.5 mr-1.5 opacity-80" />
            <span className="font-semibold tracking-widest">GUI: SYNCED</span>
          </div>
        </div>
      </header>

      {siteAccessMode === 'limited' && (
        <div className="shrink-0 border-b border-amber-500/20 bg-amber-950/30 px-4 py-3 text-xs sm:text-sm text-amber-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>Situs dibuka dalam mode terbatas. Beberapa fitur baru tersedia setelah akses penuh aktif.</span>
            <button
              type="button"
              onClick={requestFullAccess}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold text-amber-100 transition hover:bg-amber-400/20 sm:text-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Aktifkan Akses Penuh
            </button>
          </div>
        </div>
      )}

      <div className="md:hidden flex overflow-x-auto space-x-2 p-2 bg-slate-900 border-b border-slate-800 font-mono text-xs shrink-0 scrollbar-hide">
        <button onClick={() => handleGuiAction('home')} className="flex items-center px-3 py-1.5 bg-slate-800 rounded hover:bg-slate-700 whitespace-nowrap"><Home className="w-3 h-3 mr-1"/> Root</button>
        <button onClick={() => handleGuiAction('back')} className="flex items-center px-3 py-1.5 bg-slate-800 rounded hover:bg-slate-700 whitespace-nowrap"><ArrowLeft className="w-3 h-3 mr-1"/> Back</button>
        <button onClick={() => executeCommand('ls')} className="flex items-center px-3 py-1.5 bg-slate-800 rounded hover:bg-slate-700 whitespace-nowrap"><List className="w-3 h-3 mr-1"/> ls</button>
        <button onClick={() => executeCommand('clear')} className="flex items-center px-3 py-1.5 bg-slate-800 rounded hover:bg-slate-700 whitespace-nowrap">clear</button>
      </div>

      <main 
        ref={mainContainerRef}
        className={`flex flex-1 overflow-hidden min-h-0 relative ${
          useFocusedToolLayout ? 'flex-col' : 'flex-col md:flex-row'
        }`}
      >
        {!useFocusedToolLayout && (
        <section 
          style={{ flexGrow: splitRatio, flexBasis: 0 }}
          className="flex flex-col bg-black overflow-hidden font-mono min-w-0 min-h-0"
        >
          <div className="flex items-center px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider shrink-0">
            <Terminal className="w-4 h-4 mr-2" />
            Terminal
          </div>
          
          <div
            ref={terminalViewportRef}
            className="flex-1 p-3 sm:p-4 overflow-y-auto min-h-0"
            onClick={() => focusTerminalInput(true)}
          >
            {history.map((line) => {
              if (line.type === 'ai_output') {
                return (
                  <div key={line.id} className="mb-2 mt-1 whitespace-pre-wrap break-words text-sm flex items-start text-indigo-300">
                    <Rocket className="w-4 h-4 mr-2 shrink-0 mt-0.5 text-indigo-400" />
                    <div className="flex-1 leading-relaxed">{line.text}</div>
                  </div>
                );
              }
              return (
                <div key={line.id} className={`mb-1 whitespace-pre-wrap break-words text-sm ${
                  line.type === 'error' ? 'text-red-400' : 
                  line.type === 'input' ? 'text-slate-200' : 'text-slate-400'
                }`}>
                  {line.text}
                </div>
              );
            })}
            
            {activeTask && (
              <div className="mb-2 mt-2 flex items-center text-emerald-400 text-sm font-mono animate-in fade-in">
                <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
                <span className="animate-pulse">{activeTask}</span>
              </div>
            )}
            
            {!isGenerating && !activeTask && (
              <div className="flex items-center text-slate-200 mt-2 text-sm flex-row animate-in fade-in duration-300">
                <span className="text-emerald-400 mr-2 flex-shrink-0">
                  hamk4dev@portfolio:<span className="text-blue-400">{pathDisplay}</span>$
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 w-full bg-transparent outline-none border-none text-slate-200 min-w-0"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>
            )}
            <div ref={endOfTerminalRef} className="h-4 shrink-0"></div>
          </div>
        </section>
        )}

        {!useFocusedToolLayout && (
          <div
            className={`flex items-center justify-center bg-slate-800 transition-colors z-20 shrink-0
              ${isDragging ? 'bg-indigo-500' : 'hover:bg-slate-600'}
              md:w-1 md:h-full md:cursor-col-resize
              w-full h-1 cursor-row-resize
            `}
            onMouseDown={() => setIsDragging(true)}
            onTouchStart={() => setIsDragging(true)}
          >
            <div className="flex md:flex-col gap-0.5 opacity-50 pointer-events-none">
              <div className="w-0.5 h-0.5 bg-slate-400 rounded-full"></div>
              <div className="w-0.5 h-0.5 bg-slate-400 rounded-full"></div>
              <div className="w-0.5 h-0.5 bg-slate-400 rounded-full"></div>
            </div>
          </div>
        )}

        <section 
          style={useFocusedToolLayout ? undefined : { flexGrow: 100 - splitRatio, flexBasis: 0 }}
          className="flex flex-col bg-slate-900 overflow-hidden min-w-0 min-h-0"
        >
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-800 text-sm shrink-0">
            <div className="flex items-center overflow-x-auto scrollbar-hide whitespace-nowrap flex-1 min-w-0 pr-4">
              <button onClick={() => handleGuiAction('home')} className="text-slate-400 hover:text-emerald-400 transition-colors shrink-0">
                <Home className="w-4 h-4" />
              </button>
              <ChevronRight className="w-4 h-4 mx-1 text-slate-600 shrink-0" />
              {currentPath.length === 0 ? (
                <span className="text-slate-200 font-medium">root</span>
              ) : (
                currentPath.map((p, i) => (
                  <React.Fragment key={i}>
                    <button 
                      onClick={() => handleGuiAction('cd', `/${currentPath.slice(0, i+1).join('/')}`)}
                      className="text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      {p}
                    </button>
                    {i < currentPath.length - 1 && <ChevronRight className="w-4 h-4 mx-1 text-slate-600 shrink-0" />}
                  </React.Fragment>
                ))
              )}
            </div>

            <div className="flex items-center shrink-0 ml-2">
              <div className="bg-black/50 border border-slate-700/60 px-2.5 py-1 rounded shadow-inner flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="font-mono text-emerald-400 text-xs tracking-wider font-semibold">
                  <span suppressHydrationWarning>{formattedTimeWITA}</span> WITA
                </span>
              </div>
            </div>
          </div>

          <div ref={previewViewportRef} className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0">
            {selectedNode ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {isAppNode ? (
                  <div className="space-y-4">
                    <div className={`flex flex-col sm:flex-row justify-between mb-4 border-b border-slate-700 pb-2 gap-3 ${
                      isContactApp ? 'sm:items-center' : 'sm:items-end'
                    }`}>
                      <div className="min-w-0 flex items-center text-emerald-400 text-base sm:text-lg font-medium truncate">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 shrink-0" />
                        <span className="truncate">{selectedNode.title ?? selectedNode.name}</span>
                      </div>
                      <div className={`flex w-full sm:w-auto shrink-0 ${isContactApp ? '' : 'sm:justify-end'}`}>
                        <button 
                          onClick={() => {
                            setSelectedNode(null);
                            setAiSummary(null);
                          }}
                          className={isContactApp
                            ? 'w-full sm:w-auto text-[10px] sm:text-xs bg-slate-800 hover:bg-slate-700 px-2.5 sm:px-3 py-1.5 rounded text-slate-300 transition-colors whitespace-nowrap'
                            : 'inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-300 shadow-sm transition-colors hover:border-slate-600 hover:text-white'
                          }
                        >
                          {isContactApp ? (
                            'Tutup Preview'
                          ) : (
                            <>
                              <CornerDownLeft className="mr-2 h-4 w-4 shrink-0" />
                              Kembali
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {isContactApp ? (
                      <ContactHub systemHealth={systemHealth} siteAccessMode={siteAccessMode} />
                    ) : isEmailAuthApp ? (
                      <EmailAuthAnalyzer siteAccessMode={siteAccessMode} />
                    ) : (
                      <WebSecurityScanner siteAccessMode={siteAccessMode} />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-700 pb-2 gap-3">
                      <div className="flex items-center text-emerald-400 text-base sm:text-lg font-medium truncate">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 shrink-0" />
                        <span className="truncate">{selectedNode.title ?? selectedNode.name}</span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <button 
                          onClick={() => {
                            if (isGenerating) return;
                            if (summaryCache[selectedNodeCacheKey]) {
                              setAiSummary(summaryCache[selectedNodeCacheKey]);
                              return;
                            }
                            if (!hasProtectedAccess) {
                              setAiSummary(getAccessLockedMessage('Ringkasan AI')); 
                              return;
                            }
                            if (isAiAvailable === false) {
                              setAiSummary(getAiUnavailableMessage());
                              return;
                            }
                            if (!hasRemainingAiQuota()) {
                              setAiSummary(getAiQuotaExceededMessage());
                              return;
                            }
                            setIsGenerating(true);
                            const summaryPrompt = `Ringkas konten file berikut:\n\n${selectedNode.content.slice(0, 5000)}`;
                            const summarySystem = `Kamu adalah asisten sistem.\nATURAN SANGAT KETAT:\n1. LANGSUNG berikan ringkasan.\n2. Gunakan format bersih.\n3. Jangan menebalkan kata di awal list.`;
                            callGemini(summaryPrompt, summarySystem)
                              .then(res => {
                                recordAiUsage();
                                setAiSummary(res);
                                setSummaryCache(prev => ({ ...prev, [selectedNodeCacheKey]: res }));
                              })
                              .catch(err => setAiSummary(getAiErrorMessage(err)))
                              .finally(() => setIsGenerating(false));
                          }}
                          disabled={isGenerating}
                          className="flex items-center text-[10px] sm:text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-2 sm:px-3 py-1.5 rounded transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {isGenerating ? <span className="animate-pulse">Loading...</span> : <><Rocket className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" /> Ringkas File</>}
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedNode(null);
                            setAiSummary(null);
                          }}
                          className="text-[10px] sm:text-xs bg-slate-800 hover:bg-slate-700 px-2 sm:px-3 py-1.5 rounded text-slate-300 transition-colors whitespace-nowrap"
                        >
                          Tutup Preview
                        </button>
                      </div>
                    </div>

                    {aiSummary && (
                      <div className="mb-4 bg-indigo-950/40 border border-indigo-500/30 p-3 sm:p-4 rounded-lg relative animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center text-indigo-300 mb-2 font-medium text-xs sm:text-sm">
                          <Rocket className="w-4 h-4 mr-2 shrink-0" /> Ringkasan File
                        </div>
                        <div className="text-xs sm:text-sm text-indigo-100/80 leading-relaxed">
                          {renderDocumentContent(aiSummary)}
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-950 p-4 sm:p-6 rounded-lg border border-slate-800 shadow-inner flex flex-col sm:flex-row gap-4 sm:gap-6">
                      {selectedNode.image && (
                        <div className="shrink-0 flex justify-center sm:block">
                          <img 
                            src={selectedNode.image} 
                            alt={selectedNode.name} 
                            loading="lazy"
                            className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-xl border border-slate-700 shadow-md grayscale hover:grayscale-0 transition-all duration-300"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div className="font-mono text-xs sm:text-sm text-slate-300 break-words flex-1 w-full min-w-0">
                        {renderDocumentContent(selectedNode.content)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : 
            (
              <div className="pb-8">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-100 mb-4 sm:mb-6 flex items-center">
                  <Folder className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-400 shrink-0" />
                  <span className="truncate">Isi Direktori: {currentDirectoryName}</span>
                </h2>

                {isBooksDirectory ? (
                  <div className="space-y-5">
                    {currentPath.length > 0 && (
                      <div className="flex w-full sm:w-auto sm:justify-end">
                        <button
                          onClick={() => handleGuiAction('back')}
                          className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-300 shadow-sm transition-colors hover:border-slate-600 hover:text-white"
                        >
                          <CornerDownLeft className="mr-2 h-4 w-4 shrink-0" />
                          Kembali
                        </button>
                      </div>
                    )}

                    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-4 sm:px-5">
                      <div className="flex flex-col gap-4">
                        <div className="max-w-3xl space-y-2">
                          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">Koleksi Bacaan</p>
                          <h3 className="text-base sm:text-lg font-semibold text-slate-100">Pilihan buku dan referensi online untuk AI, security, dan engineering.</h3>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {currentDirEntries.map(([name, node]) => (
                        <button
                          key={name}
                          onClick={() => handleGuiAction(node.type === 'dir' ? 'cd' : 'open', name)}
                          className="group flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-3 text-left transition-all hover:border-slate-700 hover:bg-slate-900"
                        >
                          <div className={`rounded-2xl border px-4 py-5 sm:px-5 sm:py-6 ${node.coverTone ?? 'bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-950 border-emerald-500/30'}`}>
                            <div className="mb-6 flex items-start justify-between gap-3">
                              <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-200/80">
                                {node.category ?? (node.type === 'dir' ? 'Folder' : 'Reading')}
                              </span>
                              <BookOpen className="h-5 w-5 shrink-0 text-slate-100/70" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-semibold leading-tight text-white">
                                {node.title ?? name.replace(/\.md$/i, '')}
                              </h3>
                              <p className="text-xs uppercase tracking-[0.3em] text-slate-200/70">
                                {node.author ?? 'Online Resource'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-1 flex-col justify-between gap-4 px-1 pb-1 pt-4">
                            <p className="text-sm leading-relaxed text-slate-400">
                              {node.summary ?? 'Bacaan online yang dapat dibuka dari panel preview ini.'}
                            </p>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-emerald-300">Buka bacaan</span>
                              <span className="text-slate-500 transition-colors group-hover:text-slate-300">
                                {node.type === 'dir' ? 'Masuk folder' : 'Lihat detail'}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {currentDirEntries.length === 0 && (
                      <div className="col-span-full py-12 flex flex-col items-center text-slate-500">
                        <Search className="w-10 h-10 sm:w-12 sm:h-12 mb-3 opacity-20" />
                        <p className="text-sm">Rak buku ini masih kosong.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                    {currentPath.length > 0 && (
                       <button
                          onClick={() => handleGuiAction('back')}
                          className="group flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all"
                        >
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-800 group-hover:bg-slate-700 rounded-full flex items-center justify-center mb-2 sm:mb-3 shrink-0">
                             <CornerDownLeft className="w-4 h-4 sm:w-6 sm:h-6 text-slate-400" />
                          </div>
                          <span className="text-[10px] sm:text-sm font-medium text-slate-400 group-hover:text-slate-200">Kembali</span>
                       </button>
                    )}

                    {currentDirEntries.map(([name, node]) => (
                      <button
                        key={name}
                        onClick={() => handleGuiAction(node.type === 'dir' ? 'cd' : 'open', name)}
                        className="group flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all"
                      >
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-2 sm:mb-3 transition-colors shrink-0 ${
                          node.type === 'dir' 
                            ? 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20'
                        }`}>
                          {node.type === 'dir' ? <Folder className="w-5 h-5 sm:w-6 sm:h-6" /> : <FileText className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </div>
                        <span className="text-[10px] sm:text-sm font-medium text-slate-300 group-hover:text-white truncate w-full text-center px-1">
                          {name}
                        </span>
                        <span className="text-[9px] sm:text-xs text-slate-500 mt-1 capitalize hidden sm:block">{node.type}</span>
                      </button>
                    ))}
                    
                    {currentDirEntries.length === 0 && (
                      <div className="col-span-full py-12 flex flex-col items-center text-slate-500">
                        <Search className="w-10 h-10 sm:w-12 sm:h-12 mb-3 opacity-20" />
                        <p className="text-sm">Direktori ini kosong.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {isDragging && !useFocusedToolLayout && (
          <div
            className="fixed inset-0 z-50 cursor-row-resize md:cursor-col-resize"
            onMouseMove={handleMouseMove}
            onMouseUp={handleDragEnd}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleDragEnd}
            onMouseLeave={handleDragEnd}
          />
        )}
      </main>

      <footer className="shrink-0 bg-slate-900 border-t border-slate-800 py-2 px-4 flex justify-center items-center text-[10px] sm:text-xs text-slate-500 font-mono z-10 text-center">
        <span>&copy; 2026 | Powered By <span className="text-emerald-400 font-medium">hamk4dev</span>. Hak cipta dilindungi undang-undang.</span>
      </footer>

      {showPitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-indigo-500/30 p-4 sm:p-6 rounded-xl max-w-lg w-full max-h-[90dvh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowPitchModal(false)} 
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/80 text-slate-300 hover:text-red-400 hover:bg-slate-700 transition-colors z-10"
            >
              X
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-indigo-300 mb-4 flex items-center shrink-0 pr-8">
              <Rocket className="w-5 h-5 mr-2 shrink-0" /> Elevator Pitch
            </h2>
            
            <div className="text-slate-300 text-xs sm:text-sm leading-relaxed min-h-[120px] bg-slate-950 p-4 rounded-lg border border-slate-800 flex-1 overflow-y-auto min-h-0">
              {isGeneratingPitch ? (
                <div className="flex flex-col items-center justify-center h-full text-indigo-400/70 space-y-3 py-4">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="animate-pulse text-center">Menganalisis sistem file...</span>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{pitchContent}</div>
              )}
            </div>
            
            {!isGeneratingPitch && pitchContent && (
              <div className="mt-4 flex justify-end shrink-0 pt-2">
                <button 
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(pitchContent);
                      setCopyFeedback('Teks berhasil disalin.');
                    } catch {
                      setCopyFeedback('Gagal menyalin teks.');
                    }
                    setTimeout(() => setCopyFeedback(''), 2500);
                  }}
                  className="text-[10px] sm:text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded transition-colors"
                >
                  Salin Teks
                </button>
              </div>
            )}

            {copyFeedback && (
              <div className="mt-2 text-right text-[10px] sm:text-xs text-indigo-300">
                {copyFeedback}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}











