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
        first: { zh: ['这周换了几天白班，难得能早下班。', '脚怎么样了？……不是问诊，就是想知道。', '医院对面有家粥铺，开到很晚。下次早下班，要不要一起吃个饭？'], en: ['I’ve got a few day shifts this week. Off early for once.', 'How’s the ankle? …Not asking as a doctor. I just want to know.', 'There’s a congee place across from the hospital that stays open late. Next time I’m off early, want to get dinner?'] },
        nodes: { root: [
          { label: { zh: '好啊', en: 'Sure' }, choice: 'go', aff: 25,
            reply: { zh: ['嗯。那就下次白班，七点，门口见。', '……走慢一点，我等你。'], en: ['Mm. Next day shift, then. Seven, at the entrance.', '…Walk slowly. I’ll wait.'] },
            memory: { zh: '你答应和他去医院对面的粥铺吃饭。', en: 'You said yes to dinner at the congee place across from the hospital.' } },
          { label: { zh: '今天不太方便', en: 'Not today' }, choice: 'maybe', aff: 25,
            reply: { zh: ['好。那改天。', '记得按时吃饭。这是医嘱。'], en: ['Okay. Another day, then.', 'Eat on time. Doctor’s orders.'] },
            memory: { zh: '他约你吃饭，你说今天不太方便。', en: 'He asked you to dinner; you said not today.' } },
        ] } },
      { id: 'late', day: 5, after: 'invite',
        firstBy: {
          go: { zh: ['昨晚的夜班很长。……睡醒第一件事，是想起你。', '……那家粥铺，我后来又去了一次。一个人，没那天好喝。'], en: ['Long night shift. …First thing I thought of when I woke up was you.', '…I went back to that congee place. Alone. It wasn’t as good as that night.'] },
          maybe: { zh: ['昨晚的夜班很长。……睡醒第一件事，是想起你。', '……你说改天。我把那家粥铺存下来了，以防万一。'], en: ['Long night shift. …First thing I thought of when I woke up was you.', '…You said another day. I saved the congee place on my map, just in case.'] },
        },
        nodes: {
          go: [
            { label: { zh: '辛苦了', en: 'Rough night, huh' }, aff: 50, reply: { zh: ['……嗯。', '听你这么说，就没那么累了。'], en: ['…Mm.', 'Hearing that makes it less tiring.'] },
              memory: { zh: '他下夜班睡醒，第一个想起的是你。', en: 'Waking up after a night shift, you were the first person he thought of.' } },
            { label: { zh: '下次我请你', en: 'Next time’s on me' }, aff: 50, reply: { zh: ['好。', '那我得好好排个班。'], en: ['Deal.', 'Then I’d better sort out my shifts.'] },
              memory: { zh: '他下夜班睡醒，第一个想起的是你。', en: 'Waking up after a night shift, you were the first person he thought of.' } },
          ],
          maybe: [
            { label: { zh: '辛苦了', en: 'Rough night, huh' }, aff: 50, reply: { zh: ['……嗯。', '听你这么说，就没那么累了。'], en: ['…Mm.', 'Hearing that makes it less tiring.'] },
              memory: { zh: '他下夜班睡醒，第一个想起的是你。', en: 'Waking up after a night shift, you were the first person he thought of.' } },
            { label: { zh: '改天就是这周', en: 'This week, then' }, aff: 50, reply: { zh: ['……好。记住了。', '这周我白班多，你挑时间。'], en: ['…Okay. Noted.', 'I’m mostly on days this week. You pick.'] },
              memory: { zh: '他下夜班睡醒，第一个想起的是你。', en: 'Waking up after a night shift, you were the first person he thought of.' } },
          ],
        } },
      { id: 'confess', day: 9, sticky: true,
        first: { zh: ['有件事，我想了很久才决定说。', '下夜班看日出的时候，我会想你昨晚睡得好不好。', '……这种事，我以前没对谁做过。'], en: ['There’s something I’ve thought about for a long time.', 'When I watch the sunrise after a night shift, I wonder if you slept well.', '…I’ve never done that for anyone before.'] },
        nodes: { root: [
          { label: { zh: '我也是', en: 'Me too' }, effect: 'accept',
            reply: { zh: ['……好。', '那以后，换我每天问你吃饭了没。小病号。'], en: ['…Okay.', 'Then from now on, I’ll ask if you’ve eaten. Every day. Doctor’s orders, patient.'] },
            memory: { zh: '他说，下夜班看日出时会想你睡得好不好。你说，你也是。', en: 'He said he wonders if you slept well when he watches the sunrise after a night shift. You said you feel the same.' } },
          { label: { zh: '……再说吧', en: '…Let’s see' }, effect: 'deflect',
            reply: { zh: ['嗯。不急。', '我习惯等。等你也一样。'], en: ['Mm. No rush.', 'I’m used to waiting. Waiting for you is no different.'] },
            memory: { zh: '他说，下夜班看日出时会想你睡得好不好。你说，再说吧。', en: 'He said he wonders if you slept well when he watches the sunrise after a night shift. You said, let’s see.' } },
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
        first: { zh: ['那个位置，今天我帮你留了。', '……我在画一个小书店的改造方案。', '你常看什么书？我想把书架，排成你会喜欢的样子。'], en: ['I saved that seat for you today.', '…I’m working on a design for a small bookshop.', 'What do you usually read? I want the shelves arranged the way you’d like them.'] },
        nodes: { root: [
          { label: { zh: '我帮你看看方案', en: 'Show me the design' }, choice: 'go', aff: 25,
            reply: { zh: ['……真的？', '那你就是这个方案的第一个甲方。'], en: ['…Really?', 'Then you’re this project’s first client.'] },
            memory: { zh: '你答应帮他看小书店的改造方案。', en: 'You said you’d look at his bookshop design.' } },
          { label: { zh: '你自己决定就好', en: 'Your call' }, choice: 'maybe', aff: 25,
            reply: { zh: ['嗯。', '那我按我猜的排。……猜错了，你会告诉我吗？'], en: ['Mm.', 'Then I’ll go with my guess. …Will you tell me if I get it wrong?'] },
            memory: { zh: '他在画一个小书店，想按你喜欢的样子排书架。', en: 'He’s designing a small bookshop and wants the shelves to suit you.' } },
        ] } },
      { id: 'window', day: 5, after: 'invite',
        firstBy: {
          go: { zh: ['方案改到第三版了。', '……你总坐靠窗的位置。我加了一张桌子。'], en: ['Third version of the design.', '…You always sit by the window. So I added a table there.'] },
          maybe: { zh: ['方案改到第三版了。', '……靠窗那张桌子，我一直没删。不知道为什么。'], en: ['Third version of the design.', '…I never deleted the table by the window. Not sure why.'] },
        },
        nodes: {
          go: [
            { label: { zh: '给我看看', en: 'Let me see' }, aff: 50, reply: { zh: ['……嗯。', '明天带图纸去图书馆，好不好？老位置。'], en: ['…Mm.', 'Shall I bring the drawings to the library tomorrow? Our usual seat.'] },
              memory: { zh: '他在方案里，靠窗留了一张桌子。', en: 'He kept a table by the window in his design.' } },
            { label: { zh: '为什么加桌子', en: 'Why the table?' }, aff: 50, reply: { zh: ['……因为那里的光好。', '也因为，你会坐在那。'], en: ['…The light is good there.', 'And because you’d sit there.'] },
              memory: { zh: '他在方案里，靠窗留了一张桌子。', en: 'He kept a table by the window in his design.' } },
          ],
          maybe: [
            { label: { zh: '给我看看', en: 'Let me see' }, aff: 50, reply: { zh: ['……嗯。', '明天带图纸去图书馆，好不好？老位置。'], en: ['…Mm.', 'Shall I bring the drawings to the library tomorrow? Our usual seat.'] },
              memory: { zh: '他在方案里，靠窗留了一张桌子。', en: 'He kept a table by the window in his design.' } },
            { label: { zh: '为什么不删', en: 'Why keep it?' }, aff: 50, reply: { zh: ['……那里的光好。', '……也可能，是在等谁。'], en: ['…The light is good there.', '…Or maybe it’s waiting for someone.'] },
              memory: { zh: '他在方案里，靠窗留了一张桌子。', en: 'He kept a table by the window in his design.' } },
          ],
        } },
      { id: 'confess', day: 9, sticky: true,
        first: { zh: ['我画过很多扇窗。', '以前都是为了光。', '……最近画的每一扇，都在想你会不会站在那。'], en: ['I’ve drawn a lot of windows.', 'They used to be about the light.', '…Lately, with every one I draw, I wonder if you’d be standing there.'] },
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
  // Ji Yu and Lin You are added later from Discover; they open the same way, with their own story beats.
  jiyu: {
    minutesAgo: 1,
    voice: true,
    who: { zh: '季屿', en: 'Ji Yu' },
    first: {
      zh: ['昨晚扫了乐队二维码的人里，第一排那个没跟着唱的。', '是你吧。', '……不喜欢那首？'],
      en: ['Of everyone who scanned the band’s QR code last night, the one in the front row who didn’t sing along.', 'That was you, right?', '…Didn’t like that song?'],
    },
    nodes: {
      root: [
        { label: { zh: '我在听歌词', en: 'Listening to the words' },
          reply: { zh: ['哦。', '那首是我写的词。……行吧，算你有眼光。'], en: ['Oh.', 'I wrote those lyrics. …Fine, guess you’ve got taste.'] } },
        { label: { zh: '你怎么知道是我？', en: 'How’d you know?' },
          reply: { zh: ['啧。第一排就那么几个人。', '你还站在灯底下。很难不看到好吗。'], en: ['Tch. There are like five people in the front row.', 'And you were standing right under the light. Kind of hard to miss.'] } },
      ],
    },
    memory: { zh: '你站在他演出的第一排，没有跟着唱。', en: 'You stood in the front row at his gig and didn’t sing along.' },
    note: { zh: '你站在他演出的第一排，没有跟着唱', en: 'you stood in the front row at his gig and didn’t sing along' },
    scene: 'You have only just started talking. Last night the user stood in the front row at your gig and was the only one not singing along; they scanned the band’s QR code afterwards, so you found them and messaged them, a little defensive about it. Do not act as if you already know each other well.',
    beats: [
      { id: 'invite', day: 3,
        first: { zh: ['哦，你来了。', '新歌写完了，缺个听众。', '……你不是爱听歌词吗？这周末来排练室，第一个听。'], en: ['Oh. You.', 'Finished a new song. Need someone to hear it.', '…You’re into lyrics, right? Come by the rehearsal room this weekend. You’re first.'] },
        nodes: { root: [
          { label: { zh: '去！', en: 'I’m in!' }, choice: 'go', aff: 25,
            reply: { zh: ['哦。', '……别迟到。迟到我也会等，但会骂你。'], en: ['K.', '…Don’t be late. I’ll wait anyway, but I’ll complain.'] },
            memory: { zh: '你答应这周末去排练室，第一个听他的新歌。', en: 'You said you’d come to the rehearsal room this weekend and hear his new song first.' } },
          { label: { zh: '我考虑一下', en: 'Let me think about it' }, choice: 'maybe', aff: 25,
            reply: { zh: ['行吧。', '想来就来。门不锁。'], en: ['Fine.', 'Come if you want. Door’s unlocked.'] },
            memory: { zh: '他约你去排练室听新歌，你说考虑一下。', en: 'He invited you to the rehearsal room to hear his new song; you said you’d think about it.' } },
        ] } },
      { id: 'lyric', day: 5, after: 'invite',
        firstBy: {
          go: { zh: ['那天你听完，一句话都没说。', '……副歌那句，我改了。'], en: ['You didn’t say a word after you heard it.', '…I changed a line in the chorus.'] },
          maybe: { zh: ['那首新歌，你还没听。', '……副歌那句，我先改了。'], en: ['You still haven’t heard the new song.', '…I already changed a line in the chorus.'] },
        },
        nodes: {
          go: [
            { label: { zh: '改成什么了？', en: 'Changed it to what?' }, aff: 50, reply: { zh: ['啧，不告诉你。', '……反正跟第一排有关。'], en: ['Tch. Not telling.', '…Let’s just say it’s about the front row.'] },
              memory: { zh: '他把新歌副歌改了一句，不肯告诉你改成了什么。', en: 'He changed a line in the chorus of his new song and won’t tell you what it says.' } },
            { label: { zh: '我想再听一遍', en: 'Play it again for me' }, aff: 50, reply: { zh: ['……哦。', '下次演出，你站第一排。我唱给你听。'], en: ['…K.', 'Next gig, you stand in the front row. I’ll sing it to you.'] },
              memory: { zh: '他把新歌副歌改了一句，不肯告诉你改成了什么。', en: 'He changed a line in the chorus of his new song and won’t tell you what it says.' } },
          ],
          maybe: [
            { label: { zh: '改成什么了？', en: 'Changed it to what?' }, aff: 50, reply: { zh: ['啧，不告诉你。', '……反正跟第一排有关。'], en: ['Tch. Not telling.', '…Let’s just say it’s about the front row.'] },
              memory: { zh: '他把新歌副歌改了一句，不肯告诉你改成了什么。', en: 'He changed a line in the chorus of his new song and won’t tell you what it says.' } },
            { label: { zh: '下次我一定去', en: 'I’ll come next time' }, aff: 50, reply: { zh: ['……哦。', '那首我先不唱，留到你来。'], en: ['…K.', 'Then I won’t play it yet. I’ll save it for when you come.'] },
              memory: { zh: '他把新歌副歌改了一句，不肯告诉你改成了什么。', en: 'He changed a line in the chorus of his new song and won’t tell you what it says.' } },
          ],
        } },
      { id: 'confess', day: 9, sticky: true,
        first: { zh: ['……只说一遍。', '新歌副歌改的那句，是写给你的。', '听懂了吗？不许笑。'], en: ['…I’m only saying this once.', 'The line I changed in the chorus was written for you.', 'Got it? Don’t laugh.'] },
        nodes: { root: [
          { label: { zh: '我也是', en: 'Me too' }, effect: 'accept',
            reply: { zh: ['……哦。', '行了吧。以后每场演出，第一排都是你的。'], en: ['…Oh.', 'There. From now on, the front row is yours. Every gig.'] },
            memory: { zh: '他说，新歌副歌改的那句是写给你的。你说，你也是。', en: 'He said the line he changed in the chorus was written for you. You said you feel the same.' } },
          { label: { zh: '……再说吧', en: '…Let’s see' }, effect: 'deflect',
            reply: { zh: ['啧。', '……行。那首歌我先不唱，等你想好。'], en: ['Tch.', '…Fine. I won’t play that song till you’ve made up your mind.'] },
            memory: { zh: '他说，新歌副歌改的那句是写给你的。你说，再说吧。', en: 'He said the line he changed in the chorus was written for you. You said, let’s see.' } },
        ] } },
    ],
  },

  linyou: {
    minutesAgo: 1,
    who: { zh: '林柚', en: 'Lin You' },
    first: {
      zh: ['抱歉！刚才在河边拍日落，你走进画面里了～', '拍得太好看了……要不要看看？你不喜欢的话，我就删掉～'],
      en: ['Sorry! I was shooting the sunset by the river and you walked into the frame～', 'It came out so good… want to see? If you’d rather I didn’t keep it, I’ll delete it～'],
    },
    nodes: {
      root: [
        { label: { zh: '给我看看', en: 'Show me' },
          reply: { zh: ['等一下！我先调个色～', '……好了，就这张。光正好落在你侧脸上。', '你常来河边吗？'], en: ['Wait! Let me fix the colours first～', '…Okay, this one. The light landed right on the side of your face.', 'Do you come to the river often?'] } },
        { label: { zh: '你偷拍我？', en: 'You took my photo?' },
          reply: { zh: ['不是不是！是你自己走进来的！', '……好吧，我按了三次快门。嘿嘿，因为真的很好看。'], en: ['No no no! You walked into it!', '…Okay, I pressed the shutter three times. Hehe, because it really was that good.'] } },
      ],
    },
    memory: { zh: '他在河边拍日落时，你走进了他的画面。', en: 'You walked into his frame while he was shooting the sunset by the river.' },
    note: { zh: '你走进了他拍日落的画面', en: 'you walked into his sunset shot' },
    scene: 'You have only just started talking. While you were shooting the sunset by the river, the user walked into your frame; you messaged to share the photo and offered to delete it if they mind. Do not act as if you already know each other well.',
    beats: [
      { id: 'invite', day: 3,
        first: { zh: ['嘿嘿，你来啦！今天的光超好看～', '我的人像作业还缺一个模特……', '这周末早上，河边，就是拍日落那里。你愿意来吗？'], en: ['Hehe, you’re here! The light is gorgeous today～', 'My portrait assignment still needs a model…', 'This weekend, early morning, by the river where I shot the sunset. Would you come?'] },
        nodes: { root: [
          { label: { zh: '好呀', en: 'Sure!' }, choice: 'go', aff: 25,
            reply: { zh: ['真的吗！！', '那这卷胶片都留给你～早上六点半，不要忘了哦！'], en: ['Really?!', 'Then I’m saving the whole roll for you～ Six thirty in the morning, don’t forget!'] },
            memory: { zh: '你答应这周末早上去河边，给他的人像作业当模特。', en: 'You agreed to model for his portrait assignment by the river one morning this weekend.' } },
          { label: { zh: '我怕拍不好', en: 'I’m not photogenic' }, choice: 'maybe', aff: 25,
            reply: { zh: ['不会的！上次那张就很好看～', '那先不拍你，来河边看我拍，好不好？'], en: ['No way! That last one was lovely～', 'Okay, no photos of you. Just come watch me shoot by the river?'] },
            memory: { zh: '他想请你给人像作业当模特，你说怕拍不好。', en: 'He asked you to model for his portrait assignment; you said you’re not photogenic.' } },
        ] } },
      { id: 'darkroom', day: 5, after: 'invite',
        firstBy: {
          go: { zh: ['今天在暗房把那卷胶片冲出来了！', '……三十六张，有三十张是你。嘿嘿，剩下六张是河。'], en: ['Developed that roll in the darkroom today!', '…Thirty-six shots, and thirty of them are you. Hehe, the other six are the river.'] },
          maybe: { zh: ['今天在暗房冲胶片了～', '……第一次见面那张，我放大洗了出来。不知道为什么，就是想洗。'], en: ['I was in the darkroom developing film today～', '…I made a big print of the photo from the day we met. Don’t know why. I just wanted to.'] },
        },
        nodes: {
          go: [
            { label: { zh: '给我看看', en: 'Show me' }, aff: 50, reply: { zh: ['等一下～我挑一张最好看的！', '……挑不出来。每一张都想给你看。'], en: ['Wait～ let me pick the best one!', '…I can’t. I want to show you every single one.'] },
              memory: { zh: '他冲出来的那卷胶片，三十张是你。', en: 'Thirty shots on the roll he developed are of you.' } },
            { label: { zh: '都是我？', en: 'All of me?' }, aff: 50, reply: { zh: ['嗯！', '你站在光里的时候，我就忘了拍河了。'], en: ['Yep!', 'When you stand in the light, I forget all about the river.'] },
              memory: { zh: '他冲出来的那卷胶片，三十张是你。', en: 'Thirty shots on the roll he developed are of you.' } },
          ],
          maybe: [
            { label: { zh: '给我看看', en: 'Show me' }, aff: 50, reply: { zh: ['嘿嘿，等一下～', '……还是你本人比照片好看。'], en: ['Hehe, wait～', '…You still look better in person than in the photo.'] },
              memory: { zh: '他把第一次见面那张照片放大洗了出来。', en: 'He made a big print of the photo from the day you met.' } },
            { label: { zh: '为什么放大？', en: 'Why print it big?' }, aff: 50, reply: { zh: ['因为……小的看不清你。', '嘿嘿，这个理由可以吗？'], en: ['Because… the small one doesn’t show you properly.', 'Hehe, is that a good enough reason?'] },
              memory: { zh: '他把第一次见面那张照片放大洗了出来。', en: 'He made a big print of the photo from the day you met.' } },
          ],
        } },
      { id: 'confess', day: 9, sticky: true,
        first: { zh: ['那个……我的毕业作品，主题定好了。', '每天拍一张“今天的光”。', '……我想让每一张里，都有你。'], en: ['So… I’ve picked the theme for my graduation project.', 'One photo of “today’s light”, every day.', '…And I want you in every single one.'] },
        nodes: { root: [
          { label: { zh: '我也是', en: 'Me too' }, effect: 'accept',
            reply: { zh: ['诶？！真、真的吗？', '那从今天起，你就是我的模特啦。只是我的～'], en: ['Eh?! R-really?', 'Then from today, you’re my model. Only mine～'] },
            memory: { zh: '他说，毕业作品想每一张都有你。你说，你也是。', en: 'He said he wants you in every photo of his graduation project. You said you feel the same.' } },
          { label: { zh: '……再说吧', en: '…Let’s see' }, effect: 'deflect',
            reply: { zh: ['嗯！不着急～', '那我先拍光。你想好了，再走进画面里就好。'], en: ['Okay! No rush～', 'I’ll shoot the light for now. When you’re ready, just walk into the frame.'] },
            memory: { zh: '他说，毕业作品想每一张都有你。你说，再说吧。', en: 'He said he wants you in every photo of his graduation project. You said, let’s see.' } },
        ] } },
    ],
  },
};
