import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

type Event = {
  id: string;
  type: string;
  payload: any;
  createdAt: string;
};
type Interview = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  suspicionScore: number;
  proctorEvents: Event[];
};

export function AdminInterviewPage() {
  const { id } = useParams<{ id: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(
        `http://localhost:4000/api/admin/interviews/${id}`
      );
      if (!res.ok) return;
      setInterview(await res.json());
    })();
  }, [id]);

  if (!interview) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-6 space-y-4 text-black">
      <h1 className="text-xl font-semibold">
        Interview {interview.id.slice(0, 6)}
      </h1>
      <p className="text-sm text-slate-500">
        {interview.candidateName} ({interview.candidateEmail})
      </p>
      <p className="text-sm">Suspicion score: {interview.suspicionScore}</p>

      <section>
        <h2 className="font-medium mb-2">Recent events</h2>
        <div className="space-y-1 text-xs">
          {interview.proctorEvents.map((e) => (
            <div key={e.id} className="border-b border-slate-800 py-1">
              <span className="font-mono">
                {new Date(e.createdAt).toISOString()}
              </span>{' '}
              – <strong>{e.type}</strong> –{' '}
              <code>{JSON.stringify(e.payload)}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
