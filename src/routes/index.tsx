import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { History, Landmark, LayoutDashboard, MessageSquare, Plus, SendHorizontal, Trash2, X } from "lucide-react";
import { ChatMessage, type Msg } from "@/components/finchat/ChatMessage";
import { Dashboard } from "@/components/finchat/Dashboard";
import { SUGGESTIONS, answer } from "@/lib/finance";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinChat AI — Assistente financeiro" },
      { name: "description", content: "Assistente financeiro conversacional em português com dados fictícios de demonstração." },
      { property: "og:title", content: "FinChat AI — Assistente financeiro" },
      { property: "og:description", content: "Converse sobre contas, saldos e cartões em uma demonstração com dados fictícios." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

interface Conversation { id: string; title: string; updatedAt: number; messages: Msg[] }
const KEY = "finchat-conversations";
const uid = () => Math.random().toString(36).slice(2, 10);

function Index() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [view, setView] = useState<"chat" | "dashboard">("chat");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { setConvs(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* ignore */ }
    inputRef.current?.focus();
  }, []);

  const persist = (next: Conversation[]) => { setConvs(next); localStorage.setItem(KEY, JSON.stringify(next)); };
  const active = convs.find((c) => c.id === activeId);
  const messages = active?.messages ?? [];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, typing]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || typing) return;
    const userMsg: Msg = { id: uid(), role: "user", text: t };
    let id = activeId;
    let list = convs;
    if (!id) {
      id = uid();
      list = [{ id, title: t.slice(0, 48), updatedAt: Date.now(), messages: [] }, ...convs];
      setActiveId(id);
    }
    const cid = id;
    const withUser = list.map((c) => (c.id === cid ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() } : c));
    persist(withUser);
    setInput("");
    setTyping(true);
    // Ponto de integração futura: substituir answer() por chamada ao backend.
    setTimeout(() => {
      const reply: Msg = { id: uid(), role: "assistant", text: answer(t) };
      setConvs((prev) => {
        const next = prev.map((c) => (c.id === cid ? { ...c, messages: [...c.messages, reply], updatedAt: Date.now() } : c));
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      });
      setTyping(false);
      inputRef.current?.focus();
    }, 600);
  };

  const newChat = () => { setActiveId(null); setShowHistory(false); inputRef.current?.focus(); };

  return (
    <div className="flex h-dvh bg-background font-sans">
      {/* Histórico */}
      <aside className={`${showHistory ? "flex" : "hidden"} fixed inset-0 z-30 flex-col bg-sidebar text-sidebar-foreground md:static md:flex md:w-72`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><Landmark className="h-4 w-4" /></span>
            FinChat AI
          </div>
          <button className="md:hidden" onClick={() => setShowHistory(false)} aria-label="Fechar histórico"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-4">
          <button onClick={newChat} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sidebar-primary py-2.5 text-sm font-semibold text-sidebar-primary-foreground transition hover:opacity-90">
            <Plus className="h-4 w-4" /> Nova conversa
          </button>
        </div>
        <p className="px-4 pb-2 pt-6 text-xs uppercase tracking-wider opacity-60">Histórico</p>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {convs.length === 0 && <p className="px-2 text-sm opacity-60">Nenhuma conversa ainda.</p>}
          {[...convs].sort((a, b) => b.updatedAt - a.updatedAt).map((c) => (
            <div key={c.id} className={`group flex items-center rounded-lg ${c.id === activeId ? "bg-sidebar-accent" : "hover:bg-sidebar-accent"}`}>
              <button onClick={() => { setActiveId(c.id); setShowHistory(false); }} className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm">{c.title}</button>
              <button aria-label="Excluir conversa" onClick={() => { persist(convs.filter((x) => x.id !== c.id)); if (c.id === activeId) setActiveId(null); }} className="px-2 opacity-50 hover:opacity-100">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </nav>
      </aside>

      {/* Chat */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <button className="md:hidden" onClick={() => setShowHistory(true)} aria-label="Histórico"><History className="h-5 w-5" /></button>
            <span className="font-display font-semibold md:hidden">FinChat AI</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Demonstração · Dados fictícios</span>
            <button
              onClick={() => setView(view === "chat" ? "dashboard" : "chat")}
              aria-label={view === "chat" ? "Abrir painel" : "Voltar ao chat"}
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold transition hover:border-primary"
            >
              {view === "chat" ? <LayoutDashboard className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
              {view === "chat" ? "Painel" : "Chat"}
            </button>
            <button onClick={newChat} className="md:hidden" aria-label="Nova conversa"><Plus className="h-5 w-5" /></button>
          </div>
        </header>

        {view === "dashboard" ? (
          <div className="flex-1 overflow-y-auto">
            <Dashboard />
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
            {messages.length === 0 && (
              <div className="space-y-6">
                <div className="rounded-3xl bg-hero p-8 text-primary-foreground shadow-soft">
                  <h1 className="font-display text-3xl font-semibold">Olá! Sou o FinChat AI.</h1>
                  <p className="mt-2 max-w-md opacity-85">Pergunte sobre suas contas, saldos e cartões. Nesta demonstração uso apenas dados fictícios locais — sem conexão com bancos.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-2xl border border-border bg-card p-4 text-left text-sm font-medium shadow-soft transition hover:border-primary">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => <ChatMessage key={m.id} msg={m} />)}
            {typing && (
              <div className="flex gap-1.5 pl-11">
                {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>
        )}

        {view === "chat" && (
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-border bg-card p-3">
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Pergunte algo sobre suas finanças…"
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
            />
            <button type="submit" disabled={!input.trim() || typing} aria-label="Enviar" className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition disabled:opacity-40">
              <SendHorizontal className="h-4 w-4" />
            </button>
          </div>
        </form>
        )}
      </main>
    </div>
  );
}
