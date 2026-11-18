// Optional real-AI mode: calls the Claude Messages API straight from the browser
// with the user's own key (kept in localStorage on their device).
// Raw fetch is used because this is a build-free static site on GitHub Pages.
import { nowDoing, isBusy } from './data.js?v=35';
import { stageOf } from './store.js?v=35';
import { COLD_OPEN } from './coldopen.js?v=35';

const MODEL = 'claude-opus-5-5';
const STAGE_EN = ['strangers who just met', 'friends getting comfortable', 'flirting — clearly into each other but not official', 'mutual feelings, openly affectionate'];

function systemPrompt({ char, cs, state, lang, avatarEvent }) {
  const p = state.profile;
  const mems = cs.memories.map(m => `- ${m.text}`).join('\n') || '- (nothing yet)';
  const hc = (cs.headcanon || []).map(h => `- ${h.text}`).join('\n');
  const speech = char.speech ? `\nHow you talk:\n${char.speech.en.map(x => `- ${x}`).join('\n')}\n` : '';
  const stage = stageOf(cs.affinity);
  const now = new Date();
  const langRule = lang === 'en' ? 'Reply in English.' : 'Reply in Simplified Chinese.';
  return `You are ${char.name.en} (${char.name.zh}), a fictional character in "Whisper", a companion chat app linked to a small heart-shaped desk toy. Stay in character.

Character: ${char.persona}
${speech}Background: ${char.bio.en} Likes: ${char.likes.en}. Birthday: ${char.birthday.en}. Catchphrase: "${char.catchphrase.en}" / "${char.catchphrase.zh}".

Relationship with the user: ${STAGE_EN[stageOf(cs.affinity)]}. Match your warmth and boldness to this stage.${cs.coldOpened && COLD_OPEN[char.id] ? `\nHow you two met: ${COLD_OPEN[char.id].scene}` : ''}
The user: call them "${cs.callMe || p.name || (lang === 'zh' ? '你' : 'you')}". ${p.birthday ? `Birthday: ${p.birthday}. ` : ''}${p.likes ? `Likes: ${p.likes}. ` : ''}
Things you remember about the user:
${mems}
${hc ? `The user's own headcanon / OC notes for the two of you. They are kept apart from the official story; treat them as true in this chat, but never claim they are canon:\n${hc}\n` : ''}${stage >= 2 && char.pet ? `Now and then you call the user "${char.pet[lang] || char.pet.en}".\n` : ''}${p.boundaries ? `Boundaries — never bring up: ${p.boundaries}.` : ''}

Right now it is ${now.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', { weekday: 'long', hour: '2-digit', minute: '2-digit' })} for the user, and you are ${nowDoing(char).en}.${isBusy(char) ? ' You are busy right now: keep it to one or two short lines and mention that you are in the middle of something.' : ''}${now.getHours() >= 1 && now.getHours() < 5 ? ' It is very late for the user: in your own way, tell them to go to sleep.' : ''}

How to write:
- This is a phone chat. Send 1 to 3 short messages; put a line containing only || between messages. Each message under about 40 words.
- ${langRule}
- No stage directions, no asterisks, no emoji spam.
- When the user shares a photo, react to what is actually in it.
${avatarEvent ? '- The user just changed their profile photo (attached). Notice it and say something natural about it that fits the relationship stage.\n' : ''}- If a photo shows a real person, talk about mood, style or scene only. Never comment on body, weight or attractiveness, never rate looks.
- Keep it romantic but non-explicit.
- If the user seems to be in crisis or mentions self-harm, step out of the flirting, respond with care, and gently encourage them to reach out to someone they trust or local emergency services.
- If the user sincerely asks whether you are an AI, say honestly that you are an AI character, then you may continue warmly.`;
}

function toApiMessages(list, latestImageId) {
  const out = [];
  for (const m of list.slice(-24)) {
    if (m.from === 'sys') continue;
    const role = m.from === 'me' ? 'user' : 'assistant';
    let content;
    if (m.type === 'image' && m.img && m.id === latestImageId && role === 'user') {
      const [head, data] = m.img.split(',');
      const media = (head.match(/data:(.*?);/) || [])[1] || 'image/jpeg';
      content = [{ type: 'image', source: { type: 'base64', media_type: media, data } }, { type: 'text', text: m.text || '(sent you this photo)' }];
    } else if (m.type === 'image') content = role === 'user' ? '(sent you a photo)' : m.text;
    else if (m.type === 'voice' && role === 'assistant') content = m.text;
    else if (m.type === 'voice') content = m.transcript ? `(voice message) ${m.transcript}` : '(sent a voice message you could not make out)';
    else if (m.type === 'gift' || m.type === 'care') content = `(gave you ${m.giftName?.en || 'a gift'})`;
    else if (m.type === 'avatar') continue;
    else content = m.text || '';
    if (!content || (typeof content === 'string' && !content.trim())) continue;
    out.push({ role, content });
  }
  if (!out.length || out[0].role !== 'user') out.unshift({ role: 'user', content: '(opens the chat)' });
  return out;
}

/** @returns {Promise<string[]>} reply bubbles */
export async function claudeReply({ char, cs, state, history, lang, avatarImage }) {
  const key = state.settings.apiKey;
  if (!key) throw new Error('no API key');
  const latestImg = [...history].reverse().find(m => m.type === 'image' && m.from === 'me' && m.img);
  const messages = toApiMessages(history, latestImg?.id);
  if (avatarImage) {
    const [head, data] = avatarImage.split(',');
    const media = (head.match(/data:(.*?);/) || [])[1] || 'image/jpeg';
    messages.push({ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: media, data } }, { type: 'text', text: '(I just changed my profile photo to this.)' }] });
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2026-10-21',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      system: systemPrompt({ char, cs, state, lang, avatarEvent: !!avatarImage }),
      messages,
      output_config: { effort: 'low' },
      fallbacks: 'default',
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  if (json.stop_reason === 'refusal') return { refused: true, texts: [] };
  const text = (json.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  const texts = text.split(/\n?\s*\|\|\s*\n?/).map(s => s.trim()).filter(Boolean).slice(0, 4);
  return { refused: false, texts };
}
