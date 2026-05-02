const editor = document.getElementById('markdown-editor');
const preview = document.getElementById('preview');
const uploadBtn = document.getElementById('upload-btn');
const downloadBtn = document.getElementById('download-btn');
const clearBtn = document.getElementById('clear-btn');
const streamDemoBtn = document.getElementById('stream-demo-btn');
const fileInput = document.getElementById('file-input');
const streamModeCheckbox = document.getElementById('stream-mode');
const wordCount = document.getElementById('word-count');
const lineCount = document.getElementById('line-count');
const formatBtns = document.querySelectorAll('.format-btn');

const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');

let streamTimer = null;
let currentStreamText = '';
let isStreaming = false;
let currentModalCallback = null;
let selectedHeadingLevel = 2;
let selectedLanguage = '';
let tableRows = 3;
let tableCols = 3;

const languages = [
    { value: '', label: '无语言（纯文本）' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
    { value: 'yaml', label: 'YAML' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'sql', label: 'SQL' },
    { value: 'bash', label: 'Bash/Shell' },
    { value: 'r', label: 'R' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'php', label: 'PHP' },
    { value: 'csharp', label: 'C#' }
];

const formatActions = {
    bold: { prefix: '**', suffix: '**', placeholder: '粗体文本', needsModal: false },
    italic: { prefix: '*', suffix: '*', placeholder: '斜体文本', needsModal: false },
    heading: { prefix: '## ', suffix: '', placeholder: '标题', needsModal: true, modalType: 'heading' },
    link: { prefix: '[', suffix: '](url)', placeholder: '链接文字', needsModal: false },
    code: { prefix: '`', suffix: '`', placeholder: '代码', needsModal: false },
    'code-block': { prefix: '```', suffix: '```', placeholder: '代码块内容', needsModal: true, modalType: 'code-block' },
    quote: { prefix: '> ', suffix: '', placeholder: '引用文本', needsModal: false },
    list: { prefix: '- ', suffix: '', placeholder: '列表项', needsModal: false },
    table: { prefix: '', suffix: '', text: '', needsModal: true, modalType: 'table' },
    hr: { prefix: '---\n', suffix: '', placeholder: '', needsModal: false }
};

if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true,
        highlight: function(code, lang) {
            if (typeof hljs !== 'undefined') {
                try {
                    if (lang && hljs.getLanguage(lang)) {
                        return hljs.highlight(code, { language: lang }).value;
                    }
                    return hljs.highlightAuto(code).value;
                } catch (e) {
                    return code;
                }
            }
            return code;
        }
    });
}

function updatePreview() {
    const text = editor.value;
    updateStatus(text);

    if (streamModeCheckbox.checked && isStreaming) {
        return;
    }

    renderMarkdown(text);
}

function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
        preview.innerHTML = marked.parse(text);
    } else {
        preview.textContent = text;
    }
}

function updateStatus(text) {
    wordCount.textContent = `字数: ${text.length}`;
    lineCount.textContent = `行数: ${text.split('\n').length}`;
}

function getPreviewContentElement() {
    return document.querySelector('.preview-content');
}

function insertFormat(format) {
    const action = formatActions[format];
    
    if (action.needsModal) {
        openModal(action.modalType, format);
        return;
    }

    insertSimpleFormat(format);
}

function insertSimpleFormat(format) {
    const action = formatActions[format];
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    
    const editorScrollTop = editor.scrollTop;
    const previewContent = getPreviewContentElement();
    const previewScrollTop = previewContent ? previewContent.scrollTop : 0;

    let insertText;
    if (action.text) {
        insertText = action.text;
    } else {
        insertText = action.prefix + (selectedText || action.placeholder) + action.suffix;
    }

    const newValue = editor.value.substring(0, start) + insertText + editor.value.substring(end);
    
    let newSelectionStart, newSelectionEnd;
    const insertLength = insertText.length;
    const prefixLength = action.prefix ? action.prefix.length : 0;
    const placeholderText = selectedText || action.placeholder || '';
    
    if (selectedText) {
        newSelectionStart = start + prefixLength;
        newSelectionEnd = start + prefixLength + selectedText.length;
    } else {
        newSelectionStart = start + prefixLength;
        newSelectionEnd = start + prefixLength + placeholderText.length;
    }

    editor.value = newValue;
    
    editor.scrollTop = editorScrollTop;
    
    editor.setSelectionRange(newSelectionStart, newSelectionEnd);
    
    renderMarkdownWithScrollRestore(editor.value, previewScrollTop);
    
    updateStatus(editor.value);
}

function renderMarkdownWithScrollRestore(text, savedScrollTop) {
    const previewContent = getPreviewContentElement();
    
    renderMarkdown(text);
    
    if (previewContent && savedScrollTop !== undefined) {
        requestAnimationFrame(() => {
            previewContent.scrollTop = savedScrollTop;
        });
    }
}

