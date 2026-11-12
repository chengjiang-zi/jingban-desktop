export const actionChannels = {
  turn: ['ParamAngleX'],
  nod: ['ParamAngleY'],
  tilt: ['ParamAngleZ'],
  lean: ['ParamBodyAngleX'],
  sway: ['ParamBodyAngleZ'],
  lookX: ['ParamEyeBallX'],
  lookY: ['ParamEyeBallY'],
  eyeL: ['ParamEyeLOpen'],
  eyeR: ['ParamEyeROpen'],
  smile: ['ParamMouthForm'],
  brow: ['ParamBrowLY', 'ParamBrowRY'],
  handL: ['CatParamLeftHandDown'],
  handR: ['CatParamRightHandDown']
};

const gesture = (name, duration, ...poses) => ({
  name, frames: [[0, {}], ...poses, [duration, {}]]
});

export const gestures = {
  greet: gesture('打招呼', 1350, [280, {tilt: .4, smile: .8, handL: 1}], [550, {tilt: -.25, smile: .8}], [850, {tilt: .35, smile: .8, handL: 1}]),
  agree: gesture('连点两下头', 1250, [250, {nod: -.6, smile: .6}], [480, {nod: .25, smile: .6}], [700, {nod: -.55, smile: .6}]),
  disagree: gesture('摇摇头', 1200, [250, {turn: -.5}], [510, {turn: .5}], [760, {turn: -.36}]),
  wink: gesture('眨一只眼', 950, [310, {tilt: .22, eyeR: 1, smile: .9}], [520, {tilt: .22, eyeR: 1, smile: .9}]),
  curious: gesture('好奇歪头', 1700, [450, {tilt: -.55, lookX: .25, brow: .45}], [1170, {tilt: -.48, lookX: .25, brow: .35}]),
  bow: gesture('低头致谢', 1500, [500, {nod: -.82, lean: .28, eyeL: .65, eyeR: .65, smile: .7}], [900, {nod: -.78, lean: .28, eyeL: .65, eyeR: .65, smile: .7}]),
  peek: gesture('侧头偷看', 1600, [390, {turn: .55, tilt: -.25, lookX: -.5}], [1050, {turn: .48, tilt: -.25, lookX: -.5}]),
  cheer: gesture('开心庆祝', 1700, [300, {nod: .5, tilt: .35, smile: 1, handL: 1}], [570, {nod: -.18, tilt: -.25, smile: .85}], [890, {nod: .5, tilt: .35, smile: 1, handR: 1}]),
  shy: gesture('害羞转头', 1850, [470, {turn: -.5, nod: -.28, lookY: -.55, eyeL: .3, eyeR: .3, smile: .6}], [1300, {turn: -.4, nod: -.25, lookY: -.45, eyeL: .3, eyeR: .3, smile: .6}]),
  surprise: gesture('吃了一惊', 1100, [170, {nod: .4, brow: .9, eyeL: -.45, eyeR: -.45}], [500, {nod: .2, brow: .4}]),
  sway: gesture('轻轻摇摆', 2050, [420, {turn: -.23, tilt: -.43, sway: -.48, smile: .65}], [920, {turn: .23, tilt: .43, sway: .48, smile: .65}], [1460, {turn: -.18, tilt: -.32, sway: -.38, smile: .65}]),
  think: gesture('抬眼思考', 1750, [470, {turn: -.18, tilt: -.26, lookY: .64, lookX: -.38, brow: -.2}], [1240, {turn: -.18, tilt: -.26, lookY: .64, lookX: -.38, brow: -.2}])
};

export const maxActionMs = 8000;
export const actionPrefix = '[鲸伴动作]';
const maxActionLine = 3000;

export function actionCatalog(parameters, motions = {}) {
  const ids = parameters && new Set(parameters);
  const channels = Object.keys(actionChannels).filter(key => !ids || actionChannels[key].some(id => ids.has(id)));
  const presets = Object.entries(gestures).filter(([, entry]) =>
    entry.frames.some(([, pose]) => channels.some(channel => pose[channel]))
  ).map(([id, {name}]) => ({id, name}));
  const native = Object.entries(motions || {}).flatMap(([group, items]) => Array.isArray(items)
    ? items.flatMap((item, index) => typeof item?.File === 'string' ? [{
      group, index, name: item.Name || item.File.split(/[\\/]/).at(-1).replace(/\.motion3\.json$/i, '')
    }] : []) : []);
  return {channels, presets, native};
}

