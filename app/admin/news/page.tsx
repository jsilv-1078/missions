"use client";

import { FormEvent, useState } from "react";

type Status = { kind:"idle"|"success"|"error"; message:string };

export default function NewsAdmin() {
  const [token,setToken] = useState("");
  const [status,setStatus] = useState<Status>({kind:"idle",message:"Enter the admin token to publish a story."});
  const [syncing,setSyncing] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    setStatus({kind:"idle",message:"Publishing…"});
    const response = await fetch("/api/admin/news",{
      method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer " + token},
      body:JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) return setStatus({kind:"error",message:result.error ?? "Unable to publish"});
    event.currentTarget.reset();
    setStatus({kind:"success",message:"Story published to the Pulse feed."});
  }

  async function sync() {
    setSyncing(true);
    const response = await fetch("/api/admin/sync",{method:"POST",headers:{"Authorization":"Bearer " + token}});
    const result = await response.json();
    setSyncing(false);
    setStatus(response.ok
      ? {kind:"success",message:result.message ?? "Market sync complete: " + result.written + " stories written."}
      : {kind:"error",message:result.error ?? "Market sync failed"});
  }

  return <main className="admin-shell">
    <header><a href="/">← Back to Pulse</a><div><span>CM PULSE</span><h1>News Publisher</h1><p>Add a curated article. Pulse stores the source link and never copies the full article.</p></div></header>
    <section className="admin-card token-card"><label>Admin token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Required to publish"/></label><button onClick={sync} disabled={!token || syncing}>{syncing ? "Syncing…" : "Run Card Hedge sync"}</button></section>
    <form className="admin-card news-form" onSubmit={submit}>
      <div className="two-col"><label>Article URL<input name="articleUrl" type="url" required placeholder="https://…"/></label><label>Source<input name="source" required placeholder="Publisher"/></label></div>
      <label>Headline<input name="headline" required maxLength={180} placeholder="What happened?"/></label>
      <label>One-sentence summary<textarea name="summary" required maxLength={320} rows={3} placeholder="Why should a collector care?"/></label>
      <div className="two-col"><label>Player<input name="player" required placeholder="Player name"/></label><label>Sport<select name="sport" defaultValue="Baseball"><option>Baseball</option><option>Basketball</option><option>Football</option><option>Hockey</option><option>Hobby</option></select></label></div>
      <div className="two-col"><label>Category<select name="category" defaultValue="Player news"><option>Player news</option><option>Milestone</option><option>Injury</option><option>Transaction</option><option>Card sale</option><option>Hobby</option></select></label><label>Published<input name="publishedAt" type="datetime-local" required/></label></div>
      <label>Player or approved article image URL<input name="imageUrl" type="url" required placeholder="https://…"/></label>
      <label>Related Card Hedge card ID <small>Optional</small><input name="relatedCardId" placeholder="Connect market context later"/></label>
      <button className="publish-button" disabled={!token}>Publish to Pulse</button>
      <p className={"form-status " + status.kind}>{status.message}</p>
    </form>
  </main>;
}