function openModal(type, format) {
    currentModalCallback = format;
    
    switch (type) {
        case 'heading':
            renderHeadingModal();
            break;
        case 'code-block':
            renderCodeBlockModal();
            break;
        case 'table':
            renderTableModal();
            break;
    }
    
    modalOverlay.classList.remove('hidden');
}

function closeModal() {
    modalOverlay.classList.add('hidden');
    currentModalCallback = null;
}

function renderHeadingModal() {
    modalTitle.textContent = '选择标题级别';
    
    let html = '<div class="heading-options">';
    for (let i = 1; i <= 6; i++) {
        const selectedClass = i === selectedHeadingLevel ? 'selected' : '';
        html += `
            <div class="heading-option ${selectedClass}" data-level="${i}">
                <h${i}>H${i}</h${i}>
                <div class="level-label">${'#'.repeat(i)} 标题</div>
            </div>
        `;
    }
    html += '</div>';
    
    modalBody.innerHTML = html;
    
    const options = modalBody.querySelectorAll('.heading-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            options.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedHeadingLevel = parseInt(option.dataset.level);
        });
    });
}

function renderCodeBlockModal() {
    modalTitle.textContent = '选择代码语言';
    
    let optionsHtml = languages.map(lang => 
        `<option value="${lang.value}" ${lang.value === selectedLanguage ? 'selected' : ''}>${lang.label}</option>`
    ).join('');
    
    modalBody.innerHTML = `
        <div class="language-select-wrapper">
            <label for="language-select">选择编程语言（用于语法高亮）</label>
            <select id="language-select">
                ${optionsHtml}
            </select>
        </div>
    `;
    
    const select = document.getElementById('language-select');
    select.addEventListener('change', (e) => {
        selectedLanguage = e.target.value;
    });
}

function renderTableModal() {
    modalTitle.textContent = '设置表格大小';
    
    modalBody.innerHTML = `
        <div class="table-size-form">
            <div class="form-group">
                <label for="table-rows">行数（包含表头）</label>
                <input type="number" id="table-rows" min="1" max="20" value="${tableRows}">
            </div>
            <div class="form-group">
                <label for="table-cols">列数</label>
                <input type="number" id="table-cols" min="1" max="10" value="${tableCols}">
            </div>
        </div>
    `;
    
    const rowsInput = document.getElementById('table-rows');
    const colsInput = document.getElementById('table-cols');
    
    rowsInput.addEventListener('change', (e) => {
        tableRows = Math.max(1, Math.min(20, parseInt(e.target.value) || 3));
    });
    
    colsInput.addEventListener('change', (e) => {
        tableCols = Math.max(1, Math.min(10, parseInt(e.target.value) || 3));
    });
}

function confirmModal() {
    const format = currentModalCallback;
    const action = formatActions[format];
    
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    
    const editorScrollTop = editor.scrollTop;
    const previewContent = getPreviewContentElement();
    const previewScrollTop = previewContent ? previewContent.scrollTop : 0;
    
    let insertText = '';
    let newSelectionStart, newSelectionEnd;
    
    switch (action.modalType) {
        case 'heading':
            const prefix = '#'.repeat(selectedHeadingLevel) + ' ';
            insertText = prefix + (selectedText || '标题');
            newSelectionStart = start + prefix.length;
            newSelectionEnd = start + prefix.length + (selectedText || '标题').length;
            break;
            
        case 'code-block':
            const langPrefix = selectedLanguage ? selectedLanguage + '\n' : '\n';
            if (selectedText) {
                insertText = '```' + langPrefix + selectedText + '\n```';
                newSelectionStart = start + 3 + langPrefix.length;
                newSelectionEnd = start + 3 + langPrefix.length + selectedText.length;
            } else {
                insertText = '```' + langPrefix + '// 在此输入代码\n```';
                newSelectionStart = start + 3 + langPrefix.length;
                newSelectionEnd = start + 3 + langPrefix.length + '// 在此输入代码'.length;
            }
            break;
            
        case 'table':
            insertText = generateTableMarkdown(tableRows, tableCols);
            newSelectionStart = start;
            newSelectionEnd = start + insertText.length;
            break;
    }
    
    const newValue = editor.value.substring(0, start) + insertText + editor.value.substring(end);
    
    editor.value = newValue;
    editor.scrollTop = editorScrollTop;
    editor.setSelectionRange(newSelectionStart, newSelectionEnd);
    
    renderMarkdownWithScrollRestore(editor.value, previewScrollTop);
    updateStatus(editor.value);
    
    closeModal();
}

function generateTableMarkdown(rows, cols) {
    let markdown = '';
    
    markdown += '|';
    for (let c = 0; c < cols; c++) {
        markdown += ` 表头${c + 1} |`;
    }
    markdown += '\n';
    
    markdown += '|';
    for (let c = 0; c < cols; c++) {
        markdown += ' --- |';
    }
    markdown += '\n';
    
    for (let r = 1; r < rows; r++) {
        markdown += '|';
        for (let c = 0; c < cols; c++) {
            markdown += ` 内容${r}-${c + 1} |`;
        }
        markdown += '\n';
    }
    
    return markdown;
}

