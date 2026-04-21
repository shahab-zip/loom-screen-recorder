import { useState, useEffect } from 'react';
import {
  Building2, Globe, Lock, Palette, Link2, Slack, Zap,
  Check, ChevronRight, AlertTriangle, Camera, Save,
} from 'lucide-react';
import { getStorageItem, setStorageItem } from '../lib/storage';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { RoleGuard } from './auth/RoleGuard';
import { RequirePermission } from './auth/RequirePermission';

interface WorkspaceConfig {
  name: string;
  description: string;
  domain: string;
  defaultPrivacy: 'public' | 'workspace' | 'private';
  allowGuestViewing: boolean;
  requireApproval: boolean;
  brandColor: string;
}

const INTEGRATIONS = [
  { id: 'slack', name: 'Slack', desc: 'Post recordings directly to Slack channels', icon: '🔔', connected: false },
  { id: 'zoom', name: 'Zoom', desc: 'Sync Zoom meetings and recordings', icon: '🎥', connected: false },
  { id: 'notion', name: 'Notion', desc: 'Embed videos in Notion pages', icon: '📝', connected: false },
  { id: 'jira', name: 'Jira', desc: 'Attach screen recordings to Jira tickets', icon: '🔷', connected: false },
  { id: 'gmail', name: 'Gmail', desc: 'Share videos directly from Gmail', icon: '✉️', connected: true },
];

export function WorkspaceSettingsPage() {
  const { currentWorkspace, updateWorkspace, updateWorkspaceSettings, deleteWorkspace, can } = useWorkspace();
  const canEdit = can('workspace:edit-settings');

  const [config, setConfig] = useState<WorkspaceConfig>({
    name: currentWorkspace?.name || 'My Workspace',
    description: currentWorkspace?.description || '',
    domain: '',
    defaultPrivacy: currentWorkspace?.settings?.defaultVideoPrivacy || 'workspace',
    allowGuestViewing: currentWorkspace?.settings?.allowGuestViewing ?? true,
    requireApproval: currentWorkspace?.settings?.requireApproval ?? false,
    brandColor: currentWorkspace?.color || '#625DF5',
  });
  const [saved, setSaved] = useState(false);
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  // Sync from context when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      setConfig({
        name: currentWorkspace.name,
        description: currentWorkspace.description || '',
        domain: '',
        defaultPrivacy: currentWorkspace.settings?.defaultVideoPrivacy || 'workspace',
        allowGuestViewing: currentWorkspace.settings?.allowGuestViewing ?? true,
        requireApproval: currentWorkspace.settings?.requireApproval ?? false,
        brandColor: currentWorkspace.color || '#625DF5',
      });
    }
  }, [currentWorkspace]);

  const handleSave = () => {
    if (currentWorkspace) {
      updateWorkspace(currentWorkspace.id, {
        name: config.name,
        description: config.description,
        color: config.brandColor,
      });
      updateWorkspaceSettings(currentWorkspace.id, {
        defaultVideoPrivacy: config.defaultPrivacy,
        allowGuestViewing: config.allowGuestViewing,
        requireApproval: config.requireApproval,
      });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteWorkspace = () => {
    if (currentWorkspace && deleteInput === config.name) {
      deleteWorkspace(currentWorkspace.id);
      setShowDeleteConfirm(false);
      setDeleteInput('');
    }
  };

  const toggleIntegration = (id: string) => {
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, connected: !i.connected } : i));
  };

  const COLORS = ['#625DF5', '#EF4444', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6'];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Admin Tools</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Workspace Settings</h1>
            <p className="text-sm text-gray-500 mt-1">Configure your team's recording environment</p>
          </div>
          {canEdit && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
            >
              {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save changes</>}
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* General */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="font-bold text-gray-900">General</h2>
            </div>
            <div className="p-6 space-y-5">
              {/* Workspace avatar + name */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-sm"
                    style={{ backgroundColor: config.brandColor }}
                  >
                    {config.name.charAt(0).toUpperCase()}
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center shadow-md hover:bg-gray-700 transition-colors">
                    <Camera className="w-3 h-3 text-white" />
                  </button>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Workspace name</label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={e => setConfig(c => ({ ...c, name: e.target.value }))}
                    disabled={!canEdit}
                    className={`w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={config.description}
                  onChange={e => setConfig(c => ({ ...c, description: e.target.value }))}
                  placeholder="What does your team use this workspace for?"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
                />
              </div>

              {/* Brand color */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Brand color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setConfig(c => ({ ...c, brandColor: color }))}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${config.brandColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Privacy & Access */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <Lock className="w-4 h-4 text-green-600" />
              </div>
              <h2 className="font-bold text-gray-900">Privacy & Access</h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Default video privacy</label>
                <div className="space-y-2">
                  {([
                    { val: 'public', label: 'Public', desc: 'Anyone with the link can view' },
                    { val: 'workspace', label: 'Workspace only', desc: 'Only workspace members can view' },
                    { val: 'private', label: 'Private', desc: 'Only you can view' },
                  ] as const).map(({ val, label, desc }) => (
                    <button
                      key={val}
                      onClick={() => setConfig(c => ({ ...c, defaultPrivacy: val }))}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        config.defaultPrivacy === val ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        config.defaultPrivacy === val ? 'border-red-600' : 'border-gray-300'
                      }`}>
                        {config.defaultPrivacy === val && <div className="w-2 h-2 bg-red-600 rounded-full" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{label}</div>
                        <div className="text-xs text-gray-400">{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {[
                { key: 'allowGuestViewing' as const, label: 'Allow guest viewing', desc: 'Non-members can view videos shared with them' },
                { key: 'requireApproval' as const, label: 'Require admin approval for new members', desc: 'Admins must approve before someone joins' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{label}</div>
                    <div className="text-xs text-gray-400">{desc}</div>
                  </div>
                  <button
                    onClick={() => setConfig(c => ({ ...c, [key]: !c[key] }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${config[key] ? 'bg-red-600' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${config[key] ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Integrations */}
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-purple-600" />
              </div>
              <h2 className="font-bold text-gray-900">Integrations</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {integrations.map(integration => (
                <div key={integration.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-xl">
                      {integration.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{integration.name}</div>
                      <div className="text-xs text-gray-400">{integration.desc}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleIntegration(integration.id)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      integration.connected
                        ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {integration.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Danger Zone - Owner only */}
          <RequirePermission permission="workspace:delete">
          <section className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <h2 className="font-bold text-red-700">Danger Zone</h2>
            </div>
            <div className="p-6">
              {!showDeleteConfirm ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Delete workspace</div>
                    <div className="text-xs text-gray-400">Permanently delete all videos, members, and data</div>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors"
                  >
                    Delete workspace
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">Type <strong>{config.name}</strong> to confirm deletion:</p>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={e => setDeleteInput(e.target.value)}
                    placeholder={config.name}
                    className="w-full px-3 py-2 border border-red-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                      className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteWorkspace}
                      disabled={deleteInput !== config.name}
                      className="flex-1 py-2 bg-red-600 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors"
                    >
                      Permanently delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
          </RequirePermission>
        </div>
      </div>
    </div>
  );
}
