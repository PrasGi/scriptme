'use client';

import { use } from 'react';
import { ScriptEditor } from '@/components/script/script-editor';

export default function NewScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  return <ScriptEditor projectId={projectId} scriptId={null} />;
}
