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

let streamTimer = null;
let currentStreamText = '';
let isStreaming = false;

const formatActions = {
    bold: { prefix: '**', suffix: '**', placeholder: '粗体文本' },
    italic: { prefix: '*', suffix: '*', placeholder: '斜体文本' },
    heading: { prefix: '## ', suffix: '', placeholder: '二级标题' },
    link: { prefix: '[', suffix: '](url)', placeholder: '链接文字' },
    code: { prefix: '`', suffix: '`', placeholder: '代码' },
    quote: { prefix: '> ', suffix: '', placeholder: '引用文本' },
    list: { prefix: '- ', suffix: '', placeholder: '列表项' },
    table: {
        prefix: '',
        suffix: '',
        text: '| 表头1 | 表头2 | 表头3 |\n| --- | --- | --- |\n| 内容1 | 内容2 | 内容3 |\n'
    },
    hr: { prefix: '---\n', suffix: '', placeholder: '' }
};

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
        preview.innerHTML = marked.parse(text, { breaks: true });
    } else {
        preview.textContent = text;
    }
}

function updateStatus(text) {
    wordCount.textContent = `字数: ${text.length}`;
    lineCount.textContent = `行数: ${text.split('\n').length}`;
}

function insertFormat(format) {
    const action = formatActions[format];
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = editor.value.substring(start, end);
    
    const scrollTop = editor.scrollTop;

    let insertText;
    if (action.text) {
        insertText = action.text;
    } else {
        insertText = action.prefix + (selectedText || action.placeholder) + action.suffix;
    }

    const newValue = editor.value.substring(0, start) + insertText + editor.value.substring(end);
    
    let newSelectionStart, newSelectionEnd;
    if (selectedText) {
        newSelectionStart = start + action.prefix.length;
        newSelectionEnd = start + action.prefix.length + selectedText.length;
    } else {
        newSelectionStart = start + action.prefix.length;
        newSelectionEnd = start + action.prefix.length + action.placeholder.length;
    }

    editor.value = newValue;
    
    editor.scrollTop = scrollTop;
    
    editor.focus();
    editor.setSelectionRange(newSelectionStart, newSelectionEnd);

    updatePreview();
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
