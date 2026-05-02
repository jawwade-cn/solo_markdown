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
const formatBtns = document.querySelectorAll('.format-btn[data-format]');

const headingBtn = document.getElementById('heading-btn');
const headingMenu = document.getElementById('heading-menu');
const headingItems = document.querySelectorAll('.dropdown-item[data-heading]');

const codeBtn = document.getElementById('code-btn');
const codeMenu = document.getElementById('code-menu');
const codeItems = document.querySelectorAll('.dropdown-item[data-code]');

const tableBtn = document.getElementById('table-btn');
const modalOverlay = document.getElementById('modal-overlay');

const codeBlockModal = document.getElementById('code-block-modal');
const codeBlockClose = document.getElementById('code-block-close');
const codeBlockCancel = document.getElementById('code-block-cancel');
const codeBlockConfirm = document.getElementById('code-block-confirm');
const codeLanguage = document.getElementById('code-language');

const tableModal = document.getElementById('table-modal');
const tableClose = document.getElementById('table-close');
const tableCancel = document.getElementById('table-cancel');
const tableConfirm = document.getElementById('table-confirm');
const tableRows = document.getElementById('table-rows');
const tableCols = document.getElementById('table-cols');

let streamTimer = null;
let currentStreamText = '';
let isStreaming = false;
let currentDropdown = null;

const formatActions = {
    bold: { prefix: '**', suffix: '**', placeholder: '粗体文本' },
    italic: { prefix: '*', suffix: '*', placeholder: '斜体文本' },
    link: { prefix: '[', suffix: '](url)', placeholder: '链接文字' },
    quote: { prefix: '> ', suffix: '', placeholder: '引用文本' },
    list: { prefix: '- ', suffix: '', placeholder: '列表项' },
    hr: { prefix: '---\n', suffix: '', placeholder: '' }
};

if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true,
        highlight: function(code, lang) {
            if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
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
        
        if (typeof hljs !== 'undefined') {
            const codeBlocks = preview.querySelectorAll('pre code');
            codeBlocks.forEach((block) => {
                if (!block.classList.contains('hljs')) {
                    hljs.highlightElement(block);
                }
            });
        }
    } else {
        preview.textContent = text;
    }
}

function updateStatus(text) {
    wordCount.textContent = `字数: ${text.length}`;
    lineCount.textContent = `行数: ${text.split('\n').length}`;
}

let undoStack = [];
let redoStack = [];
let isUndoing = false;

function saveUndoState() {
    if (!isUndoing) {
        undoStack.push({
            value: editor.value,
            selectionStart: editor.selectionStart,
            selectionEnd: editor.selectionEnd
        });
        redoStack = [];
        if (undoStack.length > 50) {
            undoStack.shift();
        }
    }
}

function executeUndo() {
    if (undoStack.length > 0) {
        isUndoing = true;
        const currentState = {
            value: editor.value,
            selectionStart: editor.selectionStart,
            selectionEnd: editor.selectionEnd
        };
        const prevState = undoStack.pop();
        redoStack.push(currentState);
        
        editor.value = prevState.value;
        editor.setSelectionRange(prevState.selectionStart, prevState.selectionEnd);
        if (document.activeElement !== editor) {
            editor.focus({ preventScroll: true });
        }
        updatePreview();
        updateStatus(editor.value);
        isUndoing = false;
    }
}

function executeRedo() {
    if (redoStack.length > 0) {
        isUndoing = true;
        const currentState = {
            value: editor.value,
            selectionStart: editor.selectionStart,
            selectionEnd: editor.selectionEnd
        };
        const nextState = redoStack.pop();
        undoStack.push(currentState);
        
        editor.value = nextState.value;
        editor.setSelectionRange(nextState.selectionStart, nextState.selectionEnd);
        if (document.activeElement !== editor) {
            editor.focus({ preventScroll: true });
        }
        updatePreview();
        updateStatus(editor.value);
        isUndoing = false;
    }
}

