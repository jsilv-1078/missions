"use client";

import { FormEvent, useState } from "react";

type Status = { kind:"idle"|"progress"|"success"|"error"; message:string };
type SyncRun = {
  status:string;
  message:string;
  recordsSeen:number;
  recordsWritten:number;
  startedAt:string;
};

export default function NewsAdmin() {
  const [token,setToken] = useState("");
  const [publishStatus,setPublishStatus] = useState<Status>({kind:"idle",message:"Enter the admin token to publish a story."});
  const [syncStatus,setSyncStatus] = useState<Status>({kind:"idle",message:"Ready to refresh market data."});
  const [syncing,setSyncing] = useState(false);
  const [publishing,setPublishing] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = Object.fromEntries(form.entries());
    setPublishing(true);
    setPublishStatus({kind:"progress",message:"Publishing…"});
    try {
      const response = await fetch("/api/admin/news",{
        method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer " + token},
        body:JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        setPublishStatus({kind:"error",message:result.error ?? "Unable to publish"});
        return;
      }
      formElement.reset();
      setPublishStatus({kind:"success",message:"Story published to the Pulse feed."});
    } catch {
      setPublishStatus({kind:"error",message:"The publish request could not be completed. Please try again."});
    } finally {
      setPublishing(false);
    }
  }

  async function sync() {
    setSyncing(true);
    setSyncStatus({kind:"progress",message:"Starting Card Hedge sync…"});
    const requestedAt = Date.now();
    let polling = true;
    const poll = async () => {
      try {
        const response = await fetch("/api/admin/sync",{
          method:"GET",headers:{"Authorization":"Bearer " + token},cache:"no-store",
        });
        if (!response.ok) return;
        const result = await response.json() as { run:SyncRun | null };
        if (!polling || !result.run || Date.parse(result.run.startedAt) < requestedAt - 3000) return;
        const kind:Status["kind"] = result.run.status === "running"
          ? "progress" : result.run.status === "success" ? "success" : "error";
        setSyncStatus({kind,message:result.run.message || "Card Hedge sync is running…"});
      } catch {
        // The POST response remains authoritative if a progress poll is interrupted.
      }
    };
    const timer = window.setInterval(() => void poll(),1200);
    try {
      const response = await fetch("/api/admin/sync",{method:"POST",headers:{"Authorization":"Bearer " + token}});
      const result = await response.json().catch(() => ({})) as { message?:string;written?:number;error?:string };
      setSyncStatus(response.ok
        ? {kind:"success",message:result.message ?? "Market sync complete: " + (result.written ?? 0) + " stories written."}
        : {kind:"error",message:result.error ?? "Market sync failed"});
    } catch {
      setSyncStatus({kind:"error",message:"The sync request stopped before completion. Check the latest stage below and try again."});
    } finally {
      polling = false;
      window.clearInterval(timer);
      setSyncing(false);
    }
  }

  return <main className="admin-shell">
    <header><a href="/">← Back to Pulse</a><div><span>CM PULSE</span><h1>News Publisher</h1><p>Add a curated article. Pulse stores the source link and never copies the full article.</p></div></header>
    <section className="admin-card token-card"><label>Admin token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Required to publish"/></label><button onClick={sync} disabled={!token || syncing}>{syncing ? "Syncing…" : "Run Card Hedge sync"}</button><p aria-live="polite" className={"form-status " + syncStatus.kind}>{syncStatus.message}</p></section>
    <form className="admin-card news-form" onSubmit={submit}>
      <div className="two-col"><label>Article URL<input name="articleUrl" type="url" required placeholder="https://…"/></label><label>Source<input name="source" required placeholder="Publisher"/></label></div>
      <label>Headline<input name="headline" required maxLength={180} placeholder="What happened?"/></label>
      <label>One-sentence summary<textarea name="summary" required maxLength={320} rows={3} placeholder="Why should a collector care?"/></label>
      <div className="two-col"><label>Player<input name="player" required placeholder="Player name"/></label><label>Sport<select name="sport" defaultValue="Baseball"><option>Baseball</option><option>Basketball</option><option>Football</option><option>Hockey</option><option>Hobby</option></select></label></div>
      <div className="two-col"><label>Category<select name="category" defaultValue="Player news"><option>Player news</option><option>Milestone</option><option>Injury</option><option>Transaction</option><option>Card sale</option><option>Hobby</option></select></label><label>Published<input name="publishedAt" type="datetime-local" required/></label></div>
      <label>Player or approved article image URL<input name="imageUrl" type="url" required placeholder="https://…"/></label>
      <label>Related Card Hedge card ID <small>Optional</small><input name="relatedCardId" placeholder="Connect market context later"/></label>
      <button className="publish-button" disabled={!token || publishing}>{publishing ? "Publishing…" : "Publish to Pulse"}</button>
      <p aria-live="polite" className={"form-status " + publishStatus.kind}>{publishStatus.message}</p>
    </form>
  </main>;
}
