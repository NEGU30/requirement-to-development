# HTML 生成规范

> 本文件从 visual-companion/SKILL.md 拆分，包含 AI 生成 HTML 时的全部技术规范（离线自包含 / 内联 CSS / 内联 SVG / 文件结构模板 / tab 纪律 / 标注器代码 / 历史离线化）。
> 只在**方式一（sk流程AI生成）**时读取；**方式二（外部 HTML）**不读。

## 离线自包含（强制）

**观察环境多为离线环境，HTML 必须完全自包含——拔掉网络用浏览器打开，样式与图表必须完整显示。**

- ❌ 禁止：Tailwind CDN、Mermaid CDN、Google Fonts、图标字体 CDN、**JS 库 CDN**（Vue/React/jQuery 等）、**网络图片**（`<img src="https://">`、CSS `url(https://)`）、任何 `https://`/`http://` 外部引用
- ✅ 必须：所有 CSS 内联到 `<style>`、**所有 JS 内联到 `<script>`（原生 JS，不用任何框架库）**、字体用系统栈、**所有图表用内联 SVG 绘制**、所有图片用内联 SVG 或 data URI
- AI 自检（强制）：生成后扫一遍 HTML 源码，确认**无任何 `https://`/`http://` 引用**才算合格。若发现外部引用，**必须改为内联后才允许交付**，不允许带引用交付

## 样式：内联原生 CSS

不用 Tailwind CDN。AI 直接在 `<style>` 内写本次实际用到的原生 CSS，用 CSS 变量统一配色：

```css
:root {
  --c-bg: #f9fafb;          /* 页面底色 */
  --c-surface: #ffffff;      /* 卡片面 */
  --c-border: #e5e7eb;       /* 边框 */
  --c-text: #1f2937;         /* 正文 */
  --c-text-sub: #6b7280;     /* 次要文字 */
  --c-primary: #3b82f6;      /* 主色 */
  --c-primary-bg: #eff6ff;   /* 主色底 */
  --c-success: #10b981;
  --c-warning: #f59e0b;
  --c-danger: #ef4444;
}
```

## 图表：全部用内联 SVG（实测最优，单文件零依赖）

**经实测对比，所有图类（流程图/页面流转图等）都用内联 SVG 效果最好**——连线/曲线/分支/回退表达力强，单文件自包含，离线 100% 可靠。不用 Mermaid（运行时库 2.5MB 无法内联进单文件），不用 CSS 画图（复杂连线短板明显）。

> 以下 SVG 画法经验适用于本 skill 用 SVG 绘制的流程类维度（业务流程图/用户操作流程图/页面流转图；UI 线框图用 HTML+CSS 不在此列）。若需为历史技术向 HTML（架构图/数据流图）做离线化兜底，这些画法同样适用，但**新生成的可视化不画技术向图**（移交技术方案阶段）。

**SVG 图表核心套路**：

- **箭头复用**：`<defs><marker>` 定义一次，所有 `<line marker-end>` 复用
- **节点**：`<rect rx>`（圆角框）/ `<polygon>`（菱形判断）/ `<ellipse>`，配 `<text>`
- **连线**：`<line>`（直线）/ `<path d>`（折线、曲线、回退弧）
- **配色**：SVG 属性直接用 CSS 变量（`fill="var(--c-primary)"`），与页面一致

**各类图的 SVG 画法（产品向流程图为主）**：

| 图类型 | SVG 元素 | 要点 |
|--------|---------|------|
| 业务流程图 | `<rect>`/`<polygon>` + `<line>` + 泳道分列 | 多角色竖向分列，跨角色横线交接、同角色竖线；判断节点用 polygon |
| 用户操作流程图 | `<rect>`/`<polygon>` 菱形 + `<line>` + `<path>` 返程弧 | 判断节点用 polygon，分支线精确指向，用户视角状态用胶囊 |
| 页面流转图 | `<rect>` 页面节点 + `<line>` 跳转 + `<path>` 返回弧 | 正向跳转实线，返回路径虚线，返程入口重点标注 |
| （兜底）架构/数据流 | `<rect>` 分层 + `<line>` 依赖 | 仅用于历史技术向 HTML 离线化，新生成不画 |

