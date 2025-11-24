import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Template = {
  id: string;
  name: string;
  role: string;
  level: string;
  description?: string;
  config: any;
};

type Interview = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateId: string;
  status: string;
  scheduledAt?: string;
  template?: Template;
};

type CandidateUser = {
  id: string;
  name: string;
  email: string;
  candidateId?: string | null;
};

const API_BASE = 'http://localhost:4000';

export function AdminDashboardPage() {
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState<'templates' | 'interviews'>('templates');

  // block access if not interviewer
  if (!user || user.role !== 'INTERVIEWER') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-red-400">Access denied</p>
          <p className="text-xs text-slate-400">
            Please log in as an interviewer to view this page.
          </p>
        </div>
      </div>
    );
  }

  const [templates, setTemplates] = useState<Template[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);

  // 🔍 candidate search state
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidateResults, setCandidateResults] = useState<CandidateUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateUser | null>(null);

  const [tplForm, setTplForm] = useState({
    name: '',
    role: '',
    level: '',
    description: '',
    configText: JSON.stringify(
      {
        questions: [
          {
            id: 'q1',
            text: 'Tell me about yourself.',
            type: 'audio',
            durationSec: 90,
          },
          {
            id: 'q2',
            text: 'Why do you want to join our company?',
            type: 'audio',
            durationSec: 90,
          },
        ],
        proctor: {
          heartbeatMs: 5000,
          frameIntervalMs: 2000,
          focusLossThreshold: 3,
        },
      },
      null,
      2
    ),
  });

  const [scheduleForm, setScheduleForm] = useState({
    candidateName: '',
    candidateEmail: '',
    candidateId: '',
    templateId: '',
    scheduledAt: '',
  });

  async function loadTemplates() {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/templates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.error('Failed to load templates:', await res.text());
        return;
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        console.error('Expected array but got:', data);
        return;
      }

      setTemplates(data);
    } catch (err) {
      console.error('Error loading templates', err);
    }
  }

  async function loadInterviews() {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/interviews`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        console.error('Failed to load interviews', await res.text());
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.error('Interviews response is not an array', data);
        return;
      }
      setInterviews(data);
    } catch (e) {
      console.error('Error loading interviews', e);
    }
  }

  // 🔍 search candidates by name/email/registration no
  async function searchCandidates(query: string) {
    if (!token) return;
    const q = query.trim();
    if (!q) {
      setCandidateResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/candidates?query=${encodeURIComponent(q)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        console.error('Failed to search candidates', await res.text());
        setCandidateResults([]);
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.error('Candidate search response is not array', data);
        setCandidateResults([]);
        return;
      }
      setCandidateResults(data);
    } catch (e) {
      console.error('Error searching candidates', e);
      setCandidateResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
    loadInterviews();
  }, [token]);

  async function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    let config;
    try {
      config = JSON.parse(tplForm.configText);
    } catch (err) {
      alert('Config JSON is invalid');
      return;
    }

    const res = await fetch(`${API_BASE}/api/admin/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: tplForm.name,
        role: tplForm.role,
        level: tplForm.level,
        description: tplForm.description,
        config,
      }),
    });

    if (!res.ok) {
      alert('Failed to create template');
      return;
    }
    setTplForm({
      name: '',
      role: '',
      level: '',
      description: '',
      configText: tplForm.configText,
    });
    await loadTemplates();
  }

  async function handleScheduleInterview(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    const res = await fetch(`${API_BASE}/api/admin/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(scheduleForm),
    });

    if (!res.ok) {
      alert('Failed to schedule interview');
      return;
    }
    setScheduleForm({
      candidateName: '',
      candidateEmail: '',
      candidateId: '',
      templateId: '',
      scheduledAt: '',
    });
    setSelectedCandidate(null);
    setCandidateQuery('');
    await loadInterviews();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="p-4 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold">Admin – Interview Dashboard</h1>
          <p className="text-xs text-slate-400">
            {user.name} ({user.email})
          </p>
        </div>
        <button
          className="text-xs text-slate-400 underline"
          onClick={logout}
        >
          Logout
        </button>
        <nav className="flex gap-2 text-sm text-black">
          <button
            className={`px-3 py-1 rounded ${
              tab === 'templates' ? 'bg-slate-800' : 'bg-slate-900'
            }`}
            onClick={() => setTab('templates')}
          >
            Templates
          </button>
          <button
            className={`px-3 py-1 rounded ${
              tab === 'interviews' ? 'bg-slate-800' : 'bg-slate-900'
            }`}
            onClick={() => setTab('interviews')}
          >
            Interviews
          </button>
        </nav>
      </header>

      <main className="p-6 grid gap-6 md:grid-cols-2">
        {tab === 'templates' && (
          <>
            <section className="border border-slate-800 rounded-lg p-4">
              <h2 className="font-medium mb-2 text-sm">
                Create Interview Template
              </h2>
              <form className="space-y-2 text-sm" onSubmit={handleCreateTemplate}>
                <input
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700"
                  placeholder="Template name (e.g. HR Screening)"
                  value={tplForm.name}
                  onChange={(e) =>
                    setTplForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
                <input
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700"
                  placeholder="Role (e.g. Software Engineer)"
                  value={tplForm.role}
                  onChange={(e) =>
                    setTplForm((f) => ({ ...f, role: e.target.value }))
                  }
                />
                <input
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700"
                  placeholder="Level (e.g. junior, mid, senior)"
                  value={tplForm.level}
                  onChange={(e) =>
                    setTplForm((f) => ({ ...f, level: e.target.value }))
                  }
                />
                <textarea
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700"
                  rows={2}
                  placeholder="Description"
                  value={tplForm.description}
                  onChange={(e) =>
                    setTplForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
                <label className="block text-xs text-slate-400 mt-2 mb-1">
                  Config JSON (questions, proctor)
                </label>
                <textarea
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-xs"
                  rows={12}
                  value={tplForm.configText}
                  onChange={(e) =>
                    setTplForm((f) => ({ ...f, configText: e.target.value }))
                  }
                />
                <button
                  type="submit"
                  className="mt-2 px-4 py-1 rounded bg-emerald-600 text-xs font-medium"
                >
                  Save Template
                </button>
              </form>
            </section>

            <section className="border border-slate-800 rounded-lg p-4">
              <h2 className="font-medium mb-2 text-sm">Existing Templates</h2>
              <div className="space-y-2 text-xs max-h-[500px] overflow-auto">
                {templates.length === 0 && (
                  <p className="text-slate-400 text-sm">
                    No templates available.
                  </p>
                )}
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="border border-slate-700 rounded p-2 flex flex-col gap-1"
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="font-semibold">{t.name}</div>
                        <div className="text-slate-400">
                          {t.role} • {t.level}
                        </div>
                      </div>
                      <span className="text-slate-500">
                        {t.id.slice(0, 6)}
                      </span>
                    </div>
                    {t.description && (
                      <div className="text-slate-400">{t.description}</div>
                    )}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-slate-400">
                        View config
                      </summary>
                      <pre className="mt-1 whitespace-pre-wrap wrap-break-words bg-slate-900 p-2 rounded border border-slate-800">
                        {JSON.stringify(t.config, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === 'interviews' && (
          <>
            <section className="border border-slate-800 rounded-lg p-4">
              <h2 className="font-medium mb-2 text-sm">Schedule Interview</h2>

              {/* 🔍 Candidate search */}
              <div className="mb-3 text-xs">
                <label className="block mb-1 text-slate-400">
                  Search candidate (name / email / Reg. No)
                </label>
                <input
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700"
                  placeholder="e.g. Yash, yash@vit.ac.in, 21BIT1234"
                  value={candidateQuery}
                  onChange={(e) => {
                    const q = e.target.value;
                    setCandidateQuery(q);
                    if (q.length >= 2) {
                      searchCandidates(q);
                    } else {
                      setCandidateResults([]);
                    }
                  }}
                />
                {searchLoading && (
                  <p className="mt-1 text-slate-500">Searching...</p>
                )}
                {candidateResults.length > 0 && (
                  <div className="mt-1 border border-slate-700 rounded bg-slate-900 max-h-40 overflow-auto">
                    {candidateResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-2 py-1 hover:bg-slate-800 text-slate-100"
                        onClick={() => {
                          setSelectedCandidate(c);
                          setScheduleForm((f) => ({
                            ...f,
                            candidateName: c.name,
                            candidateEmail: c.email,
                            candidateId: c.candidateId || '',
                          }));
                          setCandidateResults([]);
                          setCandidateQuery(
                            `${c.name} (${c.candidateId || c.email})`
                          );
                        }}
                      >
                        <div className="text-xs font-medium">{c.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {c.email} • Reg. No:{' '}
                          <span className="font-mono">
                            {c.candidateId || '—'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedCandidate && (
                  <p className="mt-1 text-[11px] text-emerald-400">
                    Selected: {selectedCandidate.name} (
                    {selectedCandidate.candidateId || selectedCandidate.email})
                  </p>
                )}
              </div>

              <form
                className="space-y-2 text-sm"
                onSubmit={handleScheduleInterview}
              >
                <input
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700"
                  placeholder="Candidate name"
                  value={scheduleForm.candidateName}
                  onChange={(e) =>
                    setScheduleForm((f) => ({
                      ...f,
                      candidateName: e.target.value,
                    }))
                  }
                />
                <input
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700"
                  placeholder="Candidate email"
                  value={scheduleForm.candidateEmail}
                  onChange={(e) =>
                    setScheduleForm((f) => ({
                      ...f,
                      candidateEmail: e.target.value,
                    }))
                  }
                />
                <input
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700"
                  placeholder="Candidate ID (e.g. reg no / emp ID)"
                  value={scheduleForm.candidateId}
                  onChange={(e) =>
                    setScheduleForm((f) => ({
                      ...f,
                      candidateId: e.target.value,
                    }))
                  }
                />

                <select
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700"
                  value={scheduleForm.templateId}
                  onChange={(e) =>
                    setScheduleForm((f) => ({
                      ...f,
                      templateId: e.target.value,
                    }))
                  }
                >
                  <option value="">Select template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} – {t.role} ({t.level})
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700"
                  value={scheduleForm.scheduledAt}
                  onChange={(e) =>
                    setScheduleForm((f) => ({
                      ...f,
                      scheduledAt: e.target.value,
                    }))
                  }
                />
                <button
                  type="submit"
                  className="mt-2 px-4 py-1 rounded bg-emerald-600 text-xs font-medium"
                >
                  Schedule
                </button>
              </form>
            </section>

            <section className="border border-slate-800 rounded-lg p-4">
              <h2 className="font-medium mb-2 text-sm">Scheduled Interviews</h2>
              <div className="space-y-2 text-xs max-h-[500px] overflow-auto">
                {interviews.map((iv) => (
                  <div
                    key={iv.id}
                    className="border border-slate-700 rounded p-2 flex flex-col gap-1"
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="font-semibold">
                          {iv.candidateName}
                        </div>
                        <div className="text-slate-400">
                          {iv.candidateEmail}
                        </div>
                        <div className="text-xs text-slate-400">
                          Reg. No:{' '}
                          <span className="font-mono">
                            {iv.candidateId}
                          </span>
                        </div>
                      </div>
                      <span className="text-slate-500 text-xs">
                        {iv.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-slate-400 text-xs">
                      Template:{' '}
                      {iv.template
                        ? `${iv.template.name} (${iv.template.role})`
                        : '—'}
                    </div>
                    {iv.scheduledAt && (
                      <div className="text-slate-500 text-xs">
                        Scheduled:{' '}
                        {new Date(iv.scheduledAt).toLocaleString()}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-slate-500 text-xs">
                        Interview ID: {iv.id.slice(0, 8)}
                      </span>
                      <Link
                        to={`/admin/interview/${iv.id}`}
                        className="text-emerald-400 underline text-xs"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
                {interviews.length === 0 && (
                  <div className="text-slate-500">
                    No interviews scheduled.
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
