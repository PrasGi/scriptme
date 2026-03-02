'use client';

import { use } from 'react';
import { ScriptEditor } from '@/components/script/script-editor';

export default function EditScriptPage({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}) {
  const { id: projectId, sid } = use(params);
  return <ScriptEditor projectId={projectId} scriptId={sid} />;
}