**SVG 坐标技巧（减少手算）**：
- 用 `viewBox="0 0 宽 高"`，坐标在 viewBox 坐标系内，不用管像素
- 典型 viewBox 参考尺寸：流程图 `400×300`、页面流转图 `680×380`（按内容增减）
- 纵向流程：节点 y 等距递增（如 30/80/130...），好算
- 多列布局：节点中心 x 用百分比（如 3 列用 16.67%/50%/83.33%）
- 连线起止 = 节点边缘坐标，箭头用 `<marker>` 自动指向

## 字体：系统栈

```css
font-family: -apple-system, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif;
```

禁止 Google Fonts 等在线字体。

## 图标

用 Unicode 字符（✓ ✗ → ↓ ● ★）或内联 SVG，禁止图标字体 CDN。

## 文件结构模板（离线自包含版）

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[可视化主题] - [功能模块名]</title>
  <style>
    :root {
      --c-bg: #f9fafb; --c-surface: #ffffff; --c-border: #e5e7eb;
      --c-text: #1f2937; --c-text-sub: #6b7280;
      --c-primary: #3b82f6; --c-primary-bg: #eff6ff;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif;
      background: var(--c-bg); color: var(--c-text); margin: 0; padding: 2rem;
    }
    .container { max-width: 64rem; margin: 0 auto; }
    .title { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5rem; }
    .subtitle { color: var(--c-text-sub); font-size: 0.875rem; margin: 0 0 2rem; }
    /* ===== 修订记录区块（单文件原地更新模式下，版本演进记在这里）===== */
    .sk-changelog { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: .5rem; padding: .75rem 1rem; margin-bottom: 1.5rem; font-size: .8125rem; }
    .sk-changelog > summary { cursor: pointer; font-weight: 600; color: var(--c-text-sub); }
    .sk-changelog-table { width: 100%; border-collapse: collapse; margin-top: .5rem; }
    .sk-changelog-table th, .sk-changelog-table td { text-align: left; padding: .25rem .5rem; border-bottom: 1px solid var(--c-border); }
    .sk-changelog-table th { color: var(--c-text-sub); font-weight: 500; }
    .sk-changelog-table td:first-child { width: 3.5rem; color: var(--c-primary); font-weight: 600; }
    .sk-changelog-table td:nth-child(2) { width: 6rem; color: var(--c-text-sub); }
    .card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 0.5rem; padding: 1.25rem; margin-bottom: 1rem; }
    .tip { margin-top: 2rem; padding: 1rem; background: var(--c-primary-bg); border-radius: 0.5rem; font-size: 0.875rem; color: var(--c-primary); }
    /* 流程图等图表样式按需在此扩展 */
    /* 可交互元素：加 pointer 反馈，让用户知道能点 */
    [class*="btn"], [data-action] { cursor: pointer; transition: all .15s; }
    [class*="btn"]:hover { filter: brightness(.95); }
    /* ===== 多 tab 框架（防 bug 设计；多维度时用，单维度不用）===== */
    /* radio 移出视口但保留可选中（比 display:none 稳，键盘可访问）*/
    .sk-tab-radio { position: absolute; opacity: 0; pointer-events: none; }
    .sk-tab-nav { display: flex; gap: .25rem; border-bottom: 1px solid var(--c-border); margin-bottom: 1.5rem; }
    .sk-tab-label { padding: .5rem 1rem; cursor: pointer; border-bottom: 2px solid transparent; color: var(--c-text-sub); font-size: .9375rem; }
    .sk-tab-panel { display: none; }
    /* ⚠ id 精确映射：每个 radio :checked 只点亮/显示它对应的那一个 label/panel。
       禁止用通用选择器（.sk-tab-radio:checked ~ .sk-tab-panel 会把后面所有 panel 全显）。
       增删 tab 时下方映射必须同步增删对应行。*/
    #sk-tab-ui:checked   ~ .sk-tab-nav [for="sk-tab-ui"],
    #sk-tab-biz:checked  ~ .sk-tab-nav [for="sk-tab-biz"],
    #sk-tab-flow:checked ~ .sk-tab-nav [for="sk-tab-flow"],
    #sk-tab-nav:checked  ~ .sk-tab-nav [for="sk-tab-nav"] {
      color: var(--c-primary); border-bottom-color: var(--c-primary); font-weight: 600;
    }
    #sk-tab-ui:checked   ~ #sk-panel-ui,
    #sk-tab-biz:checked  ~ #sk-panel-biz,
    #sk-tab-flow:checked ~ #sk-panel-flow,
    #sk-tab-nav:checked  ~ #sk-panel-nav { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="title">[可视化主题]</h1>
    <p class="subtitle">验证目标：[本次可视化要确认的核心问题]</p>

    <!-- ═══════ 修订记录：单文件原地更新，版本演进记在此处（每次迭代追加一行，不另存新文件）═══════ -->
    <details class="sk-changelog" open>
      <summary>📝 修订记录</summary>
      <table class="sk-changelog-table">
        <tr><th>版本</th><th>日期</th><th>改动摘要</th></tr>
        <tr><td>v1.0</td><td>2026-07-14</td><td>初版：业务流程 + UI 线框 + 操作流程 + 页面流转</td></tr>
        <!-- 迭代时在此追加一行，如：<tr><td>v1.1</td><td>2026-07-14</td><td>事件卡片圆角调大、返回按钮移至右上</td></tr> -->
      </table>
    </details>

    <!-- ═══════ 多 tab 框架（多维度时用；单维度去掉整个 .tabs，直接放内容）═══════ -->
    <div class="tabs">
      <!-- ① radio：互为兄弟、放最前；name 固定 sk-tab；第一个必须 checked -->
      <input type="radio" name="sk-tab" id="sk-tab-ui" class="sk-tab-radio" checked>
      <input type="radio" name="sk-tab" id="sk-tab-biz" class="sk-tab-radio">
      <input type="radio" name="sk-tab" id="sk-tab-flow" class="sk-tab-radio">
      <input type="radio" name="sk-tab" id="sk-tab-nav" class="sk-tab-radio">

      <!-- ② 导航条：label[for] 与 radio[id] 一一对应 -->
      <nav class="sk-tab-nav">
        <label for="sk-tab-ui" class="sk-tab-label">界面演示</label>
        <label for="sk-tab-biz" class="sk-tab-label">业务流程</label>
        <label for="sk-tab-flow" class="sk-tab-label">操作流程</label>
        <label for="sk-tab-nav" class="sk-tab-label">页面流转</label>
      </nav>

      <!-- ③ 面板：id 与 radio 一一对应、顺序一致；每个面板顶部写明"验证什么"。
           ⚠ 面板内部若再用 :checked（弹窗/选中态），必须嵌套在面板内、name 不能是 sk-tab -->
      <section id="sk-panel-ui" class="sk-tab-panel">
        <h2>界面演示</h2>
        <p class="subtitle">验证：[本维度要确认的核心问题]</p>
        <!-- UI 线框：HTML+CSS 画，尽量可交互（:checked / :target / 少量内联 JS）-->
      </section>
      <section id="sk-panel-biz" class="sk-tab-panel">
        <h2>业务流程</h2>
        <p class="subtitle">验证：[业务从头到尾能否走通、闭环无断点]</p>
        <!-- 内联 SVG 业务流程/泳道图（多角色竖向分列）-->
      </section>
      <section id="sk-panel-flow" class="sk-tab-panel">
        <h2>操作流程</h2>
        <p class="subtitle">验证：[本维度要确认的核心问题]</p>
        <!-- 内联 SVG 流程图（rect/polygon/line/marker）-->
      </section>
      <section id="sk-panel-nav" class="sk-tab-panel">
        <h2>页面流转</h2>
        <p class="subtitle">验证：[本维度要确认的核心问题]</p>
        <!-- 内联 SVG 页面流转图（节点 + 跳转箭头 + 返回虚线）-->
      </section>
    </div>

    <div class="tip">请在对话中告诉我：是否认可此方案？各个 tab 都点一遍确认切换正常。如有修改意见请直接说明。</div>
  </div>

  <!-- ═══════ 内嵌标注器（强制）：生成时把下方「内嵌标注器」小节的 FAB 版代码粘贴到这个 <script> 标签里。
       用户打开页面后右下角出现 📐 浮动按钮，点开即可标注元素、导出 selector 清单。勿删。═══════ -->
  <script>
  /* 粘贴 selector 标注器·FAB 内嵌版代码（见本文件「内嵌标注器」小节） */
  </script>
