"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Candidate = {
  id: string | number;
  candidate_name: string;
  rq_number: string;
};

export default function Home() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;

    async function loadCandidates() {
      try {
        const { data, error: queryError } = await getSupabaseClient()
          .from("candidates")
          .select("id, candidate_name, rq_number")
          .eq("status", "todo")
          .order("created_at", { ascending: true })
          .returns<Candidate[]>();

        if (queryError) throw queryError;
        if (active) setCandidates(data ?? []);
      } catch {
        if (active) {
          setLoadError("Could not load candidates. Please refresh to try again. Check your Supabase settings if this continues.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadCandidates();
    return () => { active = false; };
  }, []);

  function closeForm() {
    setShowForm(false);
    setError("");
    addButtonRef.current?.focus();
  }

  async function addCandidate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || isLoading) return;
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("candidateName") ?? "").trim();
    const rqNumber = String(formData.get("rqNumber") ?? "").trim();

    if (!name || !rqNumber) {
      setError("Please enter a candidate name and RQ number.");
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      const { data, error: saveError } = await getSupabaseClient()
        .from("candidates")
        .insert({ candidate_name: name, rq_number: rqNumber })
        .select("id, candidate_name, rq_number")
        .single<Candidate>();

      if (saveError) throw saveError;
      if (!data) throw new Error("No candidate returned after saving.");

      setCandidates((current) => [...current, data]);
      closeForm();
    } catch {
      setError("Could not save candidate. Please try again. Check your Supabase settings if this continues.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12 sm:px-10 sm:py-20">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Candidate Tasks
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Track the candidates I am currently working on
          </p>
        </div>
        <button
          type="button"
          ref={addButtonRef}
          onClick={() => setShowForm(true)}
          aria-expanded={showForm}
          aria-controls="add-candidate-form"
          className="w-fit rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          + Add Candidate
        </button>
      </header>

      {showForm && (
        <form
          id="add-candidate-form"
          onSubmit={addCandidate}
          aria-labelledby="add-candidate-heading"
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 id="add-candidate-heading" className="text-lg font-semibold text-slate-900">Add Candidate</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="candidate-name" className="block text-sm font-medium text-slate-700">Candidate Name</label>
              <input
                id="candidate-name"
                name="candidateName"
                type="text"
                required
                disabled={isSaving}
                autoFocus
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-600 focus:outline-2 focus:outline-indigo-600"
              />
            </div>
            <div>
              <label htmlFor="rq-number" className="block text-sm font-medium text-slate-700">RQ Number</label>
              <input
                id="rq-number"
                name="rqNumber"
                type="text"
                required
                disabled={isSaving}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-600 focus:outline-2 focus:outline-indigo-600"
              />
            </div>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" disabled={isSaving || isLoading} className="rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving…" : "Add Candidate"}</button>
            <button type="button" onClick={closeForm} disabled={isSaving} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
          </div>
        </form>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section aria-labelledby="todo-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 id="todo-heading" className="text-lg font-semibold text-slate-900">To Do</h2>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800" aria-label={`${candidates.length} candidates to do`} aria-live="polite">{candidates.length}</span>
          </div>
          {isLoading && <p role="status" className="py-14 text-center text-sm text-slate-500">Loading candidates…</p>}
          {loadError && <p role="alert" className="mt-4 text-sm text-red-700">{loadError}</p>}
          {!isLoading && !loadError && candidates.length === 0 && <div className="py-14 text-center">
            <p className="font-medium text-slate-700">No candidates yet</p>
            <p className="mt-2 text-sm text-slate-500">Candidates you are working on will appear here.</p>
          </div>}
          {candidates.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {candidates.map((candidate) => (
                <li key={candidate.id} className="py-4">
                  <p className="break-words font-medium text-slate-900">{candidate.candidate_name}</p>
                  <p className="mt-1 break-words text-sm text-slate-500">RQ: {candidate.rq_number}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="completed-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 id="completed-heading" className="text-lg font-semibold text-slate-900">Completed</h2>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800" aria-label="0 completed candidates">0</span>
          </div>
          <div className="py-14 text-center">
            <p className="font-medium text-slate-700">Nothing completed yet</p>
            <p className="mt-2 text-sm text-slate-500">Completed candidates will appear here.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
