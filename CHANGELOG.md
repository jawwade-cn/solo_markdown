# Markdown编辑器 变更日志

## 版本 1.1.0 (2026-04-23)

### 问题修复与新功能

#### 1. 标题支持多级选择
**问题描述：** 标题按钮默认插入二级标题（##），用户无法选择其他级别。

**解决方案：**
- 点击"标题"按钮后弹出选择弹窗
- 支持 H1-H6 共6个级别的标题选择
- 默认选中 H2（保持原有行为的一致性）
- 选择后自动记住上次选择的级别

**代码变更位置：**
- `js/app.js:201-226` - `renderHeadingModal()` 函数
- `js/app.js:294-299` - 标题生成逻辑

#### 2. 代码块支持语言选择和语法高亮
**问题描述：** 
- 原来只有行内代码按钮，缺少代码块按钮
- 无法指定代码语言，无法实现语法高亮
- 不同语言的渲染无法支持语法高亮

**解决方案：**
- 新增"代码块"按钮（区别于"代码"行内代码按钮）
- 点击"代码块"按钮弹出语言选择弹窗
- 支持 21 种编程语言选择：
  - JavaScript, TypeScript, Python, Java, C++, Go, Rust
  - HTML, CSS, JSON, YAML, Markdown, SQL, Bash/Shell
  - R, Swift, Kotlin, PHP, C# 等
- 集成 highlight.js 实现语法高亮

**代码变更位置：**
- `index.html:8-18` - 引入 highlight.js 相关资源
- `js/app.js:29-50` - 编程语言列表定义
- `js/app.js:65-82` - marked 配置 highlight 回调
- `js/app.js:228-248` - `renderCodeBlockModal()` 函数
- `js/app.js:301-311` - 代码块生成逻辑
- `css/style.css:560-574` - 语法高亮样式适配

#### 3. 表格功能修复与自定义行列数
**问题描述：**
- 表格按钮点击后无反应（隐藏Bug）
- 只能插入固定的3行3列表格，无法自定义大小

**根本原因分析：**
在 `insertFormat` 函数中，计算选区范围时：
```javascript
// 原代码（有bug）
let newSelectionStart, newSelectionEnd;
if (selectedText) {
    newSelectionStart = start + action.prefix.length;
    newSelectionEnd = start + action.prefix.length + selectedText.length;
} else {
    newSelectionStart = start + action.prefix.length;
    newSelectionEnd = start + action.prefix.length + action.placeholder.length;  // 这里！
}
```

而 `formatActions.table` 的定义是：
```javascript
table: {
    prefix: '',
    suffix: '',
    text: '...',
    // 缺少 placeholder 属性！
}
```

当用户没有选中文本时，`action.placeholder` 是 `undefined`，调用 `.length` 会导致 `newSelectionEnd = NaN`，后续的 `editor.setSelectionRange(newSelectionStart, newSelectionEnd)` 执行失败，导致表格插入异常。

**解决方案：**
- 修复 `formatActions` 配置，确保所有需要的属性都存在
- 新增 `generateTableMarkdown(rows, cols)` 函数，动态生成表格
- 点击"表格"按钮弹出大小设置弹窗
- 支持设置：
  - 行数：1-20行（包含表头）
  - 列数：1-10列
- 输入框有边界检查，防止无效值

**代码变更位置：**
- `js/app.js:52-63` - 修复 `formatActions` 配置
- `js/app.js:142-153` - 改进选区范围计算逻辑，增加空值保护
- `js/app.js:250-276` - `renderTableModal()` 函数
- `js/app.js:314-318` - 表格生成调用
- `js/app.js:333-357` - `generateTableMarkdown()` 函数

### 隐藏问题修复

#### 4. 流式渲染滚动容器问题修复
**问题描述：**
在 `streamRender` 函数中，滚动操作的目标元素错误：
```javascript
// 原代码（错误）
preview.scrollTop = preview.scrollHeight;
```

`#preview` 是内容容器，但实际滚动的是其父元素 `.preview-content`。

**解决方案：**
- 新增 `getPreviewContentElement()` 函数统一获取滚动容器
- 将所有 `preview.scrollTop` 改为操作 `.preview-content`

**代码变更位置：**
- `js/app.js:108-110` - 新增 `getPreviewContentElement()` 函数
- `js/app.js:385-388` - 修复 `streamRender` 中的滚动操作

#### 5. 选区范围计算逻辑增强
**问题描述：**
原代码在计算选区范围时存在潜在的空值问题：
- `action.prefix` 可能不存在
- `action.placeholder` 可能不存在

**解决方案：**
增加空值保护和变量预计算：
```javascript
const prefixLength = action.prefix ? action.prefix.length : 0;
const placeholderText = selectedText || action.placeholder || '';
```

**代码变更位置：**
- `js/app.js:142-153` - `insertSimpleFormat()` 函数中的改进

#### 6. 弹窗交互增强
**新增功能：**
- 点击遮罩层（modal-overlay）可关闭弹窗
- 按 ESC 键可关闭弹窗
- 弹窗支持多种类型：标题选择、语言选择、表格设置

**代码变更位置：**
- `js/app.js:535-545` - 弹窗事件绑定

### 文件结构变化

**修改的文件：**
- `index.html` - 新增弹窗结构、代码块按钮、highlight.js 引入
- `css/style.css` - 新增弹窗样式、代码高亮样式
- `js/app.js` - 大量功能增强和问题修复

**新增依赖：**
- highlight.js - 用于代码语法高亮
- 支持的语言：JavaScript, TypeScript, Python, Java, C++, Go, Rust, HTML, CSS 等

### 使用说明

#### 标题多级选择
1. 在编辑区选中文字或定位光标
2. 点击"标题"按钮
3. 在弹窗中选择 H1-H6 任意级别
4. 点击"确定"插入

#### 代码块与语法高亮
1. 在编辑区选中代码或定位光标
2. 点击"代码块"按钮
3. 在弹窗中选择编程语言（或选择"无语言"）
4. 点击"确定"插入
5. 预览区会自动根据选择的语言进行语法高亮

#### 自定义表格
1. 在编辑区定位光标
2. 点击"表格"按钮
3. 在弹窗中设置行数（1-20）和列数（1-10）
4. 点击"确定"插入
5. 表格会自动包含表头行和分隔线

### 后续优化建议

1. **快捷键支持**：为常用格式添加快捷键（Ctrl+B 粗体、Ctrl+I 斜体等）
2. **更多语言支持**：根据需要添加更多 highlight.js 语言包
3. **表格编辑**：支持在预览区直接编辑表格内容
4. **撤销/重做**：实现编辑历史记录功能
5. **自动保存**：定时保存到 localStorage
