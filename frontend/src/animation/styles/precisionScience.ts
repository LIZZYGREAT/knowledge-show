/** Video art direction, independent of website tokens. Other profiles are P2. */
export const precisionScience = {
  id: 'precision-science',
  name: '精密科学风',
  intent: '以清晰的材料、稳定结构和可比较的运动建立科学观看感。',
  palette: { background: '#111e30', ink: '#edf1ef', muted: '#93a6b9', red: '#ee7b76', blue: '#78b9dd' },
  typography: { display: 'Georgia, serif', body: 'Arial, "Microsoft YaHei", sans-serif' },
  materials: ['磨砂陶瓷', '拉丝金属引线', '低对比刻度'],
  spatialLanguage: '同一正交尺度，柔和侧光，保留足够负空间。',
  motionCharacter: '粒子有方向，接法切换有重量，对照镜头缓慢推进。',
  avoid: ['霓虹点阵', '无意义光晕', '将结画成绝缘层', '用网站配色决定视频美术'],
} as const;
