/*
 * 界面文字（6 种语言）。默认英文；玩家在 Settings → Language 里切换，选择存在 localStorage。
 * 关卡名保持英文（像招牌一样不翻译），每关的提示语按语言显示。
 */
(function (root) {
  'use strict';
  const KEY = 'neonloops-lang';

  const D = {
    en: {
      _name: 'English',
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
        'Three closed rings hold up the tower. Take it apart from the top.',
        'New: bars slide only along their length. Slide one out of its silver sleeve.',
        'Hard: the bar inside the big ring can only slide out through its gap.',
      ],
    },
    ja: {
      _name: '日本語',
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
        '塔を支えるのは3つの閉じたリング。上から崩していこう。',
        '新登場：バーは長さの方向にだけスライド。銀色のスリーブから抜こう。',
        'ハード：大きなリングの中のバーは、すき間からしか抜けません。',
      ],
    },
    ko: {
      _name: '한국어',
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
        '탑은 닫힌 링 세 개가 받치고 있어요. 위에서부터 해체하세요.',
        '새 조각: 막대는 길이 방향으로만 밀려요. 은색 슬리브에서 빼내세요.',
        '어려움: 큰 링 안의 막대는 그 링의 틈으로만 빠져나올 수 있어요.',
      ],
    },
    pt: {
      _name: 'Português',
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
        'Três anéis fechados sustentam a torre. Desmonte de cima para baixo.',
        'Novo: as barras só deslizam no comprimento. Tire uma da luva prateada.',
        'Difícil: a barra dentro do anel grande só sai pela abertura dele.',
      ],
    },
    zh: {
      _name: '中文',
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
        '塔底是三个闭合环，先把塔顶拆掉。',
        '新零件：直杆只能沿自己的方向推拉，滑出银色套筒就自由了。',
        '困难：大环里的直杆只能从大环的缺口滑出去。',
      ],
    },
    ru: {
      _name: 'Русский',
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
        'Башню держат три замкнутых кольца. Разбирайте её сверху.',
        'Новое: стержни скользят только вдоль. Выведите стержень из серебряной втулки.',
        'Сложно: стержень внутри большого кольца выходит только через его разрез.',
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
