
// ===== AI ENHANCED SYSTEM V122 =====
// Modular upgrade on top of existing 115-ai-chat-voice.js (V51)
// ✅ Smarter NPC personalities (12 types)
// ✅ HSK difficulty adaptation (1-4)
// ✅ Structured response format (中文 / 拼音 / Thai / 词汇 / 纠正)
// ✅ Conversation memory + context awareness
// ✅ Retry-safe backend with timeout
// ✅ Voice-input architecture (stub, ready for future build)
// ✅ Upgraded chat UI with parsed message cards
// ✅ Quick phrase suggestions per NPC

(function(){
  'use strict';

  const SAVE_MEM  = 'ai_memory_v122';
  const SAVE_HIST = 'ai_history_v122';
  const SAVE_CFG  = 'ai_config_v122';

  // ══════════════════════════════════════════════════════
  //  1. NPC PERSONALITY DEFINITIONS
  // ══════════════════════════════════════════════════════

  const NPC_DEF = {

    restaurant: {
      id:'restaurant', icon:'🍜', hskRange:[1,4],
      name:'饭馆服务员', nameTh:'พนักงานร้านอาหาร',
      traits:['friendly','casual','helpful','regional accent hints'],
      topics:['ordering food','prices','spice level','takeaway','payment','menu recommendations'],
      greeting:'欢迎光临！今天想吃点什么？',
      systemCore:`你是一家热闹中国饭馆的服务员。性格开朗、热情、有点四川口音。
你的工作是帮助外国留学生练习点菜、询问价格、口味要求和付款相关的中文对话。
不要让对话太正式。要自然、友好，偶尔可以推荐招牌菜。
如果顾客说错了中文，温柔纠正一次，然后继续对话。`
    },

    hotel: {
      id:'hotel', icon:'🏨', hskRange:[2,4],
      name:'酒店前台', nameTh:'พนักงานโรงแรม',
      traits:['professional','polite','formal','multilingual'],
      topics:['check-in','check-out','room types','deposit','WiFi','breakfast','taxi request'],
      greeting:'您好，欢迎入住！请问有预订吗？',
      systemCore:`你是一家三星级商务酒店的前台接待员。说话礼貌、正式、专业。
练习主题：入住登记、退房、房型介绍、押金、设施询问、叫出租车。
始终称呼客人为"您"，不用"你"。
遇到不清楚的要求，礼貌地再确认一次。`
    },

    hsr: {
      id:'hsr', icon:'🚄', hskRange:[2,4],
      name:'高铁站工作人员', nameTh:'เจ้าหน้าที่สถานีรถไฟความเร็วสูง',
      traits:['efficient','formal','clear announcements','brief'],
      topics:['ticket purchase','platform numbers','delays','transfers','seat types','ID check'],
      greeting:'您好！请问需要什么帮助？',
      systemCore:`你是高铁站的工作人员，职责是引导旅客、检票、解答乘车问题。
你说话简洁、清晰、有条理，像广播通知那样专业。
练习主题：购票、检票、站台、车次、改签、晚点、换乘。
遇到晚点情况要用官方口吻道歉并给出说明。`
    },

    airport: {
      id:'airport', icon:'✈️', hskRange:[2,4],
      name:'机场工作人员', nameTh:'เจ้าหน้าที่สนามบิน',
      traits:['professional','calm','multi-language aware','procedure-focused'],
      topics:['check-in','baggage','boarding gate','security','delays','duty-free','passport check'],
      greeting:'您好！请出示护照和机票。',
      systemCore:`你是国际机场的值机柜台工作人员，也负责引导乘客。
说话专业、有条理，像航空公司工作人员一样。
练习主题：值机、行李托运、登机口、安检、延误、免税店。
外国旅客有时中文不好，你会耐心重复或简化说法。`
    },

    teacher: {
      id:'teacher', icon:'👩‍🏫', hskRange:[1,4],
      name:'中文老师', nameTh:'ครูภาษาจีน',
      traits:['educational','patient','corrective','encouraging','structured'],
      topics:['grammar correction','pronunciation','tones','sentence patterns','vocabulary explanation'],
      greeting:'同学好！今天想学什么中文？',
      systemCore:`你是一位耐心、温柔的华语老师，专门教外国学生实用普通话。
你会主动纠正语法错误、解释声调、提供更地道的表达。
对每句学生说的话，都要评价说得对不对，并给出改进建议。
鼓励学生，不让他们觉得丢脸。用词汇、拼音解释让学生真正理解。`
    },

    student: {
      id:'student', icon:'🎓', hskRange:[1,3],
      name:'大学同学', nameTh:'เพื่อนร่วมมหาวิทยาลัย',
      traits:['casual','modern slang','friendly','energetic','uses WeChat/bilibili references'],
      topics:['classes','cafeteria','dormitory','WeChat','weekend plans','shared interests','local food'],
      greeting:'哎，你好！你也是留学生吗？',
      systemCore:`你是一个活泼的中国大学生，跟来自泰国的留学生交朋友。
说话超级随意、接地气，用年轻人的方式说话（可以偶尔说"哈哈"、"OMG"、"绝了"这种）。
话题：上课、食堂、宿舍、周末、兴趣、抖音、外卖。
如果留学生说错了，就轻松地说一下，不像老师那么正式。`
    },

    stranger: {
      id:'stranger', icon:'🚶', hskRange:[1,2],
      name:'路人', nameTh:'คนเดินผ่าน',
      traits:['brief','natural','sometimes busy','helpful if stopped'],
      topics:['directions','nearby places','public transport','basic city info'],
      greeting:'你好，有什么事吗？',
      systemCore:`你是一个普通的中国市民，正在路上走，被外国人拦住问路。
你的回答简短、自然、实用。有时候你会有点着急（可以说"我也不太清楚"或"那边吧"）。
练习主题：问路、附近设施、交通。
偶尔用口语化短句，不用书面语。`
    },

    taxi: {
      id:'taxi', icon:'🚕', hskRange:[1,3],
      name:'出租车司机', nameTh:'คนขับแท็กซี่/滴滴',
      traits:['chatty','local knowledge','casual','opinionated about traffic'],
      topics:['destination','route','traffic','city life','local recommendations','fare payment'],
      greeting:'师傅，去哪儿？',
      systemCore:`你是一位经验丰富的出租车（滴滴）司机，开了十多年了，超级了解这座城市。
你喜欢和乘客聊天：交通、城市变化、地道的餐厅、本地生活。
语气轻松随意，有时带点北方口音的感觉（但标准普通话）。
练习主题：报目的地、路线、路况、付款、聊城市生活。`
    },

    shopkeeper: {
      id:'shopkeeper', icon:'🏪', hskRange:[1,2],
      name:'便利店店员', nameTh:'พนักงานร้านสะดวกซื้อ',
      traits:['efficient','polite','brief','modern'],
      topics:['product location','prices','promotions','payment','membership card'],
      greeting:'您好！需要点什么？',
      systemCore:`你是便利店（类似全家或7-11）的收银员。
说话简短、高效，就像真正的便利店一样快。
练习主题：找商品、价格、优惠、微信/支付宝付款、积分卡。
对话不超过几个来回，就像真实便利店一样节奏快。`
    },

    bank: {
      id:'bank', icon:'🏦', hskRange:[3,4],
      name:'银行工作人员', nameTh:'พนักงานธนาคาร',
      traits:['very formal','procedural','careful with identification'],
      topics:['account opening','currency exchange','transfer','ID verification','queue number'],
      greeting:'您好，请出示您的证件。',
      systemCore:`你是中国银行柜台工作人员，非常正式、严谨。
你需要核实身份，说明流程，要求填写表格。
练习主题：开户、换汇、转账、取号排队、证件核验。
对所有事情都很谨慎，按规章制度办事，不走捷径。`
    },

    doctor: {
      id:'doctor', icon:'🏥', hskRange:[2,4],
      name:'医院医生', nameTh:'แพทย์โรงพยาบาล',
      traits:['caring','clear','professional','patient'],
      topics:['symptoms','medical history','prescription','payment','registration','follow-up'],
      greeting:'你好，哪里不舒服？',
      systemCore:`你是诊所或医院的医生，温柔、细心、专业。
先让患者描述症状，再做出建议。
练习主题：描述症状、诊断、开药、挂号、付款。
用词不要太专业，但要准确，让外国患者能够理解。`
    },

    metro: {
      id:'metro', icon:'🚇', hskRange:[1,3],
      name:'地铁工作人员', nameTh:'เจ้าหน้าที่รถไฟใต้ดิน',
      traits:['brief','clear','announcement style','helpful'],
      topics:['route finding','line transfers','ticket purchase','lost & found','station exits'],
      greeting:'您好，需要帮忙吗？',
      systemCore:`你是地铁站的工作人员，负责引导乘客和解答问题。
说话简洁、清晰，像地铁广播一样有条理。
练习主题：换乘路线、购票、出口、安全注意。
对外国乘客要有耐心，如果他们听不懂会重复一遍。`
    }
  };

  // ══════════════════════════════════════════════════════
  //  2. HSK ADAPTATION PROFILES
  // ══════════════════════════════════════════════════════

  const HSK_PROFILES = {
    hsk1: {
      label:'HSK1 初学者',
      instruction:`Student HSK level: HSK1 (very beginner, ~150 words).
Use ONLY very simple, short sentences. Maximum 5-8 words per sentence.
Avoid complex grammar. Use basic words only: 我,你,是,有,在,去,来,吃,喝,买,多少,钱,好,谢谢.
Speak slowly and clearly. Repeat key words.`,
      maxSentenceLen: 8
    },
    hsk2: {
      label:'HSK2 初级',
      instruction:`Student HSK level: HSK2 (~300 words).
Use simple, clear sentences. Up to 10-12 words. Basic sentence patterns.
Can use: 因为,所以,但是,虽然,还是,能,可以,应该,需要,想.
Avoid complex grammar structures or rare vocabulary.`,
      maxSentenceLen: 12
    },
    hsk3: {
      label:'HSK3 中级',
      instruction:`Student HSK level: HSK3 (~600 words).
Use natural conversational sentences. Moderate complexity.
Can use: 不过,而且,如果,只要,就,还,再,已经,然后,一下,一点.
Occasional idioms are okay if explained.`,
      maxSentenceLen: 18
    },
    hsk4: {
      label:'HSK4 中高级',
      instruction:`Student HSK level: HSK4 (~1200 words).
Use natural, somewhat complex sentences. Idiomatic expressions encouraged.
Can use full range of intermediate grammar. Regional expressions welcome.
Be natural — don't over-simplify.`,
      maxSentenceLen: 30
    }
  };

  // ══════════════════════════════════════════════════════
  //  3. QUICK PHRASES PER NPC
  // ══════════════════════════════════════════════════════

  const QUICK_PHRASES = {
    restaurant: ['我要点菜。','这个多少钱？','不要辣。','打包带走。','可以微信支付吗？','结账请。','推荐什么菜？','再来一杯水。'],
    hotel:      ['我要办理入住。','Wi-Fi密码是多少？','我要退房。','有早餐吗？','请帮我叫出租车。','我需要多一条毛巾。'],
    hsr:        ['我要买票去北京。','几点出发？','几点到站？','检票口在哪里？','列车晚点了吗？','我要改签。'],
    airport:    ['我要办理值机。','行李超重了。','登机口在哪里？','我的航班延误了。','请问安检在哪里？'],
    teacher:    ['请帮我纠正这句话。','这个词怎么发音？','声调怎么分辨？','用中文怎么说？','我想练习对话。'],
    student:    ['你好！你是哪个系的？','食堂在哪里？','今天有课吗？','我们一起学习吧！','周末有什么活动？'],
    stranger:   ['请问地铁站在哪里？','附近有银行吗？','厕所在哪里？','谢谢你！'],
    taxi:       ['去这个地址。','大概要多久？','请走高速。','请停在前面。','多少钱？','可以开发票吗？'],
    shopkeeper: ['请问在哪里？','这个多少钱？','有优惠吗？','我用支付宝付。','有会员卡吗？'],
    bank:       ['我想开户。','我要换钱。','我要转账。','请问需要什么证件？','怎么取号？'],
    doctor:     ['我头疼。','我发烧了。','我肚子疼。','需要吃什么药？','我要挂号。'],
    metro:      ['去天安门怎么走？','在哪里换乘？','这是几号出口？','地铁几点关？','怎么买票？']
  };

  // ══════════════════════════════════════════════════════
  //  4. MEMORY SYSTEM
  // ══════════════════════════════════════════════════════

  let mem = loadMem();

  function loadMem(){
    try{ return JSON.parse(localStorage.getItem(SAVE_MEM) || '{}'); }
    catch(e){ return {}; }
  }

  function saveMem(){
    try{ localStorage.setItem(SAVE_MEM, JSON.stringify(mem)); }
    catch(e){}
  }

  function getPlayerName(){
    if(mem.playerName) return mem.playerName;
    if(window.studentProfileV46){
      const p = window.studentProfileV46.get();
      if(p && p.name) { mem.playerName = p.name; saveMem(); return p.name; }
    }
    return '留学生';
  }

  function getPlayerHSK(){
    if(window.studentProfileV46){
      const p = window.studentProfileV46.get();
      if(!p) return 'hsk2';
      if(p.level >= 7) return 'hsk4';
      if(p.level >= 4) return 'hsk3';
      if(p.level >= 2) return 'hsk2';
      return 'hsk1';
    }
    return mem.hskLevel || 'hsk2';
  }

  function getCurrentLocation(){
    try{
      if(typeof player === 'undefined' || typeof buildings === 'undefined') return '城市';
      const px = player.x, py = player.y;
      for(const b of buildings){
        const bx = b.x||0, by = b.y||0, bw = b.w||100, bh = b.h||80;
        if(px >= bx-30 && px <= bx+bw+30 && py >= by-30 && py <= by+bh+30){
          return (b.cn||'建筑').replace(/ HSK.*/,'').trim();
        }
      }
    }catch(e){}
    return mem.lastLocation || '城市街道';
  }

  function getGameTime(){
    const h = new Date().getHours();
    if(h < 6)  return '深夜';
    if(h < 9)  return '早上';
    if(h < 12) return '上午';
    if(h < 14) return '中午';
    if(h < 18) return '下午';
    if(h < 21) return '傍晚';
    return '晚上';
  }

  function getRelationshipLevel(npcId){
    const rel = mem.relationships || {};
    return rel[npcId] || 0;
  }

  function incrementRelationship(npcId){
    if(!mem.relationships) mem.relationships = {};
    mem.relationships[npcId] = Math.min(5, (mem.relationships[npcId]||0) + 1);
    saveMem();
  }

  function buildContext(){
    const loc = getCurrentLocation();
    if(loc !== '城市街道') { mem.lastLocation = loc; saveMem(); }
    return {
      playerName : getPlayerName(),
      hskLevel   : getPlayerHSK(),
      location   : loc,
      season     : (typeof season  !== 'undefined') ? season  : (mem.season  || 'spring'),
      weather    : (typeof weather !== 'undefined') ? weather : (mem.weather || 'clear'),
      timeOfDay  : getGameTime(),
      city       : mem.currentCity || '上海'
    };
  }

  // ══════════════════════════════════════════════════════
  //  5. PROMPT BUILDER
  // ══════════════════════════════════════════════════════

  const SEASON_CONTEXT = {
    spring:'现在是春天，天气温暖，花朵盛开。',
    summer:'现在是夏天，天气炎热，阳光强烈。',
    autumn:'现在是秋天，天气凉爽，树叶变黄。',
    winter:'现在是冬天，天气寒冷，有时会下雪。'
  };
  const WEATHER_CONTEXT = {
    clear:'天气晴朗。',
    rain:'外面正在下雨。',
    snow:'外面在下雪，很冷。',
    fog:'今天雾很大，能见度低。'
  };
  const RELATIONSHIP_LINES = [
    '这是第一次见面。',
    '你们见过几次面，有点眼熟。',
    '你们认识了，比较熟悉。',
    '你们是朋友，很熟悉了。',
    '你们是好朋友，像老朋友一样。',
    '你们是非常好的朋友，无话不谈。'
  ];

  const RESPONSE_FORMAT_INSTRUCTION = `
必须严格用以下格式回复，不可以省略任何一部分：

中文：[你的自然中文回答，符合你的角色]
拼音：[完整拼音，有声调符号]
解释：[泰语翻译，简洁自然]
词汇：
• [关键词1] ([拼音1]) = [泰语意思]
• [关键词2] ([拼音2]) = [泰语意思]
纠正：[如果学生说的中文有语法或词汇错误，在这里纠正。如果没有错误，写"正确！说得很好。"]

注意：
- 中文回答要真实自然，符合这个角色的性格和场景
- 词汇只需列出本次回答中2-4个最重要的词
- 不要加###标题或多余的格式`;

  function buildSystemPrompt(npcId, ctx, relLevel){
    const npc = NPC_DEF[npcId] || NPC_DEF.teacher;
    const hsk = HSK_PROFILES[ctx.hskLevel] || HSK_PROFILES.hsk2;
    const rel = RELATIONSHIP_LINES[Math.min(relLevel, RELATIONSHIP_LINES.length-1)];
    const seaCtx = SEASON_CONTEXT[ctx.season] || '';
    const wxCtx  = WEATHER_CONTEXT[ctx.weather] || '';

    return `你扮演：${npc.name}（${npc.nameTh}）

=== 角色设定 ===
${npc.systemCore}

=== 场景信息 ===
地点：${ctx.location}
时间：${ctx.timeOfDay}
${seaCtx}${wxCtx}
玩家名字：${ctx.playerName}
${rel}

=== 语言难度 ===
${hsk.instruction}

=== 回复格式（必须严格遵守）===
${RESPONSE_FORMAT_INSTRUCTION}`;
  }

  // ══════════════════════════════════════════════════════
  //  6. AI BACKEND — FETCH WITH RETRY + TIMEOUT
  // ══════════════════════════════════════════════════════

  function loadCfg(){
    try{ return JSON.parse(localStorage.getItem(SAVE_CFG)||'{}'); }
    catch(e){ return {}; }
  }

  function saveCfg(c){
    try{ localStorage.setItem(SAVE_CFG, JSON.stringify(c)); }
    catch(e){}
  }

  async function fetchWithTimeout(url, body, timeoutMs=14000, attempt=0){
    const cfg = loadCfg();
    if(!cfg.endpoint) throw new Error('NO_ENDPOINT');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try{
      const res = await fetch(cfg.endpoint, {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify(body),
        signal  : controller.signal
      });
      clearTimeout(timer);
      if(!res.ok) throw new Error(`HTTP_${res.status}`);
      return await res.json();
    }catch(e){
      clearTimeout(timer);
      if(attempt < 2 && !controller.signal.aborted){
        await new Promise(r => setTimeout(r, 900 * (attempt+1)));
        return fetchWithTimeout(url, body, timeoutMs, attempt+1);
      }
      throw e;
    }
  }

  // Load history per NPC
  let allHistory = (()=>{
    try{ return JSON.parse(localStorage.getItem(SAVE_HIST)||'{}'); }
    catch(e){ return {}; }
  })();

  function getHistory(npcId){ return allHistory[npcId] || []; }

  function pushHistory(npcId, role, content){
    if(!allHistory[npcId]) allHistory[npcId] = [];
    allHistory[npcId].push({ role, content, at: Date.now() });
    // Trim to last 20 messages per NPC
    if(allHistory[npcId].length > 20) allHistory[npcId] = allHistory[npcId].slice(-20);
    try{ localStorage.setItem(SAVE_HIST, JSON.stringify(allHistory)); }catch(e){}
  }

  function clearHistory(npcId){ allHistory[npcId] = []; try{ localStorage.setItem(SAVE_HIST, JSON.stringify(allHistory)); }catch(e){} }

  async function getEnhancedAIReply(npcId, userText){
    const ctx   = buildContext();
    const rel   = getRelationshipLevel(npcId);
    const sysPr = buildSystemPrompt(npcId, ctx, rel);
    const hist  = getHistory(npcId).slice(-8);

    const body = {
      // Render backend format
      systemPrompt : sysPr,
      messages     : hist,
      user         : userText,
      // Legacy V51 compat fields
      npc     : (NPC_DEF[npcId]||NPC_DEF.teacher).name,
      prompt  : sysPr,
      history : hist.map(m=>({role:m.role, content:m.content}))
    };

    try{
      const data = await fetchWithTimeout(null, body);
      const reply = data.reply || data.message || data.content || data.choices?.[0]?.message?.content || '';
      if(!reply) throw new Error('EMPTY_REPLY');
      return reply;
    }catch(e){
      if(e.message === 'NO_ENDPOINT') return null; // signal: use fallback
      // Timeout / HTTP error → return graceful fallback
      return buildSmartFallback(npcId, userText, ctx);
    }
  }

  // ══════════════════════════════════════════════════════
  //  7. SMART FALLBACK (offline mode)
  // ══════════════════════════════════════════════════════

  const FALLBACK_DB = {
    restaurant: [
      {tr:/你好|您好|hello/i,  zh:'欢迎光临！今天想吃点什么？', py:'Huānyíng guānglín! Jīntiān xiǎng chī diǎn shénme?', th:'ยินดีต้อนรับ! วันนี้อยากทานอะไรครับ', vc:'欢迎(huānyíng)=ยินดีต้อนรับ, 光临(guānglín)=เสด็จมา'},
      {tr:/多少钱|价格|贵/,    zh:'这道菜二十五块，很实惠！', py:'Zhè dào cài èrshíwǔ kuài, hěn shíhuì!', th:'เมนูนี้ราคา 25 หยวน คุ้มมากครับ', vc:'多少钱(duōshao qián)=เท่าไหร่, 实惠(shíhuì)=คุ้มค่า'},
      {tr:/辣|不辣|口味/,      zh:'这道菜有点辣，您要辣的还是不辣的？', py:'Zhè dào cài yǒudiǎn là, nín yào là de háishi bù là de?', th:'เมนูนี้เผ็ดนิดหน่อย เอาเผ็ดหรือไม่เผ็ดครับ', vc:'辣(là)=เผ็ด, 口味(kǒuwèi)=รสชาติ'},
      {tr:/打包|外带/,         zh:'好的，给您打包。请稍等一下。', py:'Hǎo de, gěi nín dǎbāo. Qǐng shāo děng yíxià.', th:'ได้เลยครับ เดี๋ยวห่อให้ รอสักครู่นะครับ', vc:'打包(dǎbāo)=ห่อกลับ, 稍等(shāoděng)=รอสักครู่'},
      {tr:/结账|付款|买单/,    zh:'一共六十八块，可以扫码或现金。', py:'Yígòng liùshíbā kuài, kěyǐ sǎomǎ huò xiànjīn.', th:'รวมทั้งหมด 68 หยวน สแกนหรือเงินสดก็ได้ครับ', vc:'一共(yígòng)=รวมทั้งหมด, 扫码(sǎomǎ)=สแกน QR'}
    ],
    hotel: [
      {tr:/你好|入住|check/i,  zh:'您好，欢迎入住！请出示您的护照。', py:'Nínhǎo, huānyíng rùzhù! Qǐng chūshì nín de hùzhào.', th:'สวัสดีครับ ยินดีต้อนรับ กรุณาแสดงพาสปอร์ต', vc:'入住(rùzhù)=เช็คอิน, 护照(hùzhào)=พาสปอร์ต'},
      {tr:/退房|checkout/i,    zh:'请问您今天几点退房？', py:'Qǐngwèn nín jīntiān jǐ diǎn tuìfáng?', th:'ขอทราบว่าวันนี้จะเช็คเอาท์กี่โมงครับ', vc:'退房(tuìfáng)=เช็คเอาท์, 几点(jǐ diǎn)=กี่โมง'},
      {tr:/wifi|网络|密码/i,   zh:'Wi-Fi密码是ChinaHotel2024，全部小写。', py:'Wàng fèi mìmǎ shì ChinaHotel2024.', th:'รหัส Wi-Fi คือ ChinaHotel2024 พิมพ์ตัวเล็กทั้งหมดครับ', vc:'密码(mìmǎ)=รหัสผ่าน, 网络(wǎngluò)=เครือข่าย'}
    ],
    teacher: [
      {tr:/你好|您好|hello/i,  zh:'你好！很高兴见到你。今天想练习什么中文？', py:'Nǐ hǎo! Hěn gāoxìng jiàn dào nǐ. Jīntiān xiǎng liànxí shénme zhōngwén?', th:'สวัสดีครับ ยินดีที่ได้รู้จัก วันนี้อยากฝึกภาษาจีนแบบไหน', vc:'练习(liànxí)=ฝึก, 高兴(gāoxìng)=ดีใจ'},
      {tr:/怎么说|中文|怎么/,  zh:'很好的问题！这个用中文说是…', py:'Hěn hǎo de wèntí!', th:'คำถามดีมากเลยครับ ภาษาจีนพูดว่า...', vc:'问题(wèntí)=คำถาม'},
      {tr:/声调|拼音|发音/,    zh:'声调很重要！一声平，二声升，三声先降再升，四声降。', py:'Shēngdiào hěn zhòngyào!', th:'วรรณยุกต์สำคัญมากครับ! เสียงหนึ่งราบ สองขึ้น สามลงแล้วขึ้น สี่ลง', vc:'声调(shēngdiào)=วรรณยุกต์, 拼音(pīnyīn)=พินอิน'}
    ]
  };

  function buildSmartFallback(npcId, userText, ctx){
    const db = FALLBACK_DB[npcId];
    if(db){
      for(const entry of db){
        if(entry.tr && entry.tr.test(userText)){
          return formatFallbackEntry(entry);
        }
      }
      const idx = (userText.length + getHistory(npcId).length) % db.length;
      return formatFallbackEntry(db[idx]);
    }
    // Generic fallback
    return formatFallbackEntry({
      zh:`你说的是"${userText.slice(0,10)}"，我明白了。请继续说！`,
      py:'Nǐ shuō de... wǒ míngbái le. Qǐng jìxù shuō!',
      th:`ฉันเข้าใจสิ่งที่คุณพูดแล้ว กรุณาพูดต่อ`,
      vc:'明白(míngbái)=เข้าใจ, 继续(jìxù)=ต่อ'
    });
  }

  function formatFallbackEntry(e){
    return `中文：${e.zh}
拼音：${e.py}
解释：${e.th}
词汇：
• ${(e.vc||'').split(', ').join('\n• ')}
纠正：（离线模式 — 连接AI后获得个性化纠正）`;
  }

  // ══════════════════════════════════════════════════════
  //  8. RESPONSE PARSER
  // ══════════════════════════════════════════════════════

  function parseResponse(raw){
    const text = String(raw || '');
    // Lookahead covers every section header the backend can emit
    const STOP = '(?=\\n(?:中文|拼音|泰语|解释|Thai|词汇|更自然的说法|纠正)[：:：]|$)';
    const get = (keys) => {
      for(const k of keys){
        const m = text.match(new RegExp(k + '[：:：]\\s*([\\s\\S]+?)' + STOP, 'i'));
        if(m) return m[1].trim();
      }
      return '';
    };
    const zh    = get(['中文']);
    const py    = get(['拼音']);
    // Backend sends 泰语: — also accept 解释/Thai/ไทย for backward compat
    const th    = get(['泰语','解释','Thai','ไทย']);
    const vcRaw = get(['词汇','Vocab','词']);
    // Backend sends 更自然的说法: — also accept 纠正/Correction/纠错
    const cor   = get(['更自然的说法','纠正','Correction','纠错']);

    const vocab = (vcRaw || '').split('\n')
      .map(l => l.replace(/^[•·\-\*]\s*/,'').trim())
      .filter(l => l.length > 2);

    return { zh, py, th, vocab, cor, raw:text, structured: !!(zh||py) };
  }

  function escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function renderParsed(parsed, idx){
    if(!parsed.structured){
      return `<div class="ai122-raw">${escHtml(parsed.raw)}</div>`;
    }
    const cor = parsed.cor && !/正确|没有错/i.test(parsed.cor);
    return `
      <div class="ai122-card">
        ${parsed.zh ? `<div class="ai122-zh" onclick="window.speakMandarin&&speakMandarin('${parsed.zh.replace(/'/g,"\\'")}')">${escHtml(parsed.zh)} <span class="ai122-speak">🔊</span></div>` : ''}
        ${parsed.py ? `<div class="ai122-py">${escHtml(parsed.py)}</div>` : ''}
        ${parsed.th ? `<div class="ai122-th">${escHtml(parsed.th)}</div>` : ''}
        ${parsed.vocab.length ? `<div class="ai122-vocab">${parsed.vocab.map(v=>`<span class="ai122-vtag">${escHtml(v)}</span>`).join('')}</div>` : ''}
        ${cor ? `<div class="ai122-cor">✏️ ${escHtml(parsed.cor)}</div>` : ''}
      </div>`;
  }

  // ══════════════════════════════════════════════════════
  //  9. CHAT UI — FULL UPGRADE
  // ══════════════════════════════════════════════════════

  const CSS_ID = 'ai122-style';

  function injectCSS(){
    if(document.getElementById(CSS_ID)) return;
    const s = document.createElement('style');
    s.id = CSS_ID;
    s.textContent = `
      #ai122Modal {
        display:none; position:fixed; inset:0; z-index:58000;
        background:rgba(0,0,0,.82); align-items:center; justify-content:center;
        padding:12px; font-family:Microsoft YaHei,Arial,sans-serif;
      }
      #ai122Box {
        width:min(900px,98vw); height:min(820px,96vh);
        background:#060e1c; color:white;
        border:1.5px solid rgba(139,92,246,.50);
        border-radius:28px; display:flex; flex-direction:column;
        overflow:hidden; box-shadow:0 40px 120px rgba(0,0,0,.75);
      }
      #ai122Head {
        padding:16px 20px;
        background:linear-gradient(135deg,#3b1fa8 0%,#0f2952 100%);
        display:flex; align-items:center; gap:14px; flex-shrink:0;
      }
      #ai122NPCAvatar {
        width:54px; height:54px; border-radius:50%;
        background:rgba(255,255,255,.12); display:flex;
        align-items:center; justify-content:center;
        font-size:28px; flex-shrink:0;
        border:2px solid rgba(255,213,106,.35);
      }
      #ai122HeadInfo { flex:1; min-width:0; }
      #ai122NPCName  { font-size:20px; font-weight:900; color:#ffd56a; }
      #ai122NPCMeta  { font-size:12px; color:#94a3b8; margin-top:2px; }
      #ai122CtxBar   { font-size:11px; color:#60a5fa; margin-top:3px; }
      #ai122RelBar   { display:flex; gap:3px; margin-top:4px; }
      .ai122-star    { font-size:11px; }
      #ai122CloseBtn {
        width:36px; height:36px; border-radius:50%; background:#ef4444;
        border:none; color:white; font-size:20px; cursor:pointer;
        flex-shrink:0; display:flex; align-items:center; justify-content:center;
      }
      #ai122Tabs {
        padding:10px 16px; background:#09152a;
        border-bottom:1px solid rgba(255,255,255,.07);
        display:flex; gap:6px; flex-wrap:wrap; flex-shrink:0;
        overflow-x:auto;
      }
      .ai122-tab {
        border:none; border-radius:999px; padding:7px 11px;
        background:rgba(255,255,255,.08); color:#94a3b8;
        font-size:12px; font-weight:700; cursor:pointer;
        white-space:nowrap; transition:all .15s;
      }
      .ai122-tab.active { background:linear-gradient(135deg,#ffd56a,#ff8a00); color:#111; }
      #ai122Body {
        flex:1; overflow-y:auto; padding:16px 18px;
        background:radial-gradient(ellipse at 20% 0%,rgba(99,60,255,.07),transparent 50%),
                   linear-gradient(180deg,#060e1c,#030913);
      }
      #ai122Body::-webkit-scrollbar { width:4px; }
      #ai122Body::-webkit-scrollbar-track { background:transparent; }
      #ai122Body::-webkit-scrollbar-thumb { background:rgba(255,255,255,.12); border-radius:2px; }

      .ai122-msg     { max-width:85%; margin:10px 0; animation:ai122FadeIn .25s ease; }
      @keyframes ai122FadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
      .ai122-user    { margin-left:auto; }
      .ai122-bot     { margin-right:auto; }
      .ai122-user-bubble {
        background:linear-gradient(135deg,#2563eb,#1e40af);
        color:white; padding:12px 16px; border-radius:18px 18px 4px 18px;
        font-size:16px; line-height:1.6;
      }
      .ai122-card {
        background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10);
        border-radius:4px 18px 18px 18px; overflow:hidden;
      }
      .ai122-zh {
        padding:14px 16px 8px;
        font-size:22px; font-weight:800; line-height:1.5;
        color:#f8fafc; cursor:pointer; transition:color .15s;
      }
      .ai122-zh:hover { color:#ffd56a; }
      .ai122-speak { font-size:14px; opacity:.6; }
      .ai122-py   { padding:2px 16px 8px; font-size:14px; color:#a5b4fc; font-style:italic; }
      .ai122-th   { padding:4px 16px 10px; font-size:15px; color:#94a3b8; }
      .ai122-vocab{
        padding:8px 16px 10px; display:flex; flex-wrap:wrap; gap:6px;
        border-top:1px solid rgba(255,255,255,.06);
      }
      .ai122-vtag {
        background:rgba(99,60,255,.22); border:1px solid rgba(139,92,246,.3);
        border-radius:999px; padding:4px 10px; font-size:12px; color:#c4b5fd;
      }
      .ai122-cor {
        padding:8px 16px 12px; font-size:13px; color:#fbbf24;
        border-top:1px solid rgba(255,213,106,.12);
      }
      .ai122-raw {
        background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.10);
        border-radius:4px 18px 18px 18px;
        padding:14px 16px; font-size:16px; line-height:1.65;
        white-space:pre-wrap; color:#f1f5f9;
      }
      .ai122-thinking {
        display:flex; gap:5px; align-items:center;
        padding:12px 16px; color:#64748b; font-size:14px;
      }
      .ai122-dot {
        width:7px; height:7px; border-radius:50%;
        background:#6366f1; animation:ai122Bounce .9s ease infinite;
      }
      .ai122-dot:nth-child(2){ animation-delay:.15s; }
      .ai122-dot:nth-child(3){ animation-delay:.30s; }
      @keyframes ai122Bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      #ai122Empty {
        text-align:center; padding:60px 20px; color:#475569;
      }
      #ai122Empty .ai122-npc-big { font-size:72px; margin-bottom:14px; }
      #ai122Empty .ai122-npc-name{ font-size:24px; font-weight:900; color:#ffd56a; margin-bottom:6px; }
      #ai122InputArea {
        padding:12px 16px; background:#09152a;
        border-top:1px solid rgba(255,255,255,.07); flex-shrink:0;
      }
      #ai122InputRow { display:flex; gap:8px; margin-bottom:10px; }
      #ai122Input {
        flex:1; border:1.5px solid rgba(255,255,255,.14);
        border-radius:16px; padding:13px 16px;
        background:#0d1f38; color:white;
        font-size:16px; font-family:inherit; outline:none;
        transition:border-color .2s;
      }
      #ai122Input:focus { border-color:rgba(139,92,246,.6); }
      #ai122Input::placeholder { color:#475569; }
      #ai122SendBtn {
        border:none; border-radius:14px; padding:0 20px;
        background:linear-gradient(135deg,#ffd56a,#ff8a00);
        color:#111; font-size:17px; font-weight:900;
        cursor:pointer; transition:transform .12s, opacity .12s;
        white-space:nowrap;
      }
      #ai122SendBtn:active { transform:scale(.95); }
      #ai122SendBtn:disabled { opacity:.4; cursor:not-allowed; }
      #ai122MicBtn {
        width:46px; height:46px; border-radius:50%; flex-shrink:0;
        background:rgba(255,255,255,.08); border:1.5px solid rgba(255,255,255,.14);
        color:white; font-size:20px; cursor:pointer; display:flex;
        align-items:center; justify-content:center;
        transition:background .15s;
      }
      #ai122MicBtn:hover { background:rgba(139,92,246,.25); }
      #ai122MicBtn.listening { background:rgba(239,68,68,.3); border-color:#ef4444; animation:ai122Pulse .8s infinite; }
      @keyframes ai122Pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
      #ai122QuickRow {
        display:flex; gap:6px; flex-wrap:wrap;
      }
      .ai122-quick {
        border:1px solid rgba(255,255,255,.14); border-radius:999px;
        padding:6px 12px; background:rgba(255,255,255,.06);
        color:#cbd5e1; font-size:12px; cursor:pointer;
        transition:all .15s; white-space:nowrap;
      }
      .ai122-quick:hover { background:rgba(139,92,246,.25); border-color:#6366f1; color:white; }
      #ai122SettingsModal {
        display:none; position:fixed; inset:0; z-index:60000;
        background:rgba(0,0,0,.85); align-items:center; justify-content:center;
        padding:16px;
      }
      #ai122SettingsBox {
        width:min(480px,96vw); background:#07111f; border:1.5px solid rgba(139,92,246,.4);
        border-radius:24px; padding:28px; color:white;
        font-family:Microsoft YaHei,Arial,sans-serif;
        box-shadow:0 30px 80px rgba(0,0,0,.6);
      }
      .ai122-field label { display:block; font-size:13px; color:#94a3b8; margin-bottom:6px; font-weight:700; }
      .ai122-field input, .ai122-field select {
        width:100%; box-sizing:border-box; padding:12px 14px;
        background:#0d1f38; border:1.5px solid rgba(255,255,255,.14);
        border-radius:12px; color:white; font-size:15px;
        outline:none; font-family:inherit;
      }
      .ai122-field { margin-bottom:16px; }
      .ai122-save-btn {
        width:100%; padding:14px; border:none; border-radius:14px;
        background:linear-gradient(135deg,#ffd56a,#ff8a00);
        color:#111; font-size:17px; font-weight:900; cursor:pointer;
        margin-top:8px;
      }
      .ai122-status {
        font-size:12px; padding:8px 14px; border-radius:999px;
        display:inline-block; margin-bottom:14px;
      }
      .ai122-status.connected    { background:rgba(34,197,94,.15); color:#4ade80; border:1px solid rgba(34,197,94,.3); }
      .ai122-status.disconnected { background:rgba(239,68,68,.12); color:#f87171; border:1px solid rgba(239,68,68,.25); }
      @media(max-width:600px){
        #ai122Box { border-radius:20px; }
        .ai122-zh  { font-size:18px; }
        #ai122Tabs { padding:8px; }
        .ai122-tab { font-size:11px; padding:6px 9px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── State ──────────────────────────────────────────────
  let activeNPC = 'restaurant';
  let sending   = false;
  let micActive = false;

  // ── Build Modal ────────────────────────────────────────
  function buildModal(){
    if(document.getElementById('ai122Modal')) return;
    injectCSS();

    const wrap = document.createElement('div');
    wrap.id = 'ai122Modal';
    wrap.innerHTML = `
      <div id="ai122Box">
        <div id="ai122Head">
          <div id="ai122NPCAvatar">🍜</div>
          <div id="ai122HeadInfo">
            <div id="ai122NPCName">饭馆服务员</div>
            <div id="ai122NPCMeta">พนักงานร้านอาหาร · HSK1-4</div>
            <div id="ai122CtxBar">📍 — · ☀️ — · 🕐 —</div>
            <div id="ai122RelBar"></div>
          </div>
          <button id="ai122CloseBtn" onclick="window.closeAI122()">✕</button>
        </div>

        <div id="ai122Tabs"></div>

        <div id="ai122Body">
          <div id="ai122Empty">
            <div class="ai122-npc-big">🍜</div>
            <div class="ai122-npc-name">饭馆服务员</div>
            <div>เริ่มพิมพ์เพื่อฝึกภาษาจีนในสถานการณ์จริง</div>
          </div>
        </div>

        <div id="ai122InputArea">
          <div id="ai122InputRow">
            <input id="ai122Input" placeholder="พิมพ์ภาษาจีนหรือไทย… เช่น 我要点菜" autocomplete="off" />
            <button id="ai122MicBtn" title="🎤 Voice Input (coming soon)" onclick="window.AI122Voice.toggle()">🎤</button>
            <button id="ai122SendBtn" onclick="window.sendAI122()">发送</button>
          </div>
          <div id="ai122QuickRow"></div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    // Enter key
    document.getElementById('ai122Input').addEventListener('keydown', e=>{
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); window.sendAI122(); }
    });

    renderTabs();
    updateHeader();
    renderQuickPhrases();
  }

  function renderTabs(){
    const el = document.getElementById('ai122Tabs');
    if(!el) return;
    el.innerHTML = Object.entries(NPC_DEF).map(([id,n])=>`
      <button class="ai122-tab${id===activeNPC?' active':''}" onclick="window.setAI122NPC('${id}')">
        ${n.icon} ${n.name}
      </button>`).join('');
  }

  function updateHeader(){
    const npc = NPC_DEF[activeNPC] || NPC_DEF.teacher;
    const ctx = buildContext();
    const rel = getRelationshipLevel(activeNPC);
    const stars = '⭐'.repeat(rel) + '☆'.repeat(Math.max(0,5-rel));

    const av = document.getElementById('ai122NPCAvatar'); if(av) av.textContent = npc.icon;
    const nm = document.getElementById('ai122NPCName');   if(nm) nm.textContent = npc.name;
    const mt = document.getElementById('ai122NPCMeta');   if(mt) mt.textContent = `${npc.nameTh} · ${HSK_PROFILES[ctx.hskLevel]?.label||''}`;
    const cx = document.getElementById('ai122CtxBar');
    if(cx){
      const weatherIco = {clear:'☀️',rain:'🌧️',snow:'🌨️',fog:'🌫️'}[ctx.weather]||'🌍';
      cx.textContent = `📍 ${ctx.location} · ${weatherIco} · 🕐 ${ctx.timeOfDay}`;
    }
    const rb = document.getElementById('ai122RelBar');
    if(rb) rb.innerHTML = `<span style="font-size:11px;color:#64748b">关系：</span>${stars.split('').map(s=>`<span class="ai122-star">${s}</span>`).join('')}`;
  }

  function renderQuickPhrases(){
    const el = document.getElementById('ai122QuickRow');
    if(!el) return;
    const phrases = QUICK_PHRASES[activeNPC] || [];
    el.innerHTML = phrases.map(p=>
      `<button class="ai122-quick" onclick="window.quickAI122('${p.replace(/'/g,"\\'")}')">${p}</button>`
    ).join('') +
    `<button class="ai122-quick" onclick="window.openAI122Settings()">⚙️ 设置</button>
     <button class="ai122-quick" onclick="window.clearAI122History()">🗑️ 清空</button>`;
  }

  let renderedMessages = []; // { npcId, role, parsed }

  function renderBody(){
    const body = document.getElementById('ai122Body');
    if(!body) return;

    const msgs = renderedMessages.filter(m => m.npcId === activeNPC);

    if(!msgs.length){
      const npc = NPC_DEF[activeNPC]||NPC_DEF.teacher;
      body.innerHTML = `<div id="ai122Empty">
        <div class="ai122-npc-big">${npc.icon}</div>
        <div class="ai122-npc-name">${npc.name}</div>
        <div style="color:#64748b;margin-top:8px">${npc.greeting}</div>
        <div style="margin-top:12px;font-size:13px;color:#475569">เริ่มพิมพ์เพื่อฝึกสถานการณ์จริง</div>
      </div>`;
      return;
    }

    body.innerHTML = msgs.map((m,i)=>
      m.role === 'user'
        ? `<div class="ai122-msg ai122-user"><div class="ai122-user-bubble">${escHtml(m.text)}</div></div>`
        : `<div class="ai122-msg ai122-bot">${renderParsed(m.parsed||{raw:m.text,structured:false}, i)}</div>`
    ).join('');

    body.scrollTop = body.scrollHeight;
  }

  function addThinkingIndicator(){
    const body = document.getElementById('ai122Body');
    if(!body) return;
    const el = document.createElement('div');
    el.id = 'ai122Thinking';
    el.className = 'ai122-msg ai122-bot';
    el.innerHTML = `<div class="ai122-thinking">
      <div class="ai122-dot"></div><div class="ai122-dot"></div><div class="ai122-dot"></div>
      <span style="margin-left:4px">${(NPC_DEF[activeNPC]||NPC_DEF.teacher).name}กำลังตอบ…</span>
    </div>`;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  function removeThinkingIndicator(){
    const el = document.getElementById('ai122Thinking');
    if(el) el.remove();
  }

  // ══════════════════════════════════════════════════════
  //  10. PUBLIC API
  // ══════════════════════════════════════════════════════

  window.openAI122 = function(npcId){
    if(npcId && NPC_DEF[npcId]) activeNPC = npcId;
    buildModal();
    renderTabs();
    updateHeader();
    renderBody();
    renderQuickPhrases();
    document.getElementById('ai122Modal').style.display = 'flex';
    setTimeout(()=>{ const inp = document.getElementById('ai122Input'); if(inp) inp.focus(); }, 200);
  };

  window.closeAI122 = function(){
    const m = document.getElementById('ai122Modal');
    if(m) m.style.display = 'none';
  };

  window.setAI122NPC = function(npcId){
    if(!NPC_DEF[npcId]) return;
    activeNPC = npcId;
    renderTabs();
    updateHeader();
    renderBody();
    renderQuickPhrases();
  };

  window.quickAI122 = function(text){
    const inp = document.getElementById('ai122Input');
    if(inp){ inp.value = text; window.sendAI122(); }
  };

  window.sendAI122 = async function(){
    if(sending) return;
    const inp = document.getElementById('ai122Input');
    const btn = document.getElementById('ai122SendBtn');
    if(!inp) return;

    const text = inp.value.trim();
    if(!text) return;

    inp.value = '';
    sending = true;
    if(btn) btn.disabled = true;

    // Add user message
    renderedMessages.push({ npcId:activeNPC, role:'user', text });
    pushHistory(activeNPC, 'user', text);
    renderBody();
    addThinkingIndicator();

    // Play sound
    if(window.SFX && window.SFX.tap) SFX.tap();

    try{
      // Prefer window.getEnhancedAIReply so 125-ai-role-fix.js patch takes effect;
      // fall back to the local closure if 125 hasn't loaded yet.
      const _getReply = (typeof window.getEnhancedAIReply === 'function')
        ? window.getEnhancedAIReply
        : getEnhancedAIReply;
      let reply = await _getReply(activeNPC, text);

      if(reply === null){
        // No endpoint configured → use formatted fallback
        reply = buildSmartFallback(activeNPC, text, buildContext());
      }

      const parsed = parseResponse(reply);

      renderedMessages.push({ npcId:activeNPC, role:'assistant', text:reply, parsed });
      pushHistory(activeNPC, 'assistant', reply);

      removeThinkingIndicator();
      renderBody();

      incrementRelationship(activeNPC);
      updateHeader();

      // Award XP for conversation
      if(window.studentProfileV46 && window.studentProfileV46.addXP){
        window.studentProfileV46.addXP(8, '💬 AI对话练习');
      }

      // Speak the Chinese reply
      if(parsed.zh && window.speakMandarin){
        setTimeout(()=> window.speakMandarin(parsed.zh, 0.86, 1.05), 300);
      } else if(parsed.zh && window.voiceChineseV51){
        window.voiceChineseV51(parsed.zh);
      }

    }catch(e){
      removeThinkingIndicator();
      renderedMessages.push({
        npcId:activeNPC, role:'assistant',
        text:'抱歉，出错了。请再试一次。',
        parsed:{ structured:false, raw:'抱歉，出错了。请再试一次。' }
      });
      renderBody();
    }

    sending = false;
    if(btn) btn.disabled = false;
    const inp2 = document.getElementById('ai122Input');
    if(inp2) inp2.focus();
  };

  window.clearAI122History = function(){
    if(!confirm(`ล้างประวัติการสนทนากับ ${(NPC_DEF[activeNPC]||{}).name} ใช่ไหม?`)) return;
    clearHistory(activeNPC);
    renderedMessages = renderedMessages.filter(m => m.npcId !== activeNPC);
    renderBody();
  };

  // ══════════════════════════════════════════════════════
  //  11. SETTINGS PANEL
  // ══════════════════════════════════════════════════════

  window.openAI122Settings = function(){
    const cfg = loadCfg();
    let modal = document.getElementById('ai122SettingsModal');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'ai122SettingsModal';
      modal.innerHTML = `
        <div id="ai122SettingsBox">
          <div style="font-size:22px;font-weight:900;color:#ffd56a;margin-bottom:16px">⚙️ AI 设置</div>
          <div id="ai122ConnStatus"></div>
          <div class="ai122-field">
            <label>🌐 Backend Endpoint URL (Render)</label>
            <input id="ai122EndpointInput" placeholder="https://your-app.onrender.com/api/game-chat" />
          </div>
          <div class="ai122-field">
            <label>📊 Force HSK Level (override auto-detect)</label>
            <select id="ai122HskSelect">
              <option value="">Auto (ตามระดับตัวละคร)</option>
              <option value="hsk1">HSK1 — 初学者</option>
              <option value="hsk2">HSK2 — 初级</option>
              <option value="hsk3">HSK3 — 中级</option>
              <option value="hsk4">HSK4 — 中高级</option>
            </select>
          </div>
          <button class="ai122-save-btn" onclick="window.saveAI122Settings()">💾 บันทึก</button>
          <button onclick="document.getElementById('ai122SettingsModal').style.display='none'"
            style="margin-top:10px;width:100%;padding:12px;border:1.5px solid rgba(255,255,255,.15);
            border-radius:14px;background:transparent;color:#94a3b8;font-size:15px;cursor:pointer">
            ยกเลิก
          </button>
        </div>`;
      document.body.appendChild(modal);
    }

    // Fill values
    document.getElementById('ai122EndpointInput').value = cfg.endpoint || '';
    document.getElementById('ai122HskSelect').value     = cfg.forceHsk || '';

    const st = document.getElementById('ai122ConnStatus');
    if(cfg.endpoint){
      st.innerHTML = `<div class="ai122-status connected">✅ เชื่อมต่อ AI Backend แล้ว</div>`;
    } else {
      st.innerHTML = `<div class="ai122-status disconnected">🔴 ยังไม่ได้ตั้งค่า (ใช้ฐานข้อมูลออฟไลน์)</div>`;
    }

    modal.style.display = 'flex';
  };

  window.saveAI122Settings = function(){
    const endpoint = (document.getElementById('ai122EndpointInput')?.value||'').trim();
    const forceHsk = document.getElementById('ai122HskSelect')?.value || '';
    saveCfg({ endpoint, forceHsk });
    if(forceHsk) { mem.hskLevel = forceHsk; saveMem(); }
    document.getElementById('ai122SettingsModal').style.display = 'none';
    if(window.SFX && SFX.correct) SFX.correct();
    if(window.toast) toast(endpoint ? '✅ เชื่อมต่อ AI Backend แล้ว' : '💡 ใช้โหมดออฟไลน์');
  };

  // ══════════════════════════════════════════════════════
  //  12. VOICE INPUT ARCHITECTURE (stub — ready for build)
  // ══════════════════════════════════════════════════════

  window.AI122Voice = {
    supported: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
    active: false,
    recognition: null,
    lastScore: null,

    toggle(){
      if(!this.supported){
        if(window.toast) toast('🎤 เบราว์เซอร์นี้ยังไม่รองรับ Voice Input');
        else alert('🎤 Voice Input coming soon — เร็วๆนี้');
        return;
      }
      this.active ? this.stop() : this.start();
    },

    start(){
      if(this.active) return;
      this.active = true;
      const btn = document.getElementById('ai122MicBtn');
      if(btn) btn.classList.add('listening');

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SR();
      this.recognition.lang         = 'zh-CN';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (e) => {
        const spoken = e.results[0][0].transcript;
        const confidence = e.results[0][0].confidence;
        this.stop();

        const inp = document.getElementById('ai122Input');
        if(inp){ inp.value = spoken; }

        // Score pronunciation (basic confidence-based)
        this.lastScore = Math.round(confidence * 100);
        if(window.toast) toast(`🎤 "${spoken}" — 分数 ${this.lastScore}%`);

        // Award XP for speaking practice
        if(confidence > 0.7 && window.studentProfileV46?.addXP){
          window.studentProfileV46.addXP(12, '🎤 口语练习');
        }

        // Auto-send
        setTimeout(()=> window.sendAI122(), 400);
      };

      this.recognition.onerror = () => { this.stop(); if(window.toast) toast('🎤 ไม่ได้ยิน ลองอีกครั้ง'); };
      this.recognition.onend   = () => { this.stop(); };
      this.recognition.start();
    },

    stop(){
      this.active = false;
      const btn = document.getElementById('ai122MicBtn');
      if(btn) btn.classList.remove('listening');
      try{ if(this.recognition) this.recognition.stop(); }catch(e){}
    },

    // Future: Tone scoring API
    analyzeTones(spoken, expected){
      // TODO V123: Compare tone patterns, award precision XP
      return { score: 0, feedback: '' };
    }
  };

  // ══════════════════════════════════════════════════════
  //  13. PATCH & INTEGRATE WITH EXISTING SYSTEMS
  // ══════════════════════════════════════════════════════

  function patchPhoneApp(){
    const old = window.renderPhoneApp;
    if(typeof old !== 'function') return false;
    if(window.__AI122_PHONE_PATCHED__) return true;
    window.__AI122_PHONE_PATCHED__ = true;

    window.renderPhoneApp = function(app){
      if(app === 'ai'){ window.openAI122('teacher'); return; }
      return old.apply(this, arguments);
    };
    return true;
  }

  function patchNPCDialogue(){
    // Override openNpcDialogueV93 to offer AI chat
    const old = window.openNpcDialogueV93;
    if(typeof old !== 'function') return false;
    if(window.__AI122_NPC_PATCHED__) return true;
    window.__AI122_NPC_PATCHED__ = true;

    window.openNpcDialogueV93 = function(npc){
      old.call(this, npc);
      // Map NPC place to AI chat NPC type
      const place = String(npc?.place || '');
      const id =
        place.includes('饭馆')||place.includes('茶馆')||place.includes('餐') ? 'restaurant' :
        place.includes('酒店')  ? 'hotel'      :
        place.includes('高铁')  ? 'hsr'        :
        place.includes('机场')  ? 'airport'    :
        place.includes('地铁')  ? 'metro'      :
        place.includes('银行')  ? 'bank'       :
        place.includes('医院')||place.includes('药店') ? 'doctor' :
        place.includes('商场')||place.includes('便利') ? 'shopkeeper' :
        place.includes('学校')||place.includes('图书') ? 'teacher'   :
        place.includes('公司')  ? 'student'    : 'stranger';

      // Show AI chat button in dialogue box
      setTimeout(()=>{
        const scene = document.getElementById('npcDialogueSceneV93');
        if(!scene || scene.style.display === 'none') return;
        if(document.getElementById('ai122NpcChatBtn')) return;
        const btn = document.createElement('button');
        btn.id = 'ai122NpcChatBtn';
        btn.textContent = '🤖 ฝึกสนทนา AI';
        btn.style.cssText = `
          position:absolute; right:18px; top:16px;
          border:none; border-radius:12px; padding:10px 18px;
          background:linear-gradient(135deg,#ffd56a,#ff8a00);
          color:#111; font-weight:900; font-size:14px; cursor:pointer;
          box-shadow:0 4px 14px rgba(0,0,0,.3);
        `;
        btn.onclick = ()=>{
          window.closeNpcDialogueV93?.();
          window.openAI122(id);
        };
        scene.appendChild(btn);
      }, 200);
    };
    return true;
  }

  // Override old V51 openAIChatV51 to use new system
  function patchV51(){
    if(window.__AI122_V51_PATCHED__) return true;
    if(typeof window.openAIChatV51 !== 'function') return false;
    window.__AI122_V51_PATCHED__ = true;

    const npcMap = {
      restaurant:'restaurant', hotel:'hotel', hsr:'hsr',
      airport:'airport', teacher:'teacher'
    };

    window.openAIChatV51 = function(npcId){
      const mapped = npcMap[npcId] || 'teacher';
      window.openAI122(mapped);
    };
    return true;
  }

  // ── Boot ───────────────────────────────────────────────
  let bootDone = false;
  function boot(){
    if(bootDone) return;
    const a = patchPhoneApp();
    const b = patchNPCDialogue();
    const c = patchV51();
    if(a && b && c) bootDone = true;
  }

  setTimeout(boot, 900);
  setTimeout(boot, 2000);
  setTimeout(boot, 4000);

  // Save context to memory when season/weather changes
  function syncContext(){
    if(typeof season  !== 'undefined') mem.season  = season;
    if(typeof weather !== 'undefined') mem.weather = weather;
    if(window.studentProfileV46){
      const p = window.studentProfileV46.get();
      if(p?.name) mem.playerName = p.name;
    }
    saveMem();
  }
  setInterval(syncContext, 5000);

  console.log('[AI Enhanced V122] ✅ 12 NPC personalities · HSK1-4 · Structured responses · Voice ready');

})();
