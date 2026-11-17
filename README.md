# 悄悄话 Whisper

**AI 陪伴玩具的配套 App · Companion app for the AI Companion Toy**

▶ 在线体验 / Live demo: **https://weizhao-design.github.io/whisper-companion/**

**放进作品集：** 电脑上打开会自动显示成 iPhone 15 Pro 的样子（393 × 852，带灵动岛和状态栏）。嵌入网页时加 `?embed=1` 让背景透明，例如：

```html
<iframe src="https://weizhao-design.github.io/whisper-companion/?embed=1" style="width:100%;height:900px;border:0" allow="microphone; camera"></iframe>
```

用手机打开，点浏览器的"分享 → 添加到主屏幕"，就能像真正的 App 一样全屏使用。
Open it on your phone and use "Add to Home Screen" to run it full-screen like a native app.

---

## 这是什么

一个像微信一样的聊天 App，但聊天对象是有性格、会记住你说过的话的虚拟角色，并且和桌上的心形 AI 陪伴玩具连在一起。

- **消息**：多角色会话列表，全局搜索聊天记录
- **聊天**：文字、按住说话（上滑取消、右滑转文字）、他用语音回复、拍照或相册发图给他看、照顾和送礼物
- **角色**：我的角色（关系阶段、"他现在在做什么"）、发现新角色（先试听声音再添加）、角色主页
- **玩具**：连接引导、实时镜像（玩具圆屏上此刻的表情：待机 / 聆听 / 思考 / 说话）、在 App 里模拟按住玩具按钮说话
- **我**：换头像（他会注意到并聊起来）、全英文模式、日间粉 / 夜间配色、回复语言跟随你的消息

角色全部原创：温叙（建筑师）、程朔（急诊科医生）、季屿（乐队主唱）、林柚（摄影系学生）。每个角色有自己的说话规则、关系阶段事件、专属称呼和作息；开会、值班、演出时回得慢、回得短。

## What it is

All characters are original: Wen Xu (architect), Cheng Shuo (ER doctor), Ji Yu (band vocalist) and Lin You (photography student). Each has his own speech rules, stage-up lines, a nickname for you and a daily schedule; in meetings, on shift or on stage he replies late and short.

A WeChat-style messenger where the contacts are virtual characters with personalities and memory, linked to a heart-shaped AI companion toy on your desk. Fully bilingual (中文 / English): switch the whole app in Me → Language, and he replies in whichever language you write or speak in.

## 两种回复模式 · Two reply engines

| 模式 | 说明 |
|---|---|
| 演示模式（默认）| 内置每个角色的台词，按关系阶段从冷淡到亲密变化，会记住你的名字和喜好。不需要任何账号，离线可用。 |
| 真实 AI | 在"我 → AI 连接"里填入你自己的 Anthropic API Key，改用 Claude（`claude-opus-5-5`）实时回复，并能看懂你发的照片和头像。Key 只保存在你这台设备的浏览器里。 |

## 技术 · Tech

- 纯 HTML / CSS / JavaScript（ES modules），无需构建，托管在 GitHub Pages
- PWA：manifest + service worker，可安装到主屏幕、离线打开
- 语音：Web Speech API 语音转文字，MediaRecorder 保存你的原声，speechSynthesis 朗读他的回复
- 数据只存在本机 `localStorage`，没有服务器

语音转文字取决于浏览器支持：iPhone 上的 Safari 和安卓上的 Chrome 都可以用；不支持时仍可发送语音消息。

## 关于 · About

课程项目（SCAD IXDS 732 物理计算，2026 夏）由 Wei Zhao 与 Xinyue Chen 合作完成心形 AI 陪伴玩具原型。课程结束后，两人各自独立做了一版配套 App。本仓库是 Wei Zhao 独立完成的版本：信息架构、视觉与交互设计，并借助 AI 辅助编程完成前端开发。Xinyue Chen 另有一版她独立完成的 App，不在本仓库中。

Course project (SCAD IXDS 732, Summer 2026) by Wei Zhao and Xinyue Chen. After the course, each of us built our own companion app independently. This repository is Wei Zhao's version: information architecture, visual and interaction design, with the front end built through AI-assisted coding. Xinyue Chen built a separate app of her own, which is not part of this repository.