function insertFormat(format, customPrefix = null, customSuffix = null, customPlaceholder = null) {
    const action = formatActions[format];
    if (!action && !customPrefix) return;

    const prefix = customPrefix !== null ? customPrefix : (action ? action.prefix : '');
    const suffix = customSuffix !== null ? customSuffix : (action ? action.suffix : '');
    const placeholder = customPlaceholder !== null ? customPlaceholder : (action ? action.placeholder : '');

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    
    saveUndoState();
    
    const editorScrollTop = editor.scrollTop;
    
    const previewContent = document.querySelector('.preview-content');
    const previewScrollTop = previewContent ? previewContent.scrollTop : 0;

    const insertText = prefix + (selectedText || placeholder) + suffix;

    const newValue = editor.value.substring(0, start) + insertText + editor.value.substring(end);
    
    let newSelectionStart, newSelectionEnd;
    if (selectedText) {
        newSelectionStart = start + prefix.length;
        newSelectionEnd = start + prefix.length + selectedText.length;
    } else {
        newSelectionStart = start + prefix.length;
        newSelectionEnd = start + prefix.length + placeholder.length;
    }

    editor.value = newValue;
    
    editor.setSelectionRange(newSelectionStart, newSelectionEnd);
    editor.scrollTop = editorScrollTop;
    
    if (document.activeElement !== editor) {
        editor.focus({ preventScroll: true });
    }
    
    renderMarkdownWithScrollRestore(editor.value, previewScrollTop);
    
    updateStatus(editor.value);
}

function insertTextAtCursor(text, selectStart = 0, selectEnd = null) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    
    saveUndoState();
    
    const editorScrollTop = editor.scrollTop;
    const previewContent = document.querySelector('.preview-content');
    const previewScrollTop = previewContent ? previewContent.scrollTop : 0;

    const newValue = editor.value.substring(0, start) + text + editor.value.substring(end);
    
    const newSelectionStart = start + selectStart;
    const newSelectionEnd = start + (selectEnd !== null ? selectEnd : text.length);

    editor.value = newValue;
    editor.setSelectionRange(newSelectionStart, newSelectionEnd);
    editor.scrollTop = editorScrollTop;
    
    if (document.activeElement !== editor) {
        editor.focus({ preventScroll: true });
    }
    
    renderMarkdownWithScrollRestore(editor.value, previewScrollTop);
    updateStatus(editor.value);
}

const languageComments = {
    javascript: '//',
    python: '#',
    java: '//',
    html: '<!--',
    css: '/*',
    json: '//',
    sql: '--',
    bash: '#'
};

function getCommentPrefix(language) {
    return languageComments[language] || '//';
}

function insertHeading(level) {
    const prefix = '#'.repeat(level) + ' ';
    const placeholder = `H${level} 标题`;
    insertFormat('bold', prefix, '', placeholder);
    closeDropdown();
}

function insertInlineCode() {
    insertFormat('bold', '`', '`', '代码');
    closeDropdown();
}

function openCodeBlockModal() {
    closeDropdown();
    showModal(codeBlockModal);
}

function insertCodeBlock(language) {
    const langStr = language || '';
    let commentText = '';
    let commentEnd = '';
    
    const prefix = getCommentPrefix(language);
    if (language === 'html') {
        commentText = '<!-- 在此输入HTML -->';
        commentEnd = ' -->';
    } else if (language === 'css') {
        commentText = '/* 在此输入CSS */';
        commentEnd = ' */';
    } else {
        commentText = `${prefix} 在此输入代码`;
        commentEnd = '';
    }
    
    const codeBlock = `\`\`\`${langStr}\n${commentText}\n\`\`\`\n`;
    const selectStart = langStr.length + 4;
    const selectEnd = selectStart + commentText.length - commentEnd.length;
    insertTextAtCursor(codeBlock, selectStart, selectEnd);
}

function openTableModal() {
    showModal(tableModal);
}

function generateTable(rows, cols) {
    let table = '';
    
    for (let i = 0; i < cols; i++) {
        table += `| 表头${i + 1} `;
    }
    table += '|\n';
    
    for (let i = 0; i < cols; i++) {
        table += '| --- ';
    }
    table += '|\n';
    
    for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols; c++) {
            table += `| 内容${r + 1}-${c + 1} `;
        }
        table += '|\n';
    }
    
    return table;
}

