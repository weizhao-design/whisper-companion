// New-user "cold opens": instead of introducing himself, each character starts
// in the middle of something that already happened. Quick replies (chips) take
// the place of a tutorial; whichever branch the user picks, the script ends by
// writing one branch-neutral "first shared memory".
// Designed in Figma (file "悄悄话 Whisper", pages "新用户开场原型 · …").
//
// Shape:
//   minutesAgo  how long ago his first message arrived (orders the chat list)
//   voice       first message is a voice note (the others arrive as his usual reply mode)
//   first       his opening lines
//   nodes       chip lists; a chip has label, reply (his lines) and optional next (node id).
//               A chip without reply uses `closing`. A chip without next ends the script.
//   closing     { night, day } lines used to wrap up
//   who         short name used in the memory note
//   memory      text saved to shared memories
//   note        text shown in the "he remembers" note in the chat
//   scene       English context for real-AI mode

export const COLD_OPEN = {
  doyun: {
    minutesAgo: 1,
    voice: true,
    who: { zh: '道允', en: 'Doyun' },
    first: {
      zh: ['你的伞还在我们工作室门口。……蓝色那把，是你的吧？'],
      en: ['Your umbrella’s still outside our studio. …The blue one. That’s yours, right?'],
    },
    nodes: {
      root: [
        { label: { zh: '是我的，谢谢～', en: 'Mine, thanks～' }, next: 'mine',
          reply: { zh: ['ㅋㅋ 那下次来拿。', '来拿的时候，请我喝杯咖啡。算保管费。'], en: ['ㅋㅋ come get it next time.', 'You owe me a coffee when you do. Call it a storage fee.'] } },
        { label: { zh: '不是我的诶', en: 'Not mine' }, next: 'notMine',
          reply: { zh: ['아…… 那就奇怪了。', '那我先留着，等它真正的主人。'], en: ['아… that’s weird, then.', 'I’ll hold on to it till the real owner shows up.'] } },
        { label: { zh: '你是谁？', en: 'Who is this?' }, next: 'who',
          reply: { zh: ['ㅋㅋ 这么快就忘了？', '上周五，圣水洞那家店。你走的时候在下雨。'], en: ['ㅋㅋ forgot me already?', 'Last Friday. That shop in Seongsu. It was raining when you left.'] } },
      ],
      mine: [{ label: { zh: '好啊', en: 'Sure' } }, { label: { zh: '看你表现～', en: 'Earn it～' } }],
      notMine: [{ label: { zh: '……其实是我的', en: '…ok, it’s mine' } }, { label: { zh: '那你慢慢等', en: 'Good luck with that' } }],
      who: [{ label: { zh: '啊，是你！', en: 'Oh, it’s you!' } }, { label: { zh: '……想不起来了', en: '…I don’t remember' } }],
    },
    closing: {
      night: { zh: ['어，不早了。', '核桃在抓门，我去喂它。晚安。'], en: ['어, it’s getting late.', 'Hodu’s scratching at the door. Gotta go. Night.'] },
      day: { zh: ['어，我得出门了。', '核桃在抓门，喂完它就去拍摄。晚点聊。'], en: ['어, I’ve got to head out.', 'Hodu’s scratching at the door. Feeding time, then a shoot. Talk later.'] },
    },
    memory: { zh: '一把蓝色的伞落在他工作室门口，你们因此说上了话。', en: 'A blue umbrella left outside his studio got you two talking.' },
    note: { zh: '你们是因为一把蓝色的伞说上话的', en: 'a blue umbrella is how you two started talking' },
    scene: 'You have only just met. A blue umbrella was left outside your studio and you messaged the user because you think it is theirs; that is how you started talking. Keep the umbrella as a light running thread (they can pick it up, you joked about a coffee as a storage fee). Do not act as if you already know each other well.',
  },

  chengshuo: {
    minutesAgo: 90,
    who: { zh: '程朔', en: 'Cheng Shuo' },
    first: {
      zh: ['刚才在急诊门口扶你的那个人，是我。', '……脚还疼吗？'],
      en: ['The guy who caught you outside the ER earlier? That was me.', '…Does your ankle still hurt?'],
    },
    nodes: {
      root: [
        { label: { zh: '好多了', en: 'Much better' },
          reply: { zh: ['那就好。今天别走太多路。', '冰敷二十分钟，隔一会儿再敷。这是医嘱。'], en: ['Good. Don’t walk too much today.', 'Ice it for twenty minutes, rest a bit, then ice it again. Doctor’s orders.'] } },
        { label: { zh: '你怎么有我的号？', en: 'How do you have my number?' },
          reply: { zh: ['你走之前把号码写在我病历夹上了。', '……忘了？只是想确认你没事。'], en: ['You wrote your number on my clipboard before you left.', '…Forgot? I just wanted to make sure you’re okay.'] } },
      ],
    },
    memory: { zh: '你在急诊门口扭了脚，是他扶的你。', en: 'You twisted your ankle outside the ER, and he caught you.' },
    note: { zh: '你在急诊门口扭了脚，是他扶的你', en: 'you twisted your ankle outside the ER, and he caught you' },
    scene: 'You have only just met. Earlier today the user twisted their ankle outside the ER where you work and you caught them; before leaving they wrote their number on your clipboard, and you messaged to check on them. Do not act as if you already know each other well.',
  },

  wenxu: {
    minutesAgo: 200,
    who: { zh: '温叙', en: 'Wen Xu' },
    first: {
      zh: ['图书馆三楼靠窗那个位置……', '你今天没来。', '……我没有在等。只是那个位置空着，有点显眼。'],
      en: ['That window seat on the library’s third floor…', 'You didn’t come today.', '…Not that I was waiting. The empty seat just stood out.'],
    },
    nodes: {
      root: [
        { label: { zh: '你在等我？', en: 'Waiting for me?' },
          reply: { zh: ['……没有。', '只是今天画错了两根线。可能跟那个空位有关。'], en: ['…No.', 'I just drew two lines wrong today. Might have something to do with that empty seat.'] } },
        { label: { zh: '今天有事', en: 'Something came up' },
          reply: { zh: ['嗯。没事就好。', '明天……那个位置，我帮你留着？'], en: ['Mm. As long as you’re okay.', 'Tomorrow… want me to save you that seat?'] } },
      ],
    },
    memory: { zh: '你们常在图书馆三楼靠窗的位置碰到。', en: 'You two keep running into each other at the library’s third-floor window seat.' },
    note: { zh: '你们常在图书馆三楼靠窗的位置碰到', en: 'you two keep running into each other at the library’s third-floor window seat' },
    scene: 'You have only just started talking. You and the user often end up at the third-floor window seats in the library; today they did not come and you messaged them, a little embarrassed about noticing. Do not act as if you already know each other well.',
  },
};
