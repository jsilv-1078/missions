"use client";

import { FormEvent, useRef, useState } from "react";
import type { NewsStory } from "@/lib/types";

type Status = { kind:"idle"|"progress"|"success"|"error"; message:string };
type SyncRun = {
  status:string;
  message:string;
  recordsSeen:number;
  recordsWritten:number;
  startedAt:string;
};

function localDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0,16);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(value));
}

export default function NewsAdmin() {
  const formRef = useRef<HTMLFormElement>(null);
  const [token,setToken] = useState("");
  const [publishStatus,setPublishStatus] = useState<Status>({kind:"idle",message:"Enter the admin token to publish or edit a story."});
  const [syncStatus,setSyncStatus] = useState<Status>({kind:"idle",message:"Ready to refresh market data."});
  const [manageStatus,setManageStatus] = useState<Status>({kind:"idle",message:"Load existing articles to edit or delete them."});
  const [stories,setStories] = useState<NewsStory[]>([]);
  const [editing,setEditing] = useState<NewsStory | null>(null);
  const [syncing,setSyncing] = useState(false);
  const [publishing,setPublishing] = useState(false);
  const [loadingStories,setLoadingStories] = useState(false);
  const [deletingId,setDeletingId] = useState<string | null>(null);

  async function loadStories(showProgress = true) {
    if (!token) return;
    setLoadingStories(true);
    if (showProgress) setManageStatus({kind:"progress",message:"Loading published articles…"});
    try {
      const response = await fetch("/api/admin/news",{
        headers:{"Authorization":"Bearer " + token},cache:"no-store",
      });
      const result = await response.json() as { stories?:NewsStory[]; error?:string };
      if (!response.ok) {
        setManageStatus({kind:"error",message:result.error ?? "Unable to load articles"});
        return;
      }
      const articles = result.stories ?? [];
      setStories(articles);
      setManageStatus({kind:"success",message:articles.length
        ? articles.length + " published article" + (articles.length === 1 ? "" : "s") + " loaded."
        : "No published articles found."});
    } catch {
      setManageStatus({kind:"error",message:"The article list could not be loaded. Please try again."});
    } finally {
      setLoadingStories(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body:Record<string,FormDataEntryValue> = Object.fromEntries(form.entries());
    setPublishing(true);
    setPublishStatus({kind:"progress",message:editing ? "Saving changes…" : "Publishing…"});
    try {
      body.publishedAt = new Date(String(body.publishedAt)).toISOString();
      if (editing) body.id = editing.id;
      const response = await fetch("/api/admin/news",{
        method:editing ? "PATCH" : "POST",headers:{"Content-Type":"application/json","Authorization":"Bearer " + token},
        body:JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        setPublishStatus({kind:"error",message:result.error ?? (editing ? "Unable to save changes" : "Unable to publish")});
        return;
      }
      formElement.reset();
      setEditing(null);
      setPublishStatus({kind:"success",message:editing ? "Article changes saved." : "Story published to the Pulse feed."});
      await loadStories(false);
    } catch {
      setPublishStatus({kind:"error",message:"The save request could not be completed. Please try again."});
    } finally {
      setPublishing(false);
    }
  }

  function beginEdit(story: NewsStory) {
    setEditing(story);
    setPublishStatus({kind:"idle",message:"Update the article fields, then save your changes."});
    requestAnimationFrame(() => formRef.current?.scrollIntoView({behavior:"smooth",block:"start"}));
  }

  function cancelEdit() {
    setEditing(null);
    setPublishStatus({kind:"idle",message:"Edit canceled. The form is ready for a new article."});
  }

  async function removeStory(story: NewsStory) {
    if (!window.confirm("Delete ‘" + story.headline + "’ from Pulse? This cannot be undone.")) return;
    setDeletingId(story.id);
    setManageStatus({kind:"progress",message:"Deleting article…"});
    try {
      const response = await fetch("/api/admin/news?id=" + encodeURIComponent(story.id),{
        method:"DELETE",headers:{"Authorization":"Bearer " + token},
      });
      const result = await response.json() as { error?:string };
      if (!response.ok) {
        setManageStatus({kind:"error",message:result.error ?? "Unable to delete article"});
        return;
      }
      setStories((current) => current.filter((article) => article.id !== story.id));
      if (editing?.id === story.id) setEditing(null);
      setManageStatus({kind:"success",message:"Article deleted from Pulse."});
    } catch {
      setManageStatus({kind:"error",message:"The delete request could not be completed. Please try again."});
    } finally {
      setDeletingId(null);
    }
  }

  async function sync() {
    setSyncing(true);
    setSyncStatus({kind:"progress",message:"Starting market sync…"});
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
        setSyncStatus({kind,message:result.run.message || "Market sync is running…"});
      } catch {
        // The POST response remains authoritative if a progress poll is interrupted.
      }
    };
    const timer = window.setInterval(() => void poll(),1200);
    try {
      const response = await fetch("/api/admin/sync",{method:"POST",headers:{"Authorization":"Bearer " + token}});
      const result = await response.json().catch(() => ({})) as { status?:string;message?:string;written?:number;error?:string };
      const completed = response.ok && result.status === "success";
      setSyncStatus(completed
        ? {kind:"success",message:result.message ?? "Market sync complete: " + (result.written ?? 0) + " stories written."}
        : {kind:"error",message:result.error ?? result.message ?? "Market sync failed"});
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
    <section className="admin-card token-card"><label>Admin token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Required for admin actions"/></label><button onClick={sync} disabled={!token || syncing}>{syncing ? "Syncing…" : "Run market sync"}</button><p aria-live="polite" className={"form-status " + syncStatus.kind}>{syncStatus.message}</p></section>
    <form ref={formRef} key={editing?.id ?? "new"} className="admin-card news-form" onSubmit={submit}>
      <div className="admin-form-heading"><div><span>{editing ? "EDITING ARTICLE" : "NEW ARTICLE"}</span><h2>{editing ? "Update story" : "Publish to Pulse"}</h2></div>{editing ? <button type="button" onClick={cancelEdit}>Cancel edit</button> : null}</div>
      <div className="two-col"><label>Article URL<input name="articleUrl" type="url" required defaultValue={editing?.articleUrl} placeholder="https://…"/></label><label>Source<input name="source" required defaultValue={editing?.source} placeholder="Publisher"/></label></div>
      <label>Headline<input name="headline" required maxLength={180} defaultValue={editing?.headline} placeholder="What happened?"/></label>
      <label>One-sentence summary<textarea name="summary" required maxLength={320} rows={3} defaultValue={editing?.summary} placeholder="Why should a collector care?"/></label>
      <div className="two-col"><label>Player<input name="player" required defaultValue={editing?.player} placeholder="Player name"/></label><label>Sport<select name="sport" defaultValue={editing?.sport ?? "Baseball"}><option>Baseball</option><option>Basketball</option><option>Football</option><option>Hockey</option><option>Soccer</option><option>Pokémon</option><option>Hobby</option></select></label></div>
      <div className="two-col"><label>Category<select name="category" defaultValue={editing?.category ?? "Player news"}><option>Player news</option><option>Milestone</option><option>Injury</option><option>Transaction</option><option>Card sale</option><option>Hobby</option></select></label><label>Published<input name="publishedAt" type="datetime-local" required defaultValue={editing ? localDateTime(editing.publishedAt) : ""}/></label></div>
      <label>Player or approved article image URL<input name="imageUrl" type="url" required defaultValue={editing?.imageUrl} placeholder="https://…"/></label>
      <label>Related card ID <small>Optional</small><input name="relatedCardId" defaultValue={editing?.relatedCardId} placeholder="Connect market context later"/></label>
      <button className="publish-button" disabled={!token || publishing}>{publishing ? (editing ? "Saving…" : "Publishing…") : (editing ? "Save article changes" : "Publish to Pulse")}</button>
      <p aria-live="polite" className={"form-status " + publishStatus.kind}>{publishStatus.message}</p>
    </form>
    <section className="admin-card article-manager">
      <div className="article-manager-heading"><div><span>ARTICLE LIBRARY</span><h2>Existing articles</h2></div><button onClick={() => void loadStories()} disabled={!token || loadingStories}>{loadingStories ? "Loading…" : stories.length ? "Refresh" : "Load articles"}</button></div>
      <p aria-live="polite" className={"form-status " + manageStatus.kind}>{manageStatus.message}</p>
      {stories.length ? <div className="admin-article-list">{stories.map((story) => <article className="admin-article" key={story.id}>
        <div><span>{story.category} · {story.source}</span><h3>{story.headline}</h3><p>{story.player} · {story.sport} · {dateLabel(story.publishedAt)}</p><a href={story.articleUrl} target="_blank" rel="noreferrer">Open source article ↗</a></div>
        <div className="admin-article-actions"><button onClick={() => beginEdit(story)}>Edit</button><button className="delete" onClick={() => void removeStory(story)} disabled={deletingId === story.id}>{deletingId === story.id ? "Deleting…" : "Delete"}</button></div>
      </article>)}</div> : null}
    </section>
  </main>;
}
