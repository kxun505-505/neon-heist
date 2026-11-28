/*
 * 界面文字（6 种语言）。默认英文；玩家在 Settings → Language 里切换，选择存在 localStorage。
 * 关卡名保持英文（像招牌一样不翻译），每关的提示语按语言显示。
 */
(function (root) {
  'use strict';
  const KEY = 'neonloops-lang';

  const D = {
    en: {
      _name: 'English', play: 'Play', viewAll: 'View all',
      newVideo: 'New video unlocked!', newBg: 'New background unlocked!', videoN: 'Video {n}', bgLocked: 'Clear all {n} levels of {c}', progressN: '{a}/{b} cleared', hardVideo: 'Hard level · Video',
      storyToggle: 'Story after each level', newStory: 'New story unlocked!', story: 'Story', episodeN: 'Episode {n}', levelsRange: 'Levels {a}–{b}', storyContinue: 'Continue story', storyPlay: 'Watch', skip: 'Skip', tapNext: 'Tap to continue', storyLocked: 'Clear level {n}', storyNew: 'NEW', album: 'Album', newPhoto: 'New photo unlocked!', tapToView: 'Tap to view', comingSoon: 'Coming soon', unlockAt: 'Clear level {n}', videoLocked: 'Collect all 4 photos', photoN: 'Photo {n}', video: 'Video',
      level: 'LEVEL', hard: 'HARD', settings: 'Settings', music: 'Music', sound: 'Sound', vibration: 'Vibration',
      language: 'Language', home: 'Home', restart: 'Restart', hint: 'Hint', subtitle: 'Sunset Coast · Demo',
      background: 'Background', next: 'Next ›', retry: 'Retry', toLevels: 'Levels', moves: 'Moves: {n}',
      demoDone: 'Demo Complete!', wins: ['Nice!', 'Great!', 'Awesome!', 'Superb!'], musicSoon: 'Music is coming soon',
      how: 'Drag a ring to turn it. Turn its gap onto a clamp to slip it out. When every clamp on a piece is loose, it flies off. Clear the board to win.',
      tipOwner: 'It still holds other rings. Free those first.', tipClosed: 'Closed rings never turn. Free the rings on it.',
      tipBar: 'Bars only slide along their length.', tipHint: 'Follow the hand.', tipDead: 'Dead end. Tap Restart and try again.',
      bgs: ['Sunset Coast', 'Neon City', 'Golden Beach', 'Bayou Dusk'],
      tips: [
        'Drag the ring without a stem. Turn its gap onto the clamp.',
        'A ring that still holds others is locked. Free the rings it holds first.',
        'Closed rings never turn. Knobs on a ring can bump into things.',
        'The bridge in the middle is held from both sides. Pick a side.',
        'Hard: empty clamps left behind can block the way.',
        'Lots of rings. Peel them off from the outside in.',
        'Free the rings at the tips of the branches first. Mind the knobs.',
        'Two closed rings hold up the tower. Take it apart from the top.',
        'New: bars slide only along their length. Slide one out of its silver sleeve.',
        'Hard: work out what blocks what before you move.',
        '', '', // 第 11、12 关没有提示
        'New: a big ring holds pieces inside. They can only leave through its gap.',
      ],
    },
    ja: {
      _name: '日本語', play: 'プレイ', viewAll: 'すべて見る',
      newVideo: '新しいムービーを解放！', newBg: '新しい背景を解放！', videoN: 'ムービー {n}', bgLocked: '{c} の全{n}レベルをクリア', progressN: '{a}/{b} クリア', hardVideo: 'ハード · ムービー',
      storyToggle: 'クリアごとにストーリーを見る', newStory: '新しいストーリーを解放！', story: 'ストーリー', episodeN: '第{n}話', levelsRange: 'レベル {a}–{b}', storyContinue: '続きを見る', storyPlay: '見る', skip: 'スキップ', tapNext: 'タップで次へ', storyLocked: 'レベル{n}をクリア', storyNew: 'NEW', album: 'アルバム', newPhoto: '新しい写真を解放！', tapToView: 'タップで見る', comingSoon: '近日公開', unlockAt: 'レベル{n}をクリア', videoLocked: '写真を4枚集めよう', photoN: '写真 {n}', video: 'ムービー',
      level: 'レベル', hard: 'ハード', settings: '設定', music: '音楽', sound: '効果音', vibration: '振動',
      language: '言語', home: 'ホーム', restart: 'やり直す', hint: 'ヒント', subtitle: 'サンセットコースト · 体験版',
      background: '背景', next: '次へ ›', retry: 'もう一度', toLevels: 'レベル', moves: '操作回数：{n}',
      demoDone: '体験版クリア！', wins: ['ナイス！', 'グレート！', 'すごい！', '最高！'], musicSoon: '音楽は近日追加予定',
      how: 'リングをドラッグして回します。すき間を留め具に合わせると外れます。パーツの留め具がすべて外れると飛んでいきます。全部なくなればクリア。',
      tipOwner: 'まだ他のリングを留めています。先にそちらを外して。', tipClosed: '閉じたリングは回りません。付いているリングを先に外して。',
      tipBar: 'バーは長さの方向にしか動きません。', tipHint: '指の動きをまねしてね。', tipDead: '行き止まりです。「やり直す」で再挑戦。',
      bgs: ['サンセットコースト', 'ネオンシティ', 'ゴールデンビーチ', 'バイユーの夕暮れ'],
      tips: [
        '棒のないリングをドラッグ。すき間を留め具に合わせよう。',
        '他のリングを留めているリングは回せません。先に留められているリングを外そう。',
        '閉じたリングは回りません。リングの突起は他の物にぶつかります。',
        '真ん中の橋は両側から留められています。どちら側から外す？',
        'ハード：残った空の留め具が邪魔をすることがあります。',
        'リングがたくさん。外側から一つずつ外そう。',
        '枝の先のリングから外そう。突起に注意。',
        '塔を支えるのは2つの閉じたリング。上から崩していこう。',
        '新登場：バーは長さの方向にだけスライド。銀色のスリーブから抜こう。',
        'ハード：動かす前に、どれが何をふさいでいるか考えよう。',
        '', '', // 第 11、12 关没有提示
        '新登場：大きなリングの中のパーツは、そのすき間からしか出られません。',
      ],
    },
    ko: {
      _name: '한국어', play: '플레이', viewAll: '전체 보기',
      newVideo: '새 영상 해금!', newBg: '새 배경 해금!', videoN: '영상 {n}', bgLocked: '{c}의 레벨 {n}개를 모두 클리어', progressN: '{a}/{b} 클리어', hardVideo: '어려움 · 영상',
      storyToggle: '레벨마다 스토리 보기', newStory: '새 스토리 해금!', story: '스토리', episodeN: '{n}화', levelsRange: '레벨 {a}–{b}', storyContinue: '이어 보기', storyPlay: '보기', skip: '건너뛰기', tapNext: '탭해서 계속', storyLocked: '레벨 {n} 클리어', storyNew: 'NEW', album: '앨범', newPhoto: '새 사진 해금!', tapToView: '탭해서 보기', comingSoon: '곧 공개', unlockAt: '레벨 {n} 클리어', videoLocked: '사진 4장을 모으세요', photoN: '사진 {n}', video: '영상',
      level: '레벨', hard: '어려움', settings: '설정', music: '음악', sound: '효과음', vibration: '진동',
      language: '언어', home: '홈', restart: '다시 하기', hint: '힌트', subtitle: '선셋 코스트 · 체험판',
      background: '배경', next: '다음 ›', retry: '다시', toLevels: '레벨', moves: '이동 횟수: {n}',
      demoDone: '체험판 클리어!', wins: ['좋아요!', '멋져요!', '대단해요!', '최고예요!'], musicSoon: '음악은 곧 추가됩니다',
      how: '링을 드래그해서 돌리세요. 틈을 고정쇠에 맞추면 빠집니다. 조각의 고정쇠가 모두 풀리면 날아갑니다. 전부 없애면 클리어.',
      tipOwner: '아직 다른 링을 잡고 있어요. 그 링들을 먼저 빼세요.', tipClosed: '닫힌 링은 돌아가지 않아요. 붙어 있는 링을 먼저 빼세요.',
      tipBar: '막대는 길이 방향으로만 움직여요.', tipHint: '손가락을 따라 해 보세요.', tipDead: '막다른 길이에요. 다시 하기를 눌러 주세요.',
      bgs: ['선셋 코스트', '네온 시티', '골든 비치', '늪지의 황혼'],
      tips: [
        '막대가 없는 링을 드래그해서 틈을 고정쇠에 맞추세요.',
        '다른 링을 잡고 있는 링은 돌릴 수 없어요. 잡혀 있는 링부터 빼세요.',
        '닫힌 링은 돌아가지 않아요. 링의 돌기는 다른 것에 부딪혀요.',
        '가운데 다리는 양쪽에서 잡혀 있어요. 어느 쪽부터 풀까요?',
        '어려움: 남은 빈 고정쇠가 길을 막을 수 있어요.',
        '링이 많아요. 바깥쪽부터 하나씩 빼세요.',
        '가지 끝의 링부터 빼세요. 돌기를 조심하세요.',
        '탑은 닫힌 링 두 개가 받치고 있어요. 위에서부터 해체하세요.',
        '새 조각: 막대는 길이 방향으로만 밀려요. 은색 슬리브에서 빼내세요.',
        '어려움: 움직이기 전에 무엇이 무엇을 막는지 먼저 살펴보세요.',
        '', '', // 第 11、12 关没有提示
        '새 조각: 큰 링 안의 조각은 그 링의 틈으로만 나갈 수 있어요.',
      ],
    },
    pt: {
      _name: 'Português', play: 'Jogar', viewAll: 'Ver tudo',
      newVideo: 'Novo vídeo desbloqueado!', newBg: 'Novo fundo desbloqueado!', videoN: 'Vídeo {n}', bgLocked: 'Vença os {n} níveis de {c}', progressN: '{a}/{b} vencidos', hardVideo: 'Difícil · Vídeo',
      storyToggle: 'História após cada nível', newStory: 'Nova história desbloqueada!', story: 'História', episodeN: 'Episódio {n}', levelsRange: 'Níveis {a}–{b}', storyContinue: 'Continuar história', storyPlay: 'Assistir', skip: 'Pular', tapNext: 'Toque para continuar', storyLocked: 'Vença o nível {n}', storyNew: 'NOVO', album: 'Álbum', newPhoto: 'Nova foto desbloqueada!', tapToView: 'Toque para ver', comingSoon: 'Em breve', unlockAt: 'Vença o nível {n}', videoLocked: 'Junte as 4 fotos', photoN: 'Foto {n}', video: 'Vídeo',
      level: 'NÍVEL', hard: 'DIFÍCIL', settings: 'Configurações', music: 'Música', sound: 'Som', vibration: 'Vibração',
      language: 'Idioma', home: 'Início', restart: 'Reiniciar', hint: 'Dica', subtitle: 'Costa do Pôr do Sol · Demo',
      background: 'Fundo', next: 'Próximo ›', retry: 'Repetir', toLevels: 'Níveis', moves: 'Movimentos: {n}',
      demoDone: 'Demo concluída!', wins: ['Boa!', 'Ótimo!', 'Incrível!', 'Perfeito!'], musicSoon: 'Música em breve',
      how: 'Arraste um anel para girá-lo. Leve a abertura até a presilha para soltá-lo. Quando todas as presilhas de uma peça soltam, ela sai voando. Limpe o tabuleiro para vencer.',
      tipOwner: 'Ele ainda prende outros anéis. Solte-os primeiro.', tipClosed: 'Anéis fechados não giram. Solte os anéis presos nele.',
      tipBar: 'As barras só deslizam no sentido do comprimento.', tipHint: 'Siga a mão.', tipDead: 'Sem saída. Toque em Reiniciar e tente de novo.',
      bgs: ['Costa do Pôr do Sol', 'Cidade Neon', 'Praia Dourada', 'Pântano ao Anoitecer'],
      tips: [
        'Arraste o anel sem haste. Leve a abertura até a presilha.',
        'Um anel que ainda prende outros fica travado. Solte primeiro os anéis que ele prende.',
        'Anéis fechados não giram. Os pinos de um anel podem bater em outras peças.',
        'A ponte do meio está presa dos dois lados. Escolha um lado.',
        'Difícil: presilhas vazias que ficam para trás podem bloquear o caminho.',
        'Muitos anéis. Tire-os de fora para dentro.',
        'Solte primeiro os anéis nas pontas dos galhos. Cuidado com os pinos.',
        'Dois anéis fechados sustentam a torre. Desmonte de cima para baixo.',
        'Novo: as barras só deslizam no comprimento. Tire uma da luva prateada.',
        'Difícil: veja o que bloqueia o quê antes de mexer.',
        '', '', // 第 11、12 关没有提示
        'Novo: peças dentro do anel grande só saem pela abertura dele.',
      ],
    },
    zh: {
      _name: '中文', play: '开始', viewAll: '查看全部',
      newVideo: '解锁了新视频！', newBg: '解锁了新背景！', videoN: '视频 {n}', bgLocked: '通关 {c} 全部 {n} 关解锁', progressN: '已通关 {a}/{b}', hardVideo: '困难关 · 视频',
      storyToggle: '每关后看剧情', newStory: '解锁了新剧情！', story: '剧情', episodeN: '第 {n} 集', levelsRange: '第 {a}–{b} 关', storyContinue: '继续看剧情', storyPlay: '观看', skip: '跳过', tapNext: '点击继续', storyLocked: '通关第 {n} 关', storyNew: '新', album: '相册', newPhoto: '解锁了新照片！', tapToView: '点击查看', comingSoon: '即将上线', unlockAt: '通关第 {n} 关', videoLocked: '集齐 4 张照片解锁', photoN: '照片 {n}', video: '视频',
      level: '关卡', hard: '困难', settings: '设置', music: '音乐', sound: '音效', vibration: '震动',
      language: '语言', home: '主页', restart: '重来', hint: '提示', subtitle: '日落海岸 · 试玩版',
      background: '背景', next: '下一关 ›', retry: '重玩', toLevels: '关卡', moves: '拖动 {n} 次',
      demoDone: '试玩通关！', wins: ['漂亮！', '厉害！', '太强了！', '完美！'], musicSoon: '音乐即将上线',
      how: '拖动圆环让它转动，把缺口转到夹套处就能脱开。一个零件身上的夹套全部脱开时，它就会飞走。清空棋盘即过关。',
      tipOwner: '它还扣着别的环，先把被扣住的环转出来。', tipClosed: '闭合的环转不动，先把扣在它身上的环拿掉。',
      tipBar: '直杆只能沿着自己的方向推拉。', tipHint: '跟着手指做。', tipDead: '走进死胡同了，点“重来”再试试。',
      bgs: ['日落海岸', '霓虹夜城', '金色海滩', '湿地暮色'],
      tips: [
        '拖动没有伸出杆子的环，把缺口转到夹套处。',
        '还扣着别人的环转不动，先转开被它扣住的环。',
        '闭合环转不动；凸出的短杆会撞到别的东西。',
        '中间的桥被两边扣住，想想先拆哪一边。',
        '困难：留下的空夹套也会挡路。',
        '环很多，从最外圈一个个拆。',
        '树枝末端的环先走，凸钉别撞上。',
        '塔底是两个闭合环，先把塔顶拆掉。',
        '新零件：直杆只能沿自己的方向推拉，滑出银色套筒就自由了。',
        '困难：先看清谁挡着谁，再动手。',
        '', '', // 第 11、12 关没有提示
        '新零件：大环里的零件只能从大环的缺口出去。',
      ],
    },
    ru: {
      _name: 'Русский', play: 'Играть', viewAll: 'Смотреть все',
      newVideo: 'Новое видео открыто!', newBg: 'Новый фон открыт!', videoN: 'Видео {n}', bgLocked: 'Пройдите все {n} уровней {c}', progressN: 'Пройдено {a}/{b}', hardVideo: 'Сложно · Видео',
      storyToggle: 'Сюжет после каждого уровня', newStory: 'Открыта новая история!', story: 'Сюжет', episodeN: 'Эпизод {n}', levelsRange: 'Уровни {a}–{b}', storyContinue: 'Продолжить сюжет', storyPlay: 'Смотреть', skip: 'Пропустить', tapNext: 'Нажмите, чтобы продолжить', storyLocked: 'Пройдите уровень {n}', storyNew: 'НОВОЕ', album: 'Альбом', newPhoto: 'Новое фото открыто!', tapToView: 'Нажмите, чтобы посмотреть', comingSoon: 'Скоро', unlockAt: 'Пройдите уровень {n}', videoLocked: 'Соберите все 4 фото', photoN: 'Фото {n}', video: 'Видео',
      level: 'УРОВЕНЬ', hard: 'СЛОЖНО', settings: 'Настройки', music: 'Музыка', sound: 'Звук', vibration: 'Вибрация',
      language: 'Язык', home: 'Главная', restart: 'Заново', hint: 'Подсказка', subtitle: 'Закатный берег · Демо',
      background: 'Фон', next: 'Далее ›', retry: 'Ещё раз', toLevels: 'Уровни', moves: 'Ходов: {n}',
      demoDone: 'Демо пройдено!', wins: ['Отлично!', 'Здорово!', 'Супер!', 'Блестяще!'], musicSoon: 'Музыка скоро появится',
      how: 'Тяните кольцо, чтобы повернуть его. Подведите разрез к зажиму, и кольцо выскользнет. Когда все зажимы детали свободны, она улетает. Очистите поле, чтобы победить.',
      tipOwner: 'Оно ещё держит другие кольца. Сначала освободите их.', tipClosed: 'Замкнутые кольца не вращаются. Снимите кольца с него.',
      tipBar: 'Стержни двигаются только вдоль своей длины.', tipHint: 'Повторяйте за рукой.', tipDead: 'Тупик. Нажмите «Заново» и попробуйте ещё раз.',
      bgs: ['Закатный берег', 'Неоновый город', 'Золотой пляж', 'Сумерки на болоте'],
      tips: [
        'Тяните кольцо без стержня. Подведите разрез к зажиму.',
        'Кольцо, которое держит другие, заблокировано. Сначала освободите те, что оно держит.',
        'Замкнутые кольца не вращаются. Выступы на кольце могут упираться в другие детали.',
        'Мост посередине держат с двух сторон. Выберите сторону.',
        'Сложно: оставшиеся пустые зажимы могут мешать.',
        'Колец много. Снимайте их снаружи внутрь.',
        'Сначала освободите кольца на концах веток. Осторожно с выступами.',
        'Башню держат два замкнутых кольца. Разбирайте её сверху.',
        'Новое: стержни скользят только вдоль. Выведите стержень из серебряной втулки.',
        'Сложно: сначала поймите, что чему мешает, потом двигайте.',
        '', '', // 第 11、12 关没有提示
        'Новое: детали внутри большого кольца выходят только через его разрез.',
      ],
    },
  };
  const ORDER = ['en', 'ja', 'ko', 'pt', 'zh', 'ru'];
  let lang = localStorage.getItem(KEY);
  if (!D[lang]) lang = 'en';

  function t(key, vars) {
    let v = D[lang][key];
    if (v == null) v = D.en[key];
    if (typeof v === 'string' && vars) v = v.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
    return v;
  }

  // 把页面上带 data-i18n 的元素换成当前语言
  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  }

  root.RRI18n = {
    t, apply, ORDER,
    get lang() { return lang; },
    name: (code) => D[code]._name,
    set(code) {
      if (!D[code]) return;
      lang = code;
      try { localStorage.setItem(KEY, code); } catch (e) { /* 隐私模式 */ }
      apply();
    },
  };
})(window);
