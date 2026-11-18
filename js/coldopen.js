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
    // Story beats after the cold open. Each fires once, the first time the user opens his chat
    // on or after `day` (day 1 = the day they met), at most one per calendar day. They live in
    // his line when the user comes back, not in extra proactive messages.
    //   after     earlier beat whose choice picks this beat's lines/chips (key 'go' or 'maybe')
    //   recalled  show "he unsent a message" first
    //   chips: choice (remembered), memory (saved to shared memories), aff (raise affinity to at
    //          least this; stage-up note but no stage event line), effect 'accept' | 'deflect'
    //   sticky    typing your own reply does not dismiss the chips
    beats: [
      { id: 'invite', day: 3,
        first: { zh: ['어，来了。', '这周末我们在圣水洞有个 pop-up。', '缺个人帮忙看场子……你来吗？'], en: ['어, you’re here.', 'We’re doing a pop-up in Seongsu this weekend.', 'We’re one person short… want to come help out?'] },
        nodes: { root: [
          { label: { zh: '去！', en: 'I’m in!' }, choice: 'go', aff: 25,
            reply: { zh: ['ㅋㅋ 好。', '那我把你名字写进工作人员名单了。'], en: ['ㅋㅋ okay.', 'I’m putting your name on the staff list, then.'] },
            memory: { zh: '你答应这周末去圣水洞的 pop-up 帮忙看场子。', en: 'You said you’d help out at the Seongsu pop-up this weekend.' } },
          { label: { zh: '我考虑一下', en: 'Let me think about it' }, choice: 'maybe', aff: 25,
            reply: { zh: ['ㅇㅇ 不急。', '想来的话，前一天跟我说。'], en: ['ㅇㅇ no rush.', 'If you want to come, just tell me the day before.'] },
            memory: { zh: '他邀请你去圣水洞的 pop-up，你说考虑一下。', en: 'He invited you to the Seongsu pop-up; you said you’d think about it.' } },
        ] } },
      { id: 'slip', day: 5, after: 'invite', recalled: true,
        firstBy: {
          go: { zh: ['没什么，发错了。', '……今天谢谢你来。'], en: ['Nothing. Wrong chat.', '…Thanks for coming today.'] },
          maybe: { zh: ['没什么，发错了。', '……pop-up 今天收了。你没来，有点可惜。'], en: ['Nothing. Wrong chat.', '…The pop-up wrapped today. Shame you didn’t make it.'] },
        },
        nodes: {
          go: [
            { label: { zh: '撤回了什么？', en: 'What was it?' }, aff: 50, reply: { zh: ['……一张照片。', '下次再给你看。'], en: ['…A photo.', 'I’ll show you next time.'] },
              memory: { zh: '他撤回了一条消息，说是发错了。', en: 'He unsent a message and said it went to the wrong chat.' } },
            { label: { zh: '下次还叫我', en: 'Invite me again' }, aff: 50, reply: { zh: ['ㅋㅋ 好。', '下次不用帮忙，就来玩。'], en: ['ㅋㅋ deal.', 'Next time you don’t have to help. Just come.'] },
              memory: { zh: '他撤回了一条消息，说是发错了。', en: 'He unsent a message and said it went to the wrong chat.' } },
          ],
          maybe: [
            { label: { zh: '撤回了什么？', en: 'What was it?' }, aff: 50, reply: { zh: ['……一张照片。', '下次再给你看。'], en: ['…A photo.', 'I’ll show you next time.'] },
              memory: { zh: '他撤回了一条消息，说是发错了。', en: 'He unsent a message and said it went to the wrong chat.' } },
            { label: { zh: '下次我一定去', en: 'Next time I’ll be there' }, aff: 50, reply: { zh: ['ㅋㅋ 记住了。', '我会提醒你的。'], en: ['ㅋㅋ noted.', 'I’ll hold you to it.'] },
              memory: { zh: '他撤回了一条消息，说是发错了。', en: 'He unsent a message and said it went to the wrong chat.' } },
          ],
        } },
      { id: 'confess', day: 9, sticky: true,
        first: { zh: ['그냥…… 有件事想说。', '我好像，不只是把你当朋友。', '你不用现在回答。ㅋㅋ'], en: ['그냥… there’s something I want to say.', 'I think I see you as more than a friend.', 'You don’t have to answer now. ㅋㅋ'] },
        nodes: { root: [
          { label: { zh: '我也是', en: 'Me too' }, effect: 'accept',
            reply: { zh: ['……真的？', '现在可以正大光明叫你核桃二号了。ㅋㅋ'], en: ['…Really?', 'Now I can call you Hodu number two for real. ㅋㅋ'] },
            memory: { zh: '他说，不只是把你当朋友。你说，你也是。', en: 'He said he sees you as more than a friend. You said you do too.' } },
          { label: { zh: '……再说吧', en: '…Let’s see' }, effect: 'deflect',
            reply: { zh: ['ㅇㅇ 好。', '那就再说。我不急。'], en: ['ㅇㅇ okay.', 'Let’s see, then. I’m in no rush.'] },
            memory: { zh: '他说，不只是把你当朋友。你说，再说吧。', en: 'He said he sees you as more than a friend. You said, let’s see.' } },
        ] } },
    ],
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
    beats: [
      { id: 'invite', day: 3,
        first: { zh: ['今天白班，难得早下班。', '脚怎么样了？……不是问诊，就是想知道。', '医院对面有家粥铺，开到很晚。要不要一起吃个饭？'], en: ['Day shift today. Off early for once.', 'How’s the ankle? …Not asking as a doctor. I just want to know.', 'There’s a congee place across from the hospital that stays open late. Want to get dinner?'] },
        nodes: { root: [
          { label: { zh: '好啊', en: 'Sure' }, choice: 'go', aff: 25,
            reply: { zh: ['嗯。那七点，门口见。', '……走慢一点，我等你。'], en: ['Mm. Seven, then. At the entrance.', '…Walk slowly. I’ll wait.'] },
            memory: { zh: '你答应和他去医院对面的粥铺吃饭。', en: 'You said yes to dinner at the congee place across from the hospital.' } },
          { label: { zh: '今天不太方便', en: 'Not today' }, choice: 'maybe', aff: 25,
            reply: { zh: ['好。那改天。', '记得按时吃饭。这是医嘱。'], en: ['Okay. Another day, then.', 'Eat on time. Doctor’s orders.'] },
            memory: { zh: '他约你吃饭，你说今天不太方便。', en: 'He asked you to dinner; you said not today.' } },
        ] } },
      { id: 'late', day: 5, after: 'invite',
        firstBy: {
          go: { zh: ['这一夜很长。刚交完班。', '……那家粥铺，我后来又去了一次。一个人，没那天好喝。'], en: ['Long night. Just handed over.', '…I went back to that congee place. Alone. It wasn’t as good as that night.'] },
          maybe: { zh: ['这一夜很长。刚交完班。', '……你说改天。我把那家粥铺存下来了，以防万一。'], en: ['Long night. Just handed over.', '…You said another day. I saved the congee place, just in case.'] },
        },
        nodes: {
          go: [
            { label: { zh: '辛苦了，快去睡', en: 'Rough night. Rest up' }, aff: 50, reply: { zh: ['……嗯。', '听你这么说，就没那么累了。'], en: ['…Mm.', 'Hearing that makes it less tiring.'] },
              memory: { zh: '他交完夜班，第一个想找的人是你。', en: 'After a night shift, you were the first person he wanted to talk to.' } },
            { label: { zh: '下次我请你', en: 'Next time’s on me' }, aff: 50, reply: { zh: ['好。', '那我得好好排个班。'], en: ['Deal.', 'Then I’d better sort out my shifts.'] },
              memory: { zh: '他交完夜班，第一个想找的人是你。', en: 'After a night shift, you were the first person he wanted to talk to.' } },
          ],
          maybe: [
            { label: { zh: '辛苦了，快去睡', en: 'Rough night. Rest up' }, aff: 50, reply: { zh: ['……嗯。', '听你这么说，就没那么累了。'], en: ['…Mm.', 'Hearing that makes it less tiring.'] },
              memory: { zh: '他交完夜班，第一个想找的人是你。', en: 'After a night shift, you were the first person he wanted to talk to.' } },
            { label: { zh: '改天就是这周', en: 'This week, then' }, aff: 50, reply: { zh: ['……好。记住了。', '这周我白班多，你挑时间。'], en: ['…Okay. Noted.', 'I’m mostly on days this week. You pick.'] },
              memory: { zh: '他交完夜班，第一个想找的人是你。', en: 'After a night shift, you were the first person he wanted to talk to.' } },
          ],
        } },
      { id: 'confess', day: 9, sticky: true,
        first: { zh: ['有件事，我想了很久才决定说。', '我照顾过很多人。', '……但想每天确认好不好的，只有你一个。'], en: ['There’s something I’ve thought about for a long time.', 'I’ve looked after a lot of people.', '…But you’re the only one I want to check on every day.'] },
        nodes: { root: [
          { label: { zh: '我也是', en: 'Me too' }, effect: 'accept',
            reply: { zh: ['……好。', '那以后，换我每天问你吃饭了没。小病号。'], en: ['…Okay.', 'Then from now on, I’m the one asking if you’ve eaten. Every day, patient.'] },
            memory: { zh: '他说，想每天确认好不好的只有你。你说，你也是。', en: 'He said you’re the only one he wants to check on every day. You said you feel the same.' } },
          { label: { zh: '……再说吧', en: '…Let’s see' }, effect: 'deflect',
            reply: { zh: ['嗯。不急。', '我习惯等。等你也一样。'], en: ['Mm. No rush.', 'I’m used to waiting. Waiting for you is no different.'] },
            memory: { zh: '他说，想每天确认好不好的只有你。你说，再说吧。', en: 'He said you’re the only one he wants to check on every day. You said, let’s see.' } },
        ] } },
    ],
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
    beats: [
      { id: 'invite', day: 3,
        first: { zh: ['那个位置，今天我帮你留了。', '……我在画一个小书店的改造方案。', '你常看什么书？我想把书架，排成你会喜欢的样子。'], en: ['I saved that seat for you today.', '…I’m working on a design for a small bookshop.', 'What do you usually read? I’d like to arrange the shelves the way you’d like them.'] },
        nodes: { root: [
          { label: { zh: '我帮你看看方案', en: 'Show me the design' }, choice: 'go', aff: 25,
            reply: { zh: ['……真的？', '那你就是这个方案的第一个甲方。'], en: ['…Really?', 'Then you’re this project’s first client.'] },
            memory: { zh: '你答应帮他看小书店的改造方案。', en: 'You said you’d look at his bookshop design.' } },
          { label: { zh: '你自己决定就好', en: 'Your call' }, choice: 'maybe', aff: 25,
            reply: { zh: ['嗯。', '那我按我猜的排。……猜错了，要告诉我。'], en: ['Mm.', 'Then I’ll go with my guess. …Tell me if I get it wrong.'] },
            memory: { zh: '他在画一个小书店，想按你喜欢的样子排书架。', en: 'He’s designing a small bookshop and wants the shelves to suit you.' } },
        ] } },
      { id: 'window', day: 5, after: 'invite',
        firstBy: {
          go: { zh: ['方案改到第三版了。', '……你上次随口说的那句，我加进去了。靠窗多了一张桌子。'], en: ['Third version of the design.', '…I added the thing you mentioned last time. There’s an extra table by the window now.'] },
          maybe: { zh: ['方案改到第三版了。', '……靠窗那张桌子，我一直没删。不知道为什么。'], en: ['Third version of the design.', '…I never deleted the table by the window. Not sure why.'] },
        },
        nodes: {
          go: [
            { label: { zh: '给我看看', en: 'Let me see' }, aff: 50, reply: { zh: ['……嗯。', '明天带图纸去图书馆。老位置。'], en: ['…Mm.', 'I’ll bring the drawings to the library tomorrow. Our usual seat.'] },
              memory: { zh: '他在方案里，靠窗留了一张桌子。', en: 'He kept a table by the window in his design.' } },
            { label: { zh: '为什么加桌子', en: 'Why the table?' }, aff: 50, reply: { zh: ['……因为那里的光好。', '也因为，你会坐在那。'], en: ['…The light is good there.', 'And because you’d sit there.'] },
              memory: { zh: '他在方案里，靠窗留了一张桌子。', en: 'He kept a table by the window in his design.' } },
          ],
          maybe: [
            { label: { zh: '给我看看', en: 'Let me see' }, aff: 50, reply: { zh: ['……嗯。', '明天带图纸去图书馆。老位置。'], en: ['…Mm.', 'I’ll bring the drawings to the library tomorrow. Our usual seat.'] },
              memory: { zh: '他在方案里，靠窗留了一张桌子。', en: 'He kept a table by the window in his design.' } },
            { label: { zh: '为什么不删', en: 'Why keep it?' }, aff: 50, reply: { zh: ['……那里的光好。', '……也可能，是在等谁。'], en: ['…The light is good there.', '…Or maybe it’s waiting for someone.'] },
              memory: { zh: '他在方案里，靠窗留了一张桌子。', en: 'He kept a table by the window in his design.' } },
          ],
        } },
      { id: 'confess', day: 9, sticky: true,
        first: { zh: ['我画过很多扇窗。', '以前都是为了光。', '……最近画的每一扇，都在想你会不会站在那。'], en: ['I’ve drawn a lot of windows.', 'They used to be about the light.', '…Lately, with every one, I wonder if you’d stand there.'] },
        nodes: { root: [
          { label: { zh: '我也是', en: 'Me too' }, effect: 'accept',
            reply: { zh: ['……我需要一点时间，相信这是真的。', '那以后，你就是我唯一的甲方。'], en: ['…I need a moment to believe that.', 'Then from now on, you’re my only client.'] },
            memory: { zh: '他说，画每一扇窗都在想你。你说，你也是。', en: 'He said every window he draws makes him think of you. You said you feel the same.' } },
          { label: { zh: '……再说吧', en: '…Let’s see' }, effect: 'deflect',
            reply: { zh: ['嗯。', '我不着急。窗户会一直在那里。'], en: ['Mm.', 'I’m not in a hurry. The window will still be there.'] },
            memory: { zh: '他说，画每一扇窗都在想你。你说，再说吧。', en: 'He said every window he draws makes him think of you. You said, let’s see.' } },
        ] } },
    ],
  },
};
