import { profiles, type StyleProfile } from './profiles';
export function resolveStyle(id = 'auto', custom?: StyleProfile): StyleProfile {
  if (id === 'custom') {
    if (!custom || !custom.id || !custom.name || !custom.palette || Object.values(custom.palette).some(c => !/^#[0-9a-f]{6}$/i.test(c))) throw new Error('自定义风格需要完整有效的六位色值与档案。');
    return custom;
  }
  const profile = profiles.find(p => p.id === (id === 'auto' ? 'precision-science' : id));
  if (!profile) throw new Error(`Unknown style profile: ${id}`);
  return profile;
}