</body>
</html>
```

## tab 使用纪律（防 bug）

多维度用 tab 时，以下纪律规避高频 bug（结构层堵死，照模板抄即可）：

| 纪律 | 防的 bug |
|---|---|
| radio 全部放最前、nav 其次、panel 最后，三者互为兄弟、顺序对应；panel 不嵌套进别的容器 | 结构依赖导致切换失效 |
| tab radio 统一 `name="sk-tab"`；panel 内部 :checked 必须**嵌套在 panel 里**、用别的 name | tab 与 panel 内交互互扰 |
| 第一个 radio 必须带 `checked` | 初始全空白 |
| CSS 用 `#sk-tab-x:checked ~ #sk-panel-x` 一对一映射，**禁用通用选择器** | 通用选择器导致所有 panel 全显 |
| 增删 tab 时 radio + label + panel + CSS 映射行 四处同步 | 漏删导致空 tab / 切了不亮 / 全显 |
| 用 `<label>` 当可点容器（绑 `for`）时必须设 `display: block` / `inline-block` | label 默认 inline，布局异常 |
| 绝对定位标注（负 top/bottom）要留够相邻间距，不够就内嵌 | 标注顶进相邻元素 |

> 后两条虽与 tab 无关（是 UI 线框图通用坑），但 tab 内的 UI 演示最容易同时踩到，故一并列入。