function insertTable(rows, cols) {
    const table = generateTable(rows, cols);
    insertTextAtCursor(table, 0, 0);
}

function renderMarkdownWithScrollRestore(text, savedScrollTop) {
    const previewContent = document.querySelector('.preview-content');
    
    renderMarkdown(text);
    
    if (previewContent && savedScrollTop !== undefined) {
        requestAnimationFrame(() => {
            previewContent.scrollTop = savedScrollTop;
        });
    }
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

            preview.scrollTop = preview.scrollHeight;
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
        saveUndoState();
        editor.value = '';
        preview.innerHTML = '';
        updateStatus('');
    }
}

function runStreamDemo() {
    stopStreaming();
    saveUndoState();

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

function toggleDropdown(menu) {
    if (currentDropdown === menu) {
        closeDropdown();
    } else {
        closeDropdown();
        menu.classList.add('show');
        currentDropdown = menu;
    }
}

function closeDropdown() {
    if (currentDropdown) {
        currentDropdown.classList.remove('show');
        currentDropdown = null;
    }
}

function showModal(modal) {
    modalOverlay.classList.add('show');
    modal.classList.add('show');
}

function hideModal() {
    modalOverlay.classList.remove('show');
    codeBlockModal.classList.remove('show');
    tableModal.classList.remove('show');
}

editor.addEventListener('input', () => {
    stopStreaming();
    updatePreview();
});

editor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
            executeRedo();
        } else {
            executeUndo();
        }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        executeRedo();
    }
});

formatBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const format = btn.dataset.format;
        if (format && formatActions[format]) {
            insertFormat(format);
        }
    });
});

headingBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDropdown(headingMenu);
});

headingItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const level = parseInt(item.dataset.heading);
        insertHeading(level);
    });
});

codeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDropdown(codeMenu);
});

codeItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const codeType = item.dataset.code;
        if (codeType === 'inline') {
            insertInlineCode();
        } else if (codeType === 'block') {
            openCodeBlockModal();
        }
    });
});

tableBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openTableModal();
});

codeBlockClose.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideModal();
});
codeBlockCancel.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideModal();
});
codeBlockConfirm.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const language = codeLanguage.value;
    insertCodeBlock(language);
    hideModal();
});

tableClose.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideModal();
});
tableCancel.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideModal();
});
tableConfirm.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const rows = parseInt(tableRows.value) || 3;
    const cols = parseInt(tableCols.value) || 3;
    insertTable(rows, cols);
    hideModal();
});

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        hideModal();
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
        closeDropdown();
    }
});

uploadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            stopStreaming();
            saveUndoState();
            editor.value = event.target.result;
            updatePreview();
        };
        reader.readAsText(file);
    }
    fileInput.value = '';
});

downloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    downloadFile();
});
clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearEditor();
});
streamDemoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    runStreamDemo();
});

streamModeCheckbox.addEventListener('change', () => {
    if (!streamModeCheckbox.checked) {
        stopStreaming();
        if (currentStreamText) {
            renderMarkdown(editor.value);
        }
    }
});

const defaultContent = `# 欢迎使用Markdown编辑器

这是一个功能强大的Markdown编辑器，支持**实时预览**、*文件上传下载*，以及类似AI回答的**流式渲染**效果。

## 功能介绍

### 编辑功能
- 支持标准Markdown语法
- 快捷格式工具栏
- 实时字数和行数统计

### 文件操作
1. 📁 **上传文档** - 支持 .md 和 .txt 文件
2. 💾 **下载文档** - 导出为 .md 文件
3. 🗑️ **清空** - 一键清空内容

### 流式渲染
> 点击"流式演示"按钮，可以体验文字逐字逐句显示的效果，就像AI正在回答一样。

\`\`\`python
# 示例代码
def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
\`\`\`

---

**开始编辑吧！试试工具栏的格式按钮，或者直接输入你的内容。`;

editor.value = defaultContent;
updatePreview();