function streamRender(text, speed = 20) {
    if (streamTimer) {
        clearInterval(streamTimer);
    }

    isStreaming = true;
    currentStreamText = '';
    let index = 0;

    preview.innerHTML = '';

    streamTimer = setInterval(() => {
        if (index < text.length) {
            const char = text[index];
            let charsToAdd = 1;

            if (char === '\n' && index + 1 < text.length && text[index + 1] === '\n') {
                charsToAdd = 2;
            }

            currentStreamText += text.substring(index, index + charsToAdd);
            index += charsToAdd;

            renderMarkdown(currentStreamText);
            preview.lastElementChild?.classList.add('streaming-content');

            const previewContent = getPreviewContentElement();
            if (previewContent) {
                previewContent.scrollTop = previewContent.scrollHeight;
            }
        } else {
            clearInterval(streamTimer);
            isStreaming = false;
            streamTimer = null;
        }
    }, speed);
}

function stopStreaming() {
    if (streamTimer) {
        clearInterval(streamTimer);
        streamTimer = null;
    }
    isStreaming = false;
}

function downloadFile() {
    const text = editor.value;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function clearEditor() {
    if (confirm('确定要清空内容吗？')) {
        stopStreaming();
        editor.value = '';
        preview.innerHTML = '';
        updateStatus('');
    }
}

function runStreamDemo() {
    stopStreaming();

    const demoContent = `# Markdown编辑器

## 欢迎使用Markdown编辑器！

这是一个功能丰富的Markdown编辑器，支持以下特性：

### 1. **实时预览**
- 编辑时实时渲染
- 支持Markdown语法高亮
- 响应式布局

### 2. **文件操作**
- **上传**: 支持 .md 和 .txt 文件
- **下载**: 导出为 .md 文件
- **清空**: 一键清空内容

### 3. **流式渲染**

> 就像AI回答一样，文字会逐字逐句地显示出来，给您带来流畅的阅读体验。

\`\`\`javascript
// 示例代码
function helloWorld() {
    console.log("Hello, Markdown!");
    return "流式渲染演示";
}
\`\`\`

### 4. 快捷格式工具栏

| 按钮 | 功能 | 示例 |
|------|------|------|
| 粗体 | 加粗文本 | **粗体** |
| 斜体 | 倾斜文本 | *斜体* |
| 标题 | 添加标题 | ## 标题 |
| 链接 | 插入链接 | [文字](url) |

---

## 使用说明

1. 在左侧编辑区输入Markdown内容
2. 右侧会实时显示预览效果
3. 点击工具栏按钮可以快速插入常用格式
4. 使用"流式演示"按钮可以体验逐字渲染效果

感谢使用！🎉`;

    if (streamModeCheckbox.checked) {
        editor.value = demoContent;
        updateStatus(demoContent);
        streamRender(demoContent, 15);
    } else {
        editor.value = demoContent;
        updatePreview();
    }
}

editor.addEventListener('input', () => {
    stopStreaming();
    updatePreview();
});

formatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const format = btn.dataset.format;
        insertFormat(format);
    });
});

uploadBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            stopStreaming();
            editor.value = event.target.result;
            updatePreview();
        };
        reader.readAsText(file);
    }
    fileInput.value = '';
});

downloadBtn.addEventListener('click', downloadFile);
clearBtn.addEventListener('click', clearEditor);
streamDemoBtn.addEventListener('click', runStreamDemo);

streamModeCheckbox.addEventListener('change', () => {
    if (!streamModeCheckbox.checked) {
        stopStreaming();
        if (currentStreamText) {
            renderMarkdown(editor.value);
        }
    }
});

modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
modalConfirm.addEventListener('click', confirmModal);

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) {
        closeModal();
    }
});

const defaultContent = `# 欢迎使用Markdown编辑器

这是一个功能强大的Markdown编辑器，支持**实时预览**、*文件上传下载*，以及类似AI回答的**流式渲染**效果。

## 功能介绍

### 编辑功能
- 支持标准Markdown语法
- 快捷格式工具栏
- 实时字数和行数统计
- 支持多级标题（H1-H6）
- 支持代码块语言选择和语法高亮
- 支持自定义行列数的表格插入

### 文件操作
1. 📁 **上传文档** - 支持 .md 和 .txt 文件
2. 💾 **下载文档** - 导出为 .md 文件
3. 🗑️ **清空** - 一键清空内容

### 语法高亮示例

\`\`\`javascript
// JavaScript 代码
function greet(name) {
    return \`Hello, \${name}!\`;
}

console.log(greet("World"));
\`\`\`

\`\`\`python
# Python 代码
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
\`\`\`

---

**开始编辑吧！试试工具栏的格式按钮，或者直接输入你的内容。`;

editor.value = defaultContent;
updatePreview();