export function validateAction(action, catalog) {
  if (typeof action?.preset === 'string' && catalog.presets.some(p => p.id === action.preset)) {
    return {preset: action.preset};
  }
  if (action?.motion && catalog.native.some(m => m.group === action.motion.group && m.index === action.motion.index)) {
    const {group, index} = action.motion;
    const duration = action.duration ?? 4000;
    if (!Number.isInteger(duration) || duration < 200 || duration > maxActionMs) throw new Error('原生动作时长需为 200–8000 毫秒');
    return {motion: {group, index}, duration};
  }
  if (!Array.isArray(action?.frames) || action.frames.length < 2 || action.frames.length > 12) throw new Error('请选择可用的动作，或提供 2–12 个关键帧');
  let previous = -1;
  let hasMovement = false;
  const frames = action.frames.map(frame => {
    if (!Array.isArray(frame) || frame.length !== 2) throw new Error('关键帧格式需为 [毫秒, 参数对象]');
    const [time, pose] = frame;
    if (!Number.isInteger(time) || time <= previous || time > maxActionMs || (previous === -1 && time !== 0)) throw new Error('关键帧时间需从 0 开始递增，最长 8000 毫秒');
    if (!pose || typeof pose !== 'object' || Array.isArray(pose)) throw new Error('关键帧参数格式错误');
    for (const [key, value] of Object.entries(pose)) {
      if (!catalog.channels.includes(key) || !Number.isFinite(value) || Math.abs(value) > 1) throw new Error('关键帧参数不受当前模型支持，或超出 -1 到 1');
      hasMovement ||= value !== 0;
    }
    previous = time;
    return [time, pose];
  });
  if (!hasMovement || previous < 200 || Object.values(frames[0][1]).some(Boolean) || Object.values(frames.at(-1)[1]).some(Boolean)) {
    throw new Error('自定义动作需至少 200 毫秒，且起点和终点必须回到默认姿态');
  }
  return {frames};
}

export function sampleAction(frames, elapsed) {
  const next = frames.findIndex(([time]) => time > elapsed);
  if (next < 1) return {};
  const [start, from] = frames[next - 1];
  const [end, to] = frames[next];
  const t = (elapsed - start) / (end - start);
  const eased = t * t * (3 - 2 * t);
  return Object.fromEntries([...new Set([...Object.keys(from), ...Object.keys(to)])].map(key => [
    key, (from[key] ?? 0) * (1 - eased) + (to[key] ?? 0) * eased
  ]));
}

export function actionInstructions(catalog) {
  const labels = 'turn/nod/tilt=头部左右/上下/侧倾，lean/sway=身体转动/摇摆，lookX/lookY=视线左右/上下，eyeL/eyeR=眯左/右眼（正值闭合），smile=微笑，brow=抬眉，handL/handR=抬手参数（正值按下）';
  const native = catalog.native.slice(0, 24).map(({group,index,name}) => [group,index,String(name).slice(0,60)]);
  return [
    '你可以为当前回复编排一次桌宠动作。用户明确要求做动作时请生成动作指令；合适的日常对话也可以加一个简短动作。连续动作优先用关键帧合成一段。',
    `使用时，第一行以 ${actionPrefix} 紧接一行 JSON，换行后正常回复。动作行是内部控制，不要在正文中复述或加代码围栏。`,
    '格式可选 {"preset":"动作ID"}、{"motion":{"group":"组名","index":0}}，或 {"frames":[[0,{}],[400,{"tilt":0.5}],[1200,{}]]}。',
    '关键帧 2–12 个，时间为递增毫秒，最长 8000。首尾姿态必须为 {}。数值 -1 到 1。仅可使用列出的参数。动作播放与文字和语音独立。',
    `参数 ${catalog.channels.join(', ')}。含义 ${labels}。`,
    `动作 ID ${JSON.stringify(catalog.presets.map(p => [p.id,p.name]))}。模型原生动作（组、序号、名称） ${JSON.stringify(native)}。`
  ].join('\n');
}

// The optional first line can arrive across any number of streaming deltas.
export function createActionReply(onAction) {
  let pending = '', state = 'prefix';
  return {
    push(text, done = false) {
      if (state === 'text') return text;
      pending += text;
      if (state === 'discard') {
        const newline = pending.indexOf('\n');
        const rest = newline === -1 ? '' : pending.slice(newline + 1);
        pending = '';
        if (newline !== -1 || done) state = 'text';
        return rest;
      }
      if (state === 'prefix') {
        if (!done && actionPrefix.startsWith(pending) && pending !== actionPrefix) return '';
        if (!pending.startsWith(actionPrefix)) {
          state = 'text';
          return pending;
        }
        state = 'action';
      }
      const newline = pending.indexOf('\n');
      if (newline === -1 && !done) {
        if (pending.length > maxActionLine) { pending = ''; state = 'discard'; }
        return '';
      }
      const end = newline === -1 ? pending.length : newline;
      if (end <= maxActionLine) {
        let action;
        try { action = JSON.parse(pending.slice(actionPrefix.length, end)); } catch {}
        if (action) onAction(action);
      }
      state = 'text';
      return newline === -1 ? '' : pending.slice(newline + 1);
    }
  };
}
