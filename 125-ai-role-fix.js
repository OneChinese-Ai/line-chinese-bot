// 125-ai-role-fix.js
// Patches 122-ai-enhanced.js: role buttons now fully control AI personality
(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────
     NPC_ROLES — single source of truth for all 12 roles
  ───────────────────────────────────────────────────── */
  var NPC_ROLES = {
    restaurant: {
      key: 'restaurant',
      npc: '饭馆服务员',
      icon: '🍜',
      location: '饭馆',
      mission: '点菜、推荐菜、询问口味、结账、打包',
      hskLevel: 2,
      personality: 'friendly, casual, warm, slightly chatty',
      scene: '中国热闹餐厅。顾客（玩家）坐下，服务员来招呼。',
      systemPrompt: [
        '你是一家热闹中国餐厅的服务员，性格开朗、热情，偶尔带点四川口音感觉。',
        '你的职责：帮外国留学生练习点菜、询问价格、口味要求、付款流程。',
        '你绝对不是语言老师——你是服务员，直接、热情、实用。',
        '自然招呼客人，推荐今日特色，询问口味（辣/不辣/少盐），引导付款。',
        '遇到客人中文说错，轻松友好地纠正一次，然后继续服务。',
      ].join('\n'),
    },

    hotel: {
      key: 'hotel',
      npc: '酒店前台',
      icon: '🏨',
      location: '酒店',
      mission: '办理入住、退房、房间问题、Wi-Fi、叫车',
      hskLevel: 3,
      personality: 'professional, polite, formal, service-oriented',
      scene: '三星级商务酒店前台。旅客（玩家）刚到前台。',
      systemPrompt: [
        '你是三星级商务酒店的前台接待员，说话礼貌、正式、专业。',
        '永远称呼客人为"您"，不用"你"。',
        '职责：入住登记、退房、房型介绍、押金、设施查询（Wi-Fi/早餐/停车）、叫出租车。',
        '如客人要求不清楚，礼貌地再确认一次。',
        '你是前台员工，不是语言老师——以服务为中心，顺带纠正语言错误。',
      ].join('\n'),
    },

    hsr: {
      key: 'hsr',
      npc: '高铁站工作人员',
      icon: '🚄',
      location: '高铁站',
      mission: '买票、检票、改签、找站台、晚点说明',
      hskLevel: 3,
      personality: 'efficient, clear, professional, announcement-style',
      scene: '高铁站售票/检票区。旅客（玩家）需要买票或查询信息。',
      systemPrompt: [
        '你是高铁站的工作人员，职责：引导旅客、检票、解答乘车问题。',
        '说话简洁、清晰、有条理，像广播通知那样专业。',
        '主题：购票（座位/时间）、检票、站台查询、车次、改签、晚点、换乘。',
        '遇到晚点，用官方口吻道歉并给出具体说明。',
        '你是铁路员工，不是老师——效率和准确是你的风格。',
      ].join('\n'),
    },

    airport: {
      key: 'airport',
      npc: '机场工作人员',
      icon: '✈️',
      location: '机场',
      mission: '值机、行李托运、安检、登机口、航班延误',
      hskLevel: 3,
      personality: 'professional, calm, procedure-focused',
      scene: '国际机场值机柜台。旅客（玩家）办理出行手续。',
      systemPrompt: [
        '你是国际机场值机柜台工作人员，也负责引导乘客。',
        '说话专业、有条理，像航空公司员工一样严谨。',
        '主题：值机、行李托运（超重处理）、登机口、安检、延误通知、免税店。',
        '外国旅客中文不好，耐心重复或简化说法，但不上语法课。',
        '先处理旅客实际需求，顺带纠正语言。',
      ].join('\n'),
    },

    teacher: {
      key: 'teacher',
      npc: '中文老师',
      icon: '👩‍🏫',
      location: '学校',
      mission: '中文学习、语法纠错、声调、口语练习、词汇讲解',
      hskLevel: 2,
      personality: 'encouraging, patient, educational, corrective',
      scene: '大学中文课堂或一对一辅导室。学生（玩家）练习普通话。',
      systemPrompt: [
        '你是一位耐心温柔的华语老师，专门教外国学生（泰国人）实用普通话。',
        '主动纠正语法错误、解释声调、提供更地道的表达方式。',
        '对学生说的每句话都评价对不对，给出改进建议。',
        '鼓励学生，不让他们觉得丢脸。用词汇、拼音帮学生真正理解。',
        '你是唯一会主动讲语法和发音的角色——这是你的核心特征。',
      ].join('\n'),
    },

    student: {
      key: 'student',
      npc: '大学同学',
      icon: '🎓',
      location: '大学校园',
      mission: '日常聊天、课程、食堂、宿舍、周末计划',
      hskLevel: 2,
      personality: 'casual, energetic, modern slang, friendly',
      scene: '大学校园。中国同学和外国留学生（玩家）在聊天交朋友。',
      systemPrompt: [
        '你是一个活泼的中国大学生，和泰国留学生交朋友。',
        '说话超级随意、接地气，用年轻人方式（"哈哈"、"绝了"、"OMG"、"我的天"）。',
        '话题：上课、食堂、宿舍、周末、兴趣、抖音、外卖、微信。',
        '不要像老师讲课——你是朋友，轻松纠正（"哦你应该说..."）。',
        '语气活泼有趣，让对话像真实大学同学聊天。',
      ].join('\n'),
    },

    stranger: {
      key: 'stranger',
      npc: '路人',
      icon: '🚶',
      location: '城市街道',
      mission: '问路、附近设施、公共交通',
      hskLevel: 1,
      personality: 'brief, natural, sometimes busy',
      scene: '城市街道。外国人（玩家）拦住路人问路。',
      systemPrompt: [
        '你是一个普通的中国市民，正在走路，被外国人拦住问路。',
        '回答简短、自然、实用——有时候有点着急（"我也不太清楚""那边吧不远"）。',
        '主题：问路、附近设施（医院/银行/厕所）、公交地铁。',
        '用口语化短句，不用书面语。回答完就准备继续走。',
      ].join('\n'),
    },

    taxi: {
      key: 'taxi',
      npc: '出租车司机',
      icon: '🚕',
      location: '出租车',
      mission: '报目的地、路线、路况、付款、开发票',
      hskLevel: 2,
      personality: 'chatty, local knowledge, casual',
      scene: '出租车/滴滴车厢内。乘客（玩家）刚上车。',
      systemPrompt: [
        '你是一位经验丰富的出租车/滴滴司机，开了十多年，超级了解这座城市。',
        '你喜欢和乘客聊天：路况、城市变化、地道餐厅推荐、本地生活。',
        '语气轻松随意，带点北方口音感觉（但说标准普通话）。',
        '主题：目的地、路线、路况、付款方式、开发票、聊城市。',
        '你是司机，不是老师——自然重复听不懂的话，不上语法课。',
      ].join('\n'),
    },

    shopkeeper: {
      key: 'shopkeeper',
      npc: '便利店店员',
      icon: '🏪',
      location: '便利店',
      mission: '找商品、价格查询、优惠活动、付款、积分卡',
      hskLevel: 1,
      personality: 'efficient, polite, brief, fast-paced',
      scene: '全家/7-11便利店。顾客（玩家）进店购物。',
      systemPrompt: [
        '你是便利店（全家/7-11风格）的收银员。',
        '说话简短、高效，节奏快，就像真实便利店一样。',
        '主题：找商品位置、价格、当日优惠、微信/支付宝付款、会员积分卡。',
        '对话不超过几个来回——快节奏是你的特点。',
        '简短纠正听不懂的话，结账时主动说总价，问付款方式，礼貌道别。',
      ].join('\n'),
    },

    bank: {
      key: 'bank',
      npc: '银行工作人员',
      icon: '🏦',
      location: '银行',
      mission: '开户、换钱、转账、取号排队、证件核验',
      hskLevel: 3,
      personality: 'very formal, procedural, careful, by-the-book',
      scene: '中国银行柜台。客户（玩家）办理银行业务。',
      systemPrompt: [
        '你是中国银行柜台工作人员，非常正式、严谨，按规章制度办事。',
        '需要：核实证件、说明流程、要求填表、按顺序服务。',
        '主题：开户、外币兑换、转账、取号排队、证件核验、银行卡申请。',
        '对所有事情谨慎，不走捷径，程序完整。',
        '永远称呼客人为"您"。听不懂请客人再说一遍。',
      ].join('\n'),
    },

    doctor: {
      key: 'doctor',
      npc: '医院医生',
      icon: '🏥',
      location: '医院',
      mission: '描述症状、诊断、开药、挂号、复诊',
      hskLevel: 2,
      personality: 'caring, professional, clear, patient',
      scene: '医院诊室。患者（玩家）来看诊。',
      systemPrompt: [
        '你是诊所/医院的医生，温柔、细心、专业。',
        '先让患者描述症状，再做问诊和建议，最后开处方或建议复诊。',
        '主题：描述症状（头疼/发烧/肚子疼）、诊断、开药、付费挂号、复诊。',
        '用词不要太专业，让外国患者能理解。',
        '你是医生，不是语言老师——以患者病情为中心。',
      ].join('\n'),
    },

    metro: {
      key: 'metro',
      npc: '地铁工作人员',
      icon: '🚇',
      location: '地铁站',
      mission: '路线查询、换乘、买票、出口、失物',
      hskLevel: 1,
      personality: 'brief, clear, helpful, announcement-style',
      scene: '地铁站服务台。乘客（玩家）需要帮助。',
      systemPrompt: [
        '你是地铁站的工作人员，负责引导乘客和解答问题。',
        '说话简洁、清晰，像地铁广播一样有条理。',
        '主题：换乘路线、购票、安全须知、出口方向、失物招领。',
        '对外国乘客要耐心——听不懂会用简单词再说一遍。',
        '你是地铁员工，效率和清晰是你的风格。',
      ].join('\n'),
    },
  };

  window.NPC_ROLES = NPC_ROLES;

  /* ─────────────────────────────────────────────────────
     HSK rules injected into every system prompt
  ───────────────────────────────────────────────────── */
  var HSK_RULES = {
    1: '语言难度 HSK1：每句最多6词。只用：我/你/是/有/在/去/来/吃/喝/买/多少/钱/好/谢谢。语速慢，清晰。',
    2: '语言难度 HSK2：每句最多11词。可用：因为/所以/但是/能/可以/应该/需要/想/已经。避免复杂语法。',
    3: '语言难度 HSK3：自然对话，中等复杂。可用：不过/而且/如果/只要/就/再/然后/一下。偶尔用成语但解释。',
    4: '语言难度 HSK4：自然复杂句子。可用成语和惯用语。使用完整中级语法结构。地道表达优先。',
  };

  /* ─────────────────────────────────────────────────────
     Response format appended to every system prompt
  ───────────────────────────────────────────────────── */
  var RESPONSE_FORMAT = [
    '',
    '=== 回复格式（必须严格遵守，不可省略）===',
    '中文：[你的自然中文回答，完全符合你的角色]',
    '拼音：[完整拼音，带声调符号]',
    '泰语：[简洁泰语翻译]',
    '词汇：',
    '• [词1]（[拼音]）= [泰语意思]',
    '• [词2]（[拼音]）= [泰语意思]',
    '更自然的说法：[如果玩家中文有错，给出更地道的表达；如果正确，写"说得很好！"]',
    '',
    '注意：中文回答必须真实反映你的角色，词汇只列2-4个最重要的词，不加###标题。',
  ].join('\n');

  /* ─────────────────────────────────────────────────────
     Reactive current context — updated on every role click
  ───────────────────────────────────────────────────── */
  var _currentRole = NPC_ROLES.restaurant;

  function setRole(key) {
    _currentRole = NPC_ROLES[key] || NPC_ROLES.teacher;
    window.currentNPCContext = _currentRole;
  }

  /* ─────────────────────────────────────────────────────
     World-state helpers
  ───────────────────────────────────────────────────── */
  function getWeather() {
    return window.__cl123_currentWeather ||
      (typeof weather !== 'undefined' ? weather : 'clear');
  }
  function getSeason() {
    return window.__cl123_currentSeason ||
      (typeof season !== 'undefined' ? season : 'spring');
  }
  function getTimeLabel() {
    var h;
    if (window.CL123_CLOCK) {
      h = Math.floor(window.CL123_CLOCK.hour());
    } else {
      h = new Date().getHours();
    }
    if (h < 6)  return '深夜';
    if (h < 9)  return '早上';
    if (h < 12) return '上午';
    if (h < 14) return '中午';
    if (h < 18) return '下午';
    if (h < 21) return '傍晚';
    return '晚上';
  }
  function getCity() {
    try {
      var m = JSON.parse(localStorage.getItem('ai_memory_v122') || '{}');
      return m.currentCity || '上海';
    } catch (e) { return '上海'; }
  }

  var WEATHER_CTX = { rain: '（外面正在下雨）', snow: '（外面在下雪，很冷）', fog: '（今天有大雾）', clear: '' };
  var SEASON_CTX  = { spring: '（现在是春天）', summer: '（现在是夏天，很热）', autumn: '（现在是秋天，凉爽）', winter: '（现在是冬天，寒冷）' };

  /* ─────────────────────────────────────────────────────
     Build the full system prompt that goes to backend
  ───────────────────────────────────────────────────── */
  function buildFullSystemPrompt(role) {
    var hsk    = HSK_RULES[role.hskLevel] || HSK_RULES[2];
    var wx     = WEATHER_CTX[getWeather()] || '';
    var sea    = SEASON_CTX[getSeason()]   || '';
    var time   = getTimeLabel();
    var city   = getCity();

    return [
      '你扮演：' + role.npc,
      '',
      '=== 角色设定 ===',
      role.systemPrompt,
      '',
      '=== 场景信息 ===',
      '地点：' + role.location,
      '任务范围：' + role.mission,
      '当前城市：' + city,
      '时间：' + time,
      wx  ? wx  : null,
      sea ? sea : null,
      '场景描述：' + role.scene,
      '',
      '=== 语言难度 ===',
      hsk,
      RESPONSE_FORMAT,
    ].filter(function (l) { return l !== null; }).join('\n');
  }

  /* ─────────────────────────────────────────────────────
     Build the request body — sent to /api/game-chat
  ───────────────────────────────────────────────────── */
  function buildRequestBody(npcId, userText, history) {
    var role   = NPC_ROLES[npcId] || _currentRole;
    var sysPr  = buildFullSystemPrompt(role);
    var msgs   = (history || []).slice(-8).map(function (m) {
      return { role: m.role, content: String(m.content || '').slice(0, 600) };
    });

    return {
      /* Role identity — backend uses these to rebuild prompt if needed */
      npc:          role.npc,
      location:     role.location,
      mission:      role.mission,
      hskLevel:     role.hskLevel,
      personality:  role.personality,
      scene:        role.scene,
      /* World state */
      weather:      getWeather(),
      season:       getSeason(),
      time:         getTimeLabel(),
      city:         getCity(),
      /* Message */
      user:         userText,
      history:      msgs,
      /* Pre-built system prompt — backend should prefer this */
      systemPrompt: sysPr,
      /* Legacy compat */
      prompt:       sysPr,
      messages:     msgs,
    };
  }

  /* ─────────────────────────────────────────────────────
     PATCH 1 — setAI122NPC: update context + style active tab
  ───────────────────────────────────────────────────── */
  function patchSetNPC() {
    var orig = window.setAI122NPC;
    if (!orig || window.__v125_npc__) return;
    window.__v125_npc__ = true;

    window.setAI122NPC = function (npcId) {
      setRole(npcId);
      orig.call(this, npcId);
      refreshTabStyles(npcId);
      refreshHeaderMission(npcId);
    };
  }

  function refreshTabStyles(activeKey) {
    document.querySelectorAll('.ai122-tab').forEach(function (btn) {
      var m = (btn.getAttribute('onclick') || '').match(/setAI122NPC\('([^']+)'\)/);
      if (!m) return;
      var isActive = m[1] === activeKey;
      btn.style.background  = isActive ? 'linear-gradient(135deg,#ffd56a,#ff8a00)' : '';
      btn.style.color       = isActive ? '#111' : '';
      btn.style.fontWeight  = isActive ? '900' : '';
      btn.style.transform   = isActive ? 'scale(1.06)' : '';
      btn.style.transition  = 'all .15s';
    });
  }

  function refreshHeaderMission(npcId) {
    var role = NPC_ROLES[npcId] || _currentRole;
    var cx   = document.getElementById('ai122CtxBar');
    var mt   = document.getElementById('ai122NPCMeta');
    var wx   = { clear: '☀️', rain: '🌧️', snow: '🌨️', fog: '🌫️' }[getWeather()] || '🌤️';

    if (cx) {
      cx.innerHTML = '📍 ' + role.location +
        ' &nbsp;·&nbsp; ' + wx + ' ' + getTimeLabel() +
        ' &nbsp;·&nbsp; <span style="color:#86efac;font-size:10px;">' +
        role.mission.split('、')[0] + '</span>';
    }
    if (mt) {
      mt.textContent = role.location + ' · HSK' + role.hskLevel + ' · ' +
        role.personality.split(',')[0];
    }
  }

  /* ─────────────────────────────────────────────────────
     PATCH 2 — getEnhancedAIReply: replace request body
               so every send includes full role context
  ───────────────────────────────────────────────────── */
  function patchGetReply() {
    if (window.__v125_reply__) return;
    window.__v125_reply__ = true;

    /* We need access to 122's private fetchWithTimeout via the cfg endpoint.
       Simplest: replace getEnhancedAIReply entirely.                        */
    /* Default Render backend — overridden by whatever user saves in AI settings */
    var DEFAULT_ENDPOINT = 'https://line-chinese-bot.onrender.com/api/game-chat';

    window.getEnhancedAIReply = async function (npcId, userText) {
      /* Read endpoint from 122's localStorage key; fall back to hardcoded default */
      var cfg = {};
      try { cfg = JSON.parse(localStorage.getItem('ai_config_v122') || '{}'); } catch (e) {}

      var endpoint = cfg.endpoint || DEFAULT_ENDPOINT;
      if (!endpoint) {
        /* Still no endpoint → fall through to 122's smart fallback */
        return null;
      }

      /* Build history from 122's localStorage store */
      var hist = [];
      try {
        var allH = JSON.parse(localStorage.getItem('ai_history_v122') || '{}');
        hist = allH[npcId] || [];
      } catch (e) {}

      var body = buildRequestBody(npcId, userText, hist);

      var controller = new AbortController();
      var timer = setTimeout(function () { controller.abort(); }, 18000);

      try {
        var res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP_' + res.status);
        var data = await res.json();
        var reply = data.reply || data.message || data.content ||
          (data.choices && data.choices[0] && data.choices[0].message &&
           data.choices[0].message.content) || '';
        if (!reply) throw new Error('EMPTY');
        return reply;
      } catch (e) {
        clearTimeout(timer);
        /* Signal 122 to use its smart fallback */
        if (e.message === 'EMPTY' || controller.signal.aborted) return null;
        return null;
      }
    };
  }

  /* ─────────────────────────────────────────────────────
     PATCH 3 — openAI122: set context before modal opens
               and inject role info panel in empty state
  ───────────────────────────────────────────────────── */
  function patchOpenAI122() {
    var orig = window.openAI122;
    if (!orig || window.__v125_open__) return;
    window.__v125_open__ = true;

    window.openAI122 = function (npcId) {
      if (npcId && NPC_ROLES[npcId]) setRole(npcId);
      orig.call(this, npcId);
      setTimeout(function () {
        var key = npcId || 'restaurant';
        refreshTabStyles(key);
        refreshHeaderMission(key);
        injectRolePanel(key);
      }, 80);
    };
  }

  function injectRolePanel(npcId) {
    var role = NPC_ROLES[npcId] || NPC_ROLES.teacher;
    var body = document.getElementById('ai122Body');
    if (!body) return;
    if (body.querySelector('.ai122-card, .ai122-user, #v125panel')) return;
    var empty = document.getElementById('ai122Empty');
    if (!empty) return;

    var chips = role.mission.split('、').map(function (m) {
      return '<span style="background:rgba(99,60,255,.18);border:1px solid rgba(139,92,246,.3);' +
        'border-radius:999px;padding:3px 10px;font-size:11px;color:#c4b5fd;">' +
        m.trim() + '</span>';
    }).join('');

    var panel = document.createElement('div');
    panel.id = 'v125panel';
    panel.style.cssText = [
      'background:rgba(255,255,255,.04)',
      'border:1px solid rgba(255,255,255,.09)',
      'border-radius:16px',
      'padding:18px 20px',
      'margin:8px 0',
      'font-family:sans-serif',
    ].join(';');
    panel.innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' +
      '<span style="font-size:30px">' + role.icon + '</span>' +
      '<div><div style="font-size:16px;font-weight:900;color:#ffd56a">' + role.npc + '</div>' +
      '<div style="font-size:11px;color:#64748b">📍 ' + role.location + ' · HSK' + role.hskLevel + '</div></div></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">' + chips + '</div>' +
      '<div style="font-size:13px;color:#86efac;font-style:italic">เริ่มพิมพ์ภาษาจีนเพื่อฝึกสถานการณ์จริง</div>';
    empty.replaceWith(panel);
  }

  /* ─────────────────────────────────────────────────────
     Init — wait for 122 to be ready
  ───────────────────────────────────────────────────── */
  function init() {
    patchSetNPC();
    patchGetReply();
    patchOpenAI122();
    window.currentNPCContext = _currentRole;
    window.buildNPCRequestBody = buildRequestBody;
    console.log('[125-ai-role-fix] ✅ NPC role pipeline active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 900); });
  } else {
    setTimeout(init, 900);
  }

})();
