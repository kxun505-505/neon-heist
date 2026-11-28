/*
 * 章节：每 20 关一章，每章一个背景、一个陪玩角色。
 * 奖励按 5 关一组循环：前 4 关每关解锁 1 张照片，第 5 关是困难关，解锁 1 段视频。
 * 所以每章 16 张照片 + 4 段视频。背景：通关上一章全部 20 关后，才解锁下一章（和它的背景）。
 * 素材路径为 null 表示还没做，界面会显示 Coming soon。正式图到了，把占位换成 tools/assets.sh 生成的文件。
 */
(function (root) {
  'use strict';
  const PER_CHAPTER = 20, SET = 5; // 5 关一组：4 张照片 + 1 段视频

  root.RRChapters = {
    PER_CHAPTER, SET,
    // 第 n 关（从 0 数）的奖励：{ kind: 'photo' | 'video', i: 在本章里的序号 }
    rewardAt(n) {
      // 有剧情的关卡，奖励是剧情（插画或视频）
      const ch = this.list[Math.floor(n / PER_CHAPTER)];
      if (ch && ch.story && ch.story[n]) return { kind: 'story', i: n };
      const c = n % PER_CHAPTER, set = Math.floor(c / SET), pos = c % SET;
      return pos < SET - 1 ? { kind: 'photo', i: set * (SET - 1) + pos } : { kind: 'video', i: set };
    },
    isHard: (n) => n % SET === SET - 1,
    list: [
      {
        id: 'ch1',
        name: 'SUNSET COAST',
        bg: 0, // 日落海岸
        girl: {
          name: 'Kira Sol',
          side: 'right',
          // 立绘轮廓：10 条等高横带，每条 [左, 右]（占立绘宽度的比例，7 个表情取并集）。棋盘会避开这块地方。
          // 由 tools/assets.sh ch1 算出；换立绘后重新跑一遍，把输出贴到这里。
          mask: [[0.296, 0.598], [0.248, 0.69], [0.184, 0.711], [0.16, 0.779], [0.112, 0.868], [0.091, 0.933], [0.109, 0.952], [0.125, 0.951], [0.126, 0.893], [0.112, 0.811]], // 11-28 加了 smirk、excited 后重算
          expr: {
            idle: 'assets/ch1/girl/idle.webp',
            happy: 'assets/ch1/girl/happy.webp',
            surprised: 'assets/ch1/girl/surprised.webp',
            wink: 'assets/ch1/girl/wink.webp',
            pout: 'assets/ch1/girl/pout.webp',
            thinking: 'assets/ch1/girl/thinking.webp',
            smirk: 'assets/ch1/girl/smirk.webp', // 2 连消（11-28 新加）
            excited: 'assets/ch1/girl/excited.webp', // 4 连消以上（11-28 新加）
            blink: 'assets/ch1/girl/blink.webp', // 可选：没有就不眨眼
          },
          // 台词：英文为原文，其余为翻译。分组对应触发情境。
          lines: {
            greet: {
              en: ["Hey, new face. I'm Kira. Let's see what you've got.", "Sunset's in twenty minutes. Think you can keep up?"],
              ja: ['はじめまして、キラよ。お手並み拝見ね。', '日没まであと20分。ついてこられる？'],
              ko: ['안녕, 처음 보는 얼굴이네. 난 키라야. 실력 좀 볼까?', '해 지기까지 20분. 따라올 수 있겠어?'],
              pt: ['Oi, cara nova. Eu sou a Kira. Mostra do que você é capaz.', 'O pôr do sol é em vinte minutos. Acha que me acompanha?'],
              zh: ['嗨，生面孔。我是 Kira，让我看看你的本事。', '还有二十分钟日落，你跟得上吗？'],
              ru: ['Привет, новенький. Я Кира. Покажи, на что способен.', 'До заката двадцать минут. Успеешь за мной?'],
            },
            stuck: {
              en: ["Taking your sweet time, huh? I'm getting a tan over here.", "Staring at it won't make it fall apart, hotshot.", "Try the one that isn't holding anybody. Trust me.", 'Cute frown. Now turn something.', "Need a hand? I'm right here. Just saying.", 'Even my old convertible starts faster than this.'],
              ja: ['ずいぶんのんびりね。こっちは日焼けしちゃう。', 'にらんでも勝手にはほどけないわよ、エースさん。', '誰もつかんでないリングから試して。信じて。', 'しかめっ面もかわいいけど、そろそろ回して。', '手伝おうか？ すぐ横にいるけど。', '私のオンボロのオープンカーのほうが早く動くわ。'],
              ko: ['느긋하네? 나 여기서 다 타겠어.', '쳐다본다고 저절로 풀리진 않아, 에이스.', '아무것도 안 잡고 있는 링부터 해 봐. 믿어 봐.', '찡그린 얼굴 귀엽네. 이제 좀 돌려 봐.', '도와줄까? 나 바로 옆에 있는데. 그냥 말해 보는 거야.', '내 낡은 오픈카도 이것보단 빨리 출발해.'],
              pt: ['Sem pressa, né? Já estou ficando bronzeada aqui.', 'Ficar encarando não vai desmontar nada, craque.', 'Tenta aquele que não está prendendo ninguém. Confia.', 'Essa careta é fofa. Agora gira alguma coisa.', 'Precisa de uma mão? Estou bem aqui. Só dizendo.', 'Até meu conversível velho arranca mais rápido que isso.'],
              zh: ['慢慢来是吧？我都快晒黑了。', '盯着看它也不会自己散开的，高手。', '试试那个没扣着别人的环，信我。', '皱眉挺可爱的。现在转点什么吧。', '要帮忙吗？我就在这儿。随口一说。', '我那辆老敞篷车启动都比这快。'],
              ru: ['Не торопишься, да? Я тут уже загораю.', 'Если смотреть, само не развалится, ас.', 'Попробуй то кольцо, которое никого не держит. Поверь мне.', 'Милая хмурость. А теперь покрути что-нибудь.', 'Помочь? Я рядом. Просто говорю.', 'Даже мой старый кабриолет заводится быстрее.'],
            },
            combo: {
              en: ['Whoa! Do that again!', 'Okay, okay, I see you!', 'That was hot. The move, I mean.', 'Chain reaction! My kind of player.', 'Keep that energy, sunshine!', "Now we're cruising!"],
              ja: ['わお！ もう一回やって！', 'はいはい、見てたわよ！', '今のアツかった。プレーの話よ。', '連鎖！ 私好みのプレイヤーね。', 'その勢いよ、サンシャイン！', 'これぞクルージング！'],
              ko: ['와! 한 번 더 해 봐!', '좋아, 좋아, 봤어!', '방금 그거 화끈했어. 플레이 말이야.', '연쇄 반응! 내 스타일이야.', '그 기세 유지해, 선샤인!', '이제야 달리는구나!'],
              pt: ['Uau! Faz de novo!', 'Tá bom, tá bom, tô vendo!', 'Isso foi quente. A jogada, digo.', 'Reação em cadeia! Meu tipo de jogador.', 'Mantém essa energia, raio de sol!', 'Agora sim estamos voando!'],
              zh: ['哇！再来一次！', '好好好，看到你了！', '刚才那下真辣。我是说那一手。', '连锁反应！我喜欢的玩家类型。', '保持这股劲，小太阳！', '这才叫兜风！'],
              ru: ['Ого! Сделай так ещё!', 'Ладно, ладно, вижу тебя!', 'Это было горячо. В смысле, ход.', 'Цепная реакция! Мой тип игрока.', 'Держи этот темп, солнышко!', 'Вот теперь мы мчим!'],
            },
            // 2 连（smirk 得意坏笑）
            combo2: {
              en: ['Smooth, boss.', 'Not bad. Keep going.', 'Look at you go.', 'Two in a row? Showing off for me?'],
              ja: ['スムーズね、ボス。', '悪くない。続けて。', 'やるじゃない。', '2連続？ 私にいいとこ見せたいの？'],
              ko: ['깔끔하네, 보스.', '나쁘지 않아. 계속해.', '제법인데?', '두 개 연속? 나한테 자랑하는 거야?'],
              pt: ['Suave, chefe.', 'Nada mal. Continua.', 'Olha só você.', 'Dois seguidos? Se exibindo pra mim?'],
              zh: ['漂亮，boss。', '不赖，继续。', '哟，手挺快。', '连着两个？在我面前显摆？'],
              ru: ['Чисто, босс.', 'Неплохо. Продолжай.', 'Смотри-ка, разогнался.', 'Два подряд? Красуешься передо мной?'],
            },
            // 4 连以上，或一次飞走 2 个以上（excited 兴奋欢呼）
            comboBig: {
              en: ["YES! Now that's a heist!", "Whoa, whoa! Everything's falling apart!", "That's my boss!", "Okay, I'm officially impressed!"],
              ja: ['やった！ これぞ大仕事！', 'わわっ！ 全部ほどけてく！', 'さすが私のボス！', 'オッケー、正式に感心したわ！'],
              ko: ['좋았어! 이게 진짜 한탕이지!', '와, 와! 전부 풀려 나가!', '역시 내 보스야!', '좋아, 이건 인정이다!'],
              pt: ['ISSO! Isso sim é um assalto!', 'Uau, uau! Tá tudo desmontando!', 'Esse é o meu chefe!', 'Tá bom, oficialmente impressionada!'],
              zh: ['太棒了！这才叫干一票！', '哇哇哇！全散了！', '这才是我的 boss！', '好吧，我正式服了！'],
              ru: ['ДА! Вот это налёт!', 'Ого-го! Всё разваливается!', 'Вот это мой босс!', 'Ладно, я официально впечатлена!'],
            },
            // 过关时没用提示、没碰壁（wink）
            clean: {
              en: ['Clean. No noise, no mess. I like it.', 'Not a single wrong move. Who taught you?', 'Smooth as my getaway.'],
              ja: ['きれいね。音も散らかりもなし。好きよ。', '一手も間違えなかった。誰に習ったの？', '私の逃走運転並みにスムーズ。'],
              ko: ['깔끔해. 소리도, 흔적도 없고. 마음에 들어.', '실수 하나 없네. 누구한테 배웠어?', '내 도주 운전만큼 부드러운데.'],
              pt: ['Limpo. Sem barulho, sem bagunça. Gostei.', 'Nenhum movimento errado. Quem te ensinou?', 'Suave como a minha fuga.'],
              zh: ['干净利落，没声没响。我喜欢。', '一步都没错。谁教你的？', '跟我开车跑路一样顺。'],
              ru: ['Чисто. Ни шума, ни следов. Мне нравится.', 'Ни одного лишнего движения. Кто тебя учил?', 'Гладко, как мой отрыв от погони.'],
            },
            // 过关解锁了新剧情（wink）
            story: {
              en: ['Want to see what happens next? Tap Next.', 'Story time, boss.', "Don't skip this part."],
              ja: ['この続き、見たい？ 次へをタップ。', 'ストーリーの時間よ、ボス。', 'ここは飛ばさないで。'],
              ko: ['다음이 궁금해? 다음을 눌러.', '이야기 시간이야, 보스.', '이 부분은 넘기지 마.'],
              pt: ['Quer ver o que acontece? Toque em Próximo.', 'Hora da história, chefe.', 'Não pula essa parte.'],
              zh: ['想知道接下来发生什么？点下一关。', '讲故事时间到了，boss。', '这段可别跳过。'],
              ru: ['Хочешь узнать, что дальше? Жми «Далее».', 'Время истории, босс.', 'Эту часть не пропускай.'],
            },
            clear: {
              en: ['Not bad, rookie. Not bad at all.', 'You make it look easy. I like that.', "Another one? You're spoiling me.", 'Smooth. You owe me a smoothie next round.', "That wink? Yeah, that one's for you.", 'Stick around. It only gets better from here.'],
              ja: ['やるじゃない、ルーキー。', '簡単そうにやるのね。そういうの好き。', 'また？ 甘やかしすぎよ。', 'スムーズね。次はスムージーおごってね。', 'このウインク？ そう、あなたにね。', 'まだ帰らないで。ここからもっと楽しくなるから。'],
              ko: ['나쁘지 않네, 신입. 전혀 나쁘지 않아.', '쉬워 보이게 하네. 그런 거 좋아.', '또 깼어? 나 너무 챙겨 주는 거 아냐?', '깔끔해. 다음 판엔 스무디 한 잔 사.', '이 윙크? 응, 너한테 하는 거야.', '가지 마. 여기서부터 더 재밌어지거든.'],
              pt: ['Nada mal, novato. Nada mal mesmo.', 'Você faz parecer fácil. Gosto disso.', 'Mais uma? Assim você me mima.', 'Liso. Você me deve um smoothie na próxima.', 'Essa piscadinha? É, foi pra você.', 'Fica por aqui. Daqui pra frente só melhora.'],
              zh: ['不赖嘛新手，真不赖。', '你让这看起来很简单。我喜欢。', '又一关？你太宠我了。', '漂亮。下一关你欠我一杯冰沙。', '这个眨眼？对，是给你的。', '别走，后面更精彩。'],
              ru: ['Неплохо, новичок. Совсем неплохо.', 'У тебя всё выглядит легко. Мне нравится.', 'Ещё один? Ты меня балуешь.', 'Гладко. С тебя смузи в следующем раунде.', 'Это подмигивание? Да, оно тебе.', 'Не уходи. Дальше будет только лучше.'],
            },
            photo: {
              en: ["You earned this one. Don't show it to anyone… okay, maybe one person.", 'Snapped this at golden hour. Thought of you.'],
              ja: ['これはご褒美。誰にも見せちゃだめ……まあ、一人くらいならいいか。', 'ゴールデンアワーに撮ったの。あなたのこと思い出して。'],
              ko: ['이건 네가 얻어낸 거야. 아무한테도 보여 주지 마… 음, 한 명 정도는 괜찮아.', '골든아워에 찍었어. 네 생각 나서.'],
              pt: ['Essa você conquistou. Não mostra pra ninguém… tá, talvez pra uma pessoa.', 'Tirei essa no fim de tarde. Lembrei de você.'],
              zh: ['这张是你赢来的。别给别人看……好吧，给一个人看可以。', '黄金时刻拍的，想到你了。'],
              ru: ['Это ты заслужил. Никому не показывай… ну ладно, одному человеку можно.', 'Сняла это на закате. Подумала о тебе.'],
            },
            video: {
              en: ["That one's a whole movie. Go on, press play.", 'Hard level, hot reward. You earned it.'],
              ja: ['今回はムービーよ。さあ、再生して。', 'ハードクリアのご褒美。あなたのものよ。'],
              ko: ['이번엔 영상이야. 어서 재생해 봐.', '어려운 판엔 뜨거운 보상이지. 네 거야.'],
              pt: ['Essa é um filme inteiro. Vai, aperta o play.', 'Nível difícil, recompensa quente. Você mereceu.'],
              zh: ['这次是一段视频。来，点播放。', '困难关，奖励也够热。这是你应得的。'],
              ru: ['Это целое кино. Давай, жми «плей».', 'Сложный уровень — горячая награда. Ты заслужил.'],
            },
            hint: {
              en: ['Psst… watch my finger.', "Fine, I'll help. Just this once.", 'Follow me, sunshine.'],
              ja: ['ねえ……私の指を見て。', 'しょうがないわね、今回だけよ。', 'ついてきて、サンシャイン。'],
              ko: ['쉿… 내 손가락 봐.', '알았어, 도와줄게. 이번만이야.', '따라와, 선샤인.'],
              pt: ['Psiu… olha o meu dedo.', 'Tá bom, eu ajudo. Só desta vez.', 'Me segue, raio de sol.'],
              zh: ['嘘……看我手指。', '好吧，帮你，就这一次。', '跟我来，小太阳。'],
              ru: ['Псст… смотри на мой палец.', 'Ладно, помогу. Только в этот раз.', 'За мной, солнышко.'],
            },
          },
        },
        // 16 张照片：第 1-4、6-9、11-14、16-19 关；4 段视频：第 5、10、15、20 关（困难关）
        // 照片 1-8 和视频 1-2 先用占位，其余还没做（显示 Coming soon）
        photos: [1, 2, 3, 4, 5, 6, 7, 8].map((k) => 'assets/ch1/photo' + k + '.svg').concat(Array(8).fill(null)),
        videos: ['assets/ch1/video1.mp4', 'assets/ch1/video2.mp4', null, null],
        /*
         * 剧情（docs/story.md）：键是全局关卡序号（从 0 数）。普通关 pages（1-2 页插画），困难关 video。
         * 气泡由游戏叠加：who 是说话的人（决定尾巴方向），at 是位置：tr 右上、tl 左上、bl 左下、br 右下、c 中间（贴在物件上的字，没有尾巴）。
         * 插画到了之前用占位图（.svg），换成 tools/assets.sh 转出来的 .webp 即可。video 为 null 时播放 poster 占位画面。
         */
        story: {
          // 第 1 环（docs/story.md v2）：P1 闪前（五周后的甲板）→ P2 当众羞辱 → P3 码头开锁 → P4 箱子里是他的通缉照
          0: { pages: [{ img: 'assets/ch1/story/p01.webp', bubbles: [
            { who: 'heels', at: 'tr', en: 'Long time no see, Ghost.', ja: '久しぶりね、Ghost。', ko: '오랜만이야, Ghost.', pt: 'Quanto tempo, Ghost.', zh: '好久不见，Ghost。', ru: 'Давно не виделись, Ghost.' },
            { who: 'nico', at: 'bl', en: '…You.', ja: '……お前か。', ko: '……너였군.', pt: '…Você.', zh: '……是你。', ru: '…Ты.' },
            { who: 'caption', at: 'c', en: 'FIVE WEEKS EARLIER', ja: '5週間前', ko: '5주 전', pt: 'CINCO SEMANAS ANTES', zh: '五周前', ru: 'ПЯТЬЮ НЕДЕЛЯМИ РАНЕЕ' },
          ] }] },
          1: { pages: [{ img: 'assets/ch1/story/p02.webp', bubbles: [
            { who: 'dorian', at: 'tr', en: 'Clean it up. Then get out.', ja: '拭いとけ。それから消えろ。', ko: '닦아. 그리고 꺼져.', pt: 'Limpa isso. Depois some daqui.', zh: '擦干净，然后滚。', ru: 'Вытри. И проваливай.' },
            { who: 'nico', at: 'bl', en: "Spill one more and you'll pay for the whole bar.", ja: 'もう一杯こぼしたら、店ごと弁償してもらう。', ko: '한 잔만 더 쏟아 봐. 이 바 전부 물어내게 될 거야.', pt: 'Derrama mais um e você paga o bar inteiro.', zh: '再泼一杯，整间酒吧你都得赔。', ru: 'Прольёшь ещё один — заплатишь за весь бар.' },
            { who: 'kira', at: 'tr', en: "I don't need a hero.", ja: 'ヒーローなんていらない。', ko: '영웅 따윈 필요 없어.', pt: 'Eu não preciso de herói.', zh: '我不需要英雄。', ru: 'Мне не нужен герой.' },
          ] }] },
          2: { pages: [{ img: 'assets/ch1/story/p03.webp', bubbles: [
            { who: 'kira', at: 'tr', en: "Ten seconds, hotshot. Or I'm gone.", ja: '10秒よ、エースさん。でなきゃ帰る。', ko: '10초야, 에이스. 아니면 난 간다.', pt: 'Dez segundos, craque. Ou eu sumo.', zh: '十秒，高手。不然我走人。', ru: 'Десять секунд, ас. Или я ухожу.' },
            { who: 'nico', at: 'bl', en: 'Eight.', ja: '8秒で十分だ。', ko: '8초면 돼.', pt: 'Oito.', zh: '八秒就够。', ru: 'Восемь.' },
          ] }] },
          3: { pages: [{ img: 'assets/ch1/story/p04.webp', bubbles: [
            { who: 'note', at: 'c', en: 'GHOST', ja: 'GHOST', ko: 'GHOST', pt: 'GHOST', zh: 'GHOST', ru: 'GHOST' },
            { who: 'kira', at: 'tr', en: 'I know who you are.', ja: 'あなたが誰か知ってる。', ko: '네가 누군지 알아.', pt: 'Eu sei quem você é.', zh: '我知道你是谁。', ru: 'Я знаю, кто ты.' },
            { who: 'kira', at: 'tr', en: "Dorian's safe. His party. Fifty-fifty.", ja: 'ドリアンの金庫。彼のパーティー。山分けよ。', ko: '도리언의 금고. 그의 파티. 반반.', pt: 'O cofre do Dorian. A festa dele. Meio a meio.', zh: 'Dorian 的保险柜，他的派对，五五分。', ru: 'Сейф Дориана. Его вечеринка. Пополам.' },
            { who: 'nico', at: 'bl', en: "…Who's that?", ja: '……あれは誰だ？', ko: '……저건 누구지?', pt: '…Quem é aquele?', zh: '……那是谁？', ru: '…А это кто?' },
          ] }] },
          4: { video: 'assets/ch1/story/v01.mp4', poster: 'assets/ch1/story/v01-poster.jpg' },
        },
      },
      // 后面几章还没做关卡和角色，先占位：界面上显示为锁住的章节和背景
      {
        id: 'ch2',
        name: 'NEON CITY',
        bg: 1, // 霓虹城市
        // 第 2 章陪玩角色：占位（正式立绘和设定还没做）。轮廓先用第 1 章的，关卡就是按它避让生成的
        girl: {
          name: 'Coming soon',
          side: 'right',
          mask: [[0.296, 0.581], [0.248, 0.69], [0.184, 0.707], [0.16, 0.721], [0.112, 0.804], [0.091, 0.898], [0.109, 0.952], [0.125, 0.951], [0.126, 0.893], [0.112, 0.811]],
          expr: ['idle', 'happy', 'surprised', 'wink', 'pout', 'thinking', 'blink'].reduce((o, e) => { o[e] = 'assets/ch2/girl/' + e + '.svg'; return o; }, {}),
          lines: {
            greet: {
              en: ['Welcome to the city. Lights are on, let\'s play.'], ja: ['街へようこそ。ネオンが点いたわ、始めよう。'], ko: ['도시에 온 걸 환영해. 불 켜졌어, 시작하자.'],
              pt: ['Bem-vindo à cidade. As luzes acenderam, vamos jogar.'], zh: ['欢迎来到霓虹城，灯亮了，开始吧。'], ru: ['Добро пожаловать в город. Огни горят, играем.'],
            },
            stuck: {
              en: ['Take a breath. Which one is really free?'], ja: ['深呼吸。本当に動けるのはどれ？'], ko: ['숨 한번 쉬고. 진짜 풀린 건 뭘까?'],
              pt: ['Respira. Qual está livre de verdade?'], zh: ['深呼吸，哪个才是真正能动的？'], ru: ['Выдохни. Какое кольцо по-настоящему свободно?'],
            },
            combo: { en: ['Smooth!'], ja: ['なめらか！'], ko: ['깔끔해!'], pt: ['Suave!'], zh: ['漂亮！'], ru: ['Чисто!'] },
            clear: { en: ['City lights, cleared.'], ja: ['街の灯り、クリア。'], ko: ['도시 불빛, 클리어.'], pt: ['Luzes da cidade, limpas.'], zh: ['霓虹，搞定。'], ru: ['Огни города — пройдено.'] },
            photo: { en: ['New photo unlocked.'], ja: ['新しい写真が解放されたよ。'], ko: ['새 사진이 열렸어.'], pt: ['Nova foto liberada.'], zh: ['解锁了一张新照片。'], ru: ['Новое фото открыто.'] },
            video: { en: ['New video unlocked.'], ja: ['新しい動画が解放されたよ。'], ko: ['새 영상이 열렸어.'], pt: ['Novo vídeo liberado.'], zh: ['解锁了一段新视频。'], ru: ['Новое видео открыто.'] },
            hint: { en: ['Here, watch.'], ja: ['ほら、見てて。'], ko: ['자, 봐봐.'], pt: ['Olha aqui.'], zh: ['看这里。'], ru: ['Смотри.'] },
          },
        },
        // 占位图：照片 1-16（第 21-24、26-29、31-34、36-39 关）；视频还没做
        photos: Array.from({ length: 16 }, (_, k) => 'assets/ch2/photo' + (k + 1) + '.svg'),
        videos: Array(4).fill(null),
      },
      { id: 'ch3', name: 'GOLDEN BEACH', bg: 2, girl: null, photos: Array(16).fill(null), videos: Array(4).fill(null) },
      { id: 'ch4', name: 'BAYOU DUSK', bg: 3, girl: null, photos: Array(16).fill(null), videos: Array(4).fill(null) },
    ],
  };
})(typeof window !== 'undefined' ? window : globalThis);