## 内嵌标注器（生成 HTML 时必带，强制）

为解决书签（bookmarklet）在 Edge 上常被安全策略拦截的问题，**生成的每个可视化 HTML 必须内嵌 selector 标注器**——打开即用、零安装、Edge/Chrome/Firefox 全通用。用户打开页面后，右下角出现 📐 浮动按钮，点开工具栏即可标注元素、导出 selector 清单。

**生成时的强制动作（务必执行，否则页面无标注器）**：文件结构模板里 `</body>` 前有一个**空的占位 `<script>`**（只有一句注释），必须把下方 FAB 版代码**粘贴进这个 `<script>` 内**替换占位注释——漏粘则生成的页面没有任何标注器。代码完全自包含，不依赖外部资源，符合离线自包含规范。**生成后自检**：在 HTML 源码里搜 `sk-fab`，搜得到才算内联成功。

**使用者操作流程**（策划视角，零安装）：
1. 用浏览器（推荐 Chrome）打开生成的可视化 HTML
2. 点右下角 **📐** 浮动按钮 → 展开顶部工具栏
3. 点「开启标注」→ 鼠标悬浮高亮目标元素 → 点击 → 在弹出框写改动描述 → 确认（可标多个）
4. 点「导出清单」→「复制」→ 粘贴给 AI，AI 按 selector 原地修改

生成的可视化 HTML 一律用下方的 FAB 版。

**FAB 版标注器代码**（直接拷贝内联到 `</body>` 前，勿改）：

```html
<script>
(function(){
  // selector 标注器 · 内嵌 FAB 版；防重复注入
  if(document.getElementById('sk-fab'))return;
  var s=document.createElement('style');
  s.textContent='#sk-fab{position:fixed;right:18px;bottom:18px;width:46px;height:46px;border-radius:50%;background:#2563eb;color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:999999;box-shadow:0 4px 14px rgba(37,99,235,.4);user-select:none;font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}#sk-fab:hover{background:#1d4ed8}#sk-fab .badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:#f59e0b;color:#fff;font-size:10px;font-weight:700;display:none;align-items:center;justify-content:center;padding:0 4px}#sk-fab .badge.on{display:flex}#sk-toolbar{position:fixed;top:0;left:0;right:0;height:48px;z-index:999999;background:#fff;border-bottom:1px solid #e2e8f0;display:none;align-items:center;gap:10px;padding:0 16px;box-shadow:0 1px 3px rgba(0,0,0,.1);font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}#sk-toolbar .t{font-weight:600;font-size:14px}#sk-toolbar button{padding:5px 12px;border:1px solid #e2e8f0;background:#fff;border-radius:5px;cursor:pointer;font-size:12px;color:#1e293b;font-family:inherit}#sk-toolbar button:hover{border-color:#2563eb;color:#2563eb}#sk-toolbar button.active{background:#f59e0b;color:#fff;border-color:#f59e0b}#sk-toolbar .c{margin-left:auto;color:#64748b;font-size:12px}#sk-toolbar .h{color:#94a3b8;font-size:11px}body.sk-ann *{cursor:crosshair!important}.sk-h{outline:2px solid #2563eb!important;outline-offset:2px;background:rgba(37,99,235,.08)!important}.sk-d{outline:2px dashed #f59e0b!important;outline-offset:2px}#sk-lb{position:fixed;z-index:1000000;pointer-events:none;background:#2563eb;color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;font-family:Consolas,monospace;display:none;max-width:400px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sk-bg{position:absolute;width:18px;height:18px;border-radius:50%;background:#f59e0b;color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;top:-9px;right:-9px;z-index:1000001;pointer-events:none}#sk-op{position:fixed;z-index:1000001;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px;width:300px;display:none;box-shadow:0 8px 24px rgba(0,0,0,.15);font-family:inherit}#sk-op .ot{font-size:11px;color:#64748b;margin-bottom:6px;word-break:break-all}#sk-op .os{font-size:10px;color:#94a3b8;font-family:Consolas,monospace;margin-bottom:6px;word-break:break-all;background:#f8fafc;padding:4px 6px;border-radius:3px}#sk-op textarea{width:100%;height:56px;border:1px solid #e2e8f0;border-radius:4px;padding:6px;font-size:12px;resize:none;font-family:inherit}#sk-op .ob{display:flex;gap:8px;margin-top:8px;justify-content:flex-end}#sk-op button{padding:4px 12px;border:1px solid #e2e8f0;background:#fff;border-radius:4px;cursor:pointer;font-size:11px;font-family:inherit}#sk-op button.ok{background:#2563eb;color:#fff;border-color:#2563eb}#sk-ex{position:fixed;bottom:16px;right:16px;width:420px;max-height:55vh;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;z-index:999998;display:none;box-shadow:0 8px 24px rgba(0,0,0,.12);overflow:auto;font-family:inherit}#sk-ex h3{font-size:13px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}#sk-ex h3 button{font-size:11px;padding:2px 8px;border:1px solid #e2e8f0;background:#fff;border-radius:4px;cursor:pointer;font-family:inherit}#sk-ex pre{background:#f8fafc;padding:10px;border-radius:4px;font-size:11px;white-space:pre-wrap;word-break:break-all;font-family:Consolas,monospace}';
  document.head.appendChild(s);
  // FAB：右下角浮动入口（默认显示，带已标数量角标）
  var fab=document.createElement('div');fab.id='sk-fab';fab.title='标注模式（点开工具栏）';fab.innerHTML='📐<span class="badge" id="sk-fb">0</span>';document.body.appendChild(fab);
  // 顶部工具栏（默认隐藏，点 FAB 展开）
  var tb=document.createElement('div');tb.id='sk-toolbar';tb.innerHTML='<span class="t">📐 标注（selector）</span><button id="sk-tg">开启标注</button><button id="sk-exb">导出清单</button><button id="sk-cl">清空</button><button id="sk-cls">收起</button><span class="h">悬浮高亮→点击→写改动</span><span class="c" id="sk-ct">已标 0</span>';
  document.body.appendChild(tb);
  var lb=document.createElement('div');lb.id='sk-lb';document.body.appendChild(lb);
  var op=document.createElement('div');op.id='sk-op';op.innerHTML='<div class="ot" id="sk-ot"></div><div class="os" id="sk-os"></div><textarea id="sk-oi" placeholder="改动描述，如：颜色改浅、文字改成XX、删掉…"></textarea><div class="ob"><button id="sk-oc">取消</button><button class="ok" id="sk-ok">确认</button></div>';
  document.body.appendChild(op);
  var ex=document.createElement('div');ex.id='sk-ex';ex.innerHTML='<h3>改动清单（复制贴给 AI）<button id="sk-cp">复制</button></h3><pre id="sk-ep"></pre>';
  document.body.appendChild(ex);
  var mode=false,hv=null,pe=null,ans=[],bg=0;
  var isT=function(e){return !e||e.closest('#sk-fab,#sk-toolbar,#sk-lb,#sk-op,#sk-ex,.sk-bg');};
  fab.onclick=function(){tb.style.display=(tb.style.display==='flex')?'none':'flex';};
  document.getElementById('sk-cls').onclick=function(){tb.style.display='none';};
  function updBadge(){var b=document.getElementById('sk-fb');if(ans.length>0){b.textContent=ans.length;b.classList.add('on');}else{b.classList.remove('on');}}
  function gSel(el){
    if(el.id)return '#'+el.id;
    var path=[],cur=el,depth=0;
    while(cur&&cur!==document.body&&depth<5){
      if(cur.id){path.unshift('#'+cur.id);break;}
      var seg=cur.tagName.toLowerCase();
      if(cur.className&&typeof cur.className==='string'){var cls=cur.className.trim().split(/\s+/).filter(function(c){return c&&c.indexOf('sk-')!==0;}).join('.');if(cls)seg+='.'+cls;}
      path.unshift(seg);
      var sel=path.join(' > ');
      var m;try{m=document.querySelectorAll(sel);}catch(e){m=[];}
      if(m.length===1&&m[0]===el)return sel;
      var par=cur.parentElement;
      if(par&&par.children.length>1){var idx=Array.prototype.indexOf.call(par.children,cur)+1;path[0]=seg+':nth-child('+idx+')';sel=path.join(' > ');try{m=document.querySelectorAll(sel);}catch(e){m=[];}if(m.length===1&&m[0]===el)return sel;}
      cur=par;depth++;
    }
    return path.join(' > ');
  }
  function gSig(el){
    var tag=el.tagName.toLowerCase();
    var cls=(el.className&&typeof el.className==='string'&&el.className.trim())?' class="'+el.className.trim().split(/\s+/).filter(function(c){return c.indexOf('sk-')!==0;}).slice(0,2).join(' ')+'"':'';
    var dt='';for(var i=0;i<el.childNodes.length;i++){if(el.childNodes[i].nodeType===3)dt+=el.childNodes[i].textContent;}
    dt=dt.trim();if(!dt)dt=(el.textContent||'').trim();
    return '<'+tag+cls+'>'+dt.slice(0,40)+'</'+tag+'>';
  }
  function cH(){if(hv){hv.classList.remove('sk-h');hv=null;}lb.style.display='none';}
  document.getElementById('sk-tg').onclick=function(){mode=!mode;this.textContent=mode?'关闭标注':'开启标注';this.classList.toggle('active',mode);document.body.classList.toggle('sk-ann',mode);if(!mode)cH();};
  document.addEventListener('mousemove',function(e){
    if(!mode||op.style.display==='block')return;
    var el=document.elementFromPoint(e.clientX,e.clientY);
    if(isT(el)||el===document.body){cH();return;}
    if(el!==hv){cH();el.classList.add('sk-h');hv=el;}
    var r=el.getBoundingClientRect();
    lb.innerHTML='&lt;'+el.tagName.toLowerCase()+'&gt; '+Math.round(r.width)+'x'+Math.round(r.height)+' | '+gSel(el);
    lb.style.display='block';
    lb.style.left=Math.min(e.clientX+14,window.innerWidth-400)+'px';
    lb.style.top=(e.clientY+14)+'px';
  });
  document.addEventListener('click',function(e){
    if(!mode)return;
    var el=document.elementFromPoint(e.clientX,e.clientY);
    if(isT(el)||el===document.body)return;
    e.preventDefault();e.stopPropagation();pe=el;
    document.getElementById('sk-os').textContent='selector: '+gSel(el);
    document.getElementById('sk-ot').textContent='元素：'+gSig(el);
    document.getElementById('sk-oi').value='';
    op.style.display='block';
    var r=el.getBoundingClientRect();
    var l=r.right+8,t=r.top;
    if(l+300>window.innerWidth)l=Math.max(8,r.left-310);
    if(t+160>window.innerHeight-10)t=window.innerHeight-170;
    op.style.left=l+'px';op.style.top=t+'px';
    document.getElementById('sk-oi').focus();
  },{capture:true});
  function cOp(){
    var ch=document.getElementById('sk-oi').value.trim();
    if(!ch||!pe){op.style.display='none';pe=null;return;}
    bg++;ans.push({i:bg,sel:gSel(pe),sig:gSig(pe),ch:ch});
    pe.classList.add('sk-d');
    if(getComputedStyle(pe).position==='static')pe.style.position='relative';
    var b=document.createElement('span');b.className='sk-bg';b.textContent=bg;pe.appendChild(b);
    op.style.display='none';pe=null;
    document.getElementById('sk-ct').textContent='已标 '+ans.length;
    updBadge();
  }
  document.getElementById('sk-ok').onclick=cOp;
  document.getElementById('sk-oi').addEventListener('keydown',function(e){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))cOp();});
  document.getElementById('sk-oc').onclick=function(){op.style.display='none';pe=null;};
  document.getElementById('sk-exb').onclick=function(){
    var pre=document.getElementById('sk-ep');
    if(!ans.length){pre.textContent='（还没有标注。开启标注，点元素写改动试试）';}
    else{pre.textContent=ans.map(function(a){return a.i+'. '+a.sel+' | '+a.sig+' | '+a.ch;}).join('\n');}
    ex.style.display='block';
  };
  document.getElementById('sk-cp').onclick=function(){
    navigator.clipboard.writeText(document.getElementById('sk-ep').textContent).then(function(){var b=document.getElementById('sk-cp');b.textContent='已复制';setTimeout(function(){b.textContent='复制';},1200);});
  };
  document.getElementById('sk-cl').onclick=function(){
    ans=[];bg=0;
    document.querySelectorAll('.sk-bg').forEach(function(b){b.remove();});
    document.querySelectorAll('.sk-d').forEach(function(e){e.classList.remove('sk-d');});
    ex.style.display='none';
    document.getElementById('sk-ct').textContent='已标 0';
    updBadge();
  };
})();
</script>
```

## 历史可视化 HTML 的离线化（可选兜底）

若历史 HTML 用了 Tailwind/Mermaid CDN，想离线化：
- Tailwind：`node .claude/skills/visual-companion/_gen_offline.js <input.html> [output.css]`（默认输出到 HTML 同目录 `<name>.offline.css`；`--stdout` 直接输出）扫描实际用到的 class 生成精简离线 CSS，再把内容内联进 HTML
- Mermaid：建议改为内联 SVG（按本规范重画图表）

但**新生成的 HTML 必须按上述规范直接自包含**（内联 CSS + 内联 SVG），不走后处理。